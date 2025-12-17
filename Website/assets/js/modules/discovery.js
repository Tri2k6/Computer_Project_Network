import { CONFIG } from "./config.js";

export class GatewayDiscovery {
    constructor() {
        this.isDiscovering = false;
    }

    async discover(onFound, onProgress) {
        if (this.isDiscovering) {
            console.warn("[Discovery] Already discovering... skipping duplicate request");
            return false;
        }

        console.log("[Discovery] Starting discovery process...");
        this.isDiscovering = true;
        let found = false;
        
        if (onProgress) onProgress("Discovering Gateway via mDNS/Bonjour...");

        if (onProgress) onProgress("Trying mDNS/Bonjour: rat-gateway.local (HTTP/WS first, then HTTPS/WSS)...");
        const bonjourHost = 'rat-gateway.local';
        
        if (onProgress) onProgress("Testing mDNS resolution...");
        const canResolve = await this._testDNSResolution(bonjourHost);
        if (!canResolve) {
            if (onProgress) onProgress("⚠️ mDNS not resolving. Trying direct connection anyway...");
        } else {
            if (onProgress) onProgress("✓ mDNS resolved successfully!");
        }
        
        if (onProgress) onProgress(`Attempting connection to ws://${bonjourHost}:${CONFIG.SERVER_PORT + 2} (HTTP/WS)...`);
        const bonjourResult = await this._tryWebSocketConnection(bonjourHost, CONFIG.SERVER_PORT, 8000);
        if (bonjourResult) {
            console.log(`[Discovery] ✓ Gateway found via mDNS: ${bonjourHost}:${bonjourResult.port || CONFIG.SERVER_PORT}, calling onFound callback...`);
            if (onProgress) onProgress(`✓ Found Gateway via mDNS: ${bonjourHost}:${bonjourResult.port || CONFIG.SERVER_PORT}`);
            if (onFound) {
                console.log(`[Discovery] Calling onFound('${bonjourHost}', ${bonjourResult.port || CONFIG.SERVER_PORT})`);
                onFound(bonjourHost, bonjourResult.port || CONFIG.SERVER_PORT);
            }
            localStorage.setItem('gateway_ip', bonjourHost);
            this.isDiscovering = false;
            return true;
        } else {
            if (onProgress) onProgress(`✗ Connection failed to ${bonjourHost}`);
        }

        if (onProgress) onProgress("Gateway not found via mDNS.");
        if (onProgress) onProgress("Note: mDNS may not work when client and server are on the same machine.");
        if (onProgress) onProgress("Trying localhost as fallback...");
        
        const wsPort = CONFIG.SERVER_PORT + 2;
        if (onProgress) onProgress(`Trying localhost:${wsPort} (HTTP/WS)...`);
        const localhostResult = await this._tryWebSocketConnection('localhost', CONFIG.SERVER_PORT, 3000);
        if (localhostResult) {
            const foundPort = localhostResult.port || wsPort;
            console.log(`[Discovery] ✓ Gateway found on localhost:${foundPort}, calling onFound callback...`);
            if (onProgress) onProgress(`✓ Found Gateway on localhost: localhost:${foundPort}`);
            if (onFound) {
                console.log(`[Discovery] Calling onFound('localhost', ${foundPort})`);
                onFound('localhost', foundPort);
            }
            localStorage.setItem('gateway_ip', 'localhost');
            this.isDiscovering = false;
            return true;
        }
        
        if (onProgress) onProgress("Troubleshooting:");
        if (onProgress) onProgress("  1. mDNS typically doesn't work when client/server are on same machine");
        if (onProgress) onProgress("  2. Try from another device on the same network");
        if (onProgress) onProgress("  3. Or manually connect using: gateway.connect('localhost', 8082)");
        this.isDiscovering = false;
        return false;
    }

    _tryWebSocketConnection(ip, port, customTimeout = 300) {
        return new Promise((resolve) => {
            let mainResolved = false; // Renamed to avoid confusion
            const timeout = customTimeout;
            console.log(`[Discovery] Testing WebSocket connection to ${ip}:${port} (timeout: ${timeout}ms)`);
            
            const tryConnection = (protocol, url) => {
                return new Promise((innerResolve) => {
                    let connectionResolved = false; // Local flag for this connection attempt
                    const timeoutId = setTimeout(() => {
                        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
                            try {
                                ws.close();
                            } catch (e) {}
                        }
                        if (!connectionResolved) {
                            connectionResolved = true;
                            innerResolve(null);
                        }
                    }, timeout);

                    let ws = null;
                    let hasOpened = false;
                    
                    try {
                        ws = new WebSocket(url);
                        
                        ws.onopen = () => {
                            hasOpened = true;
                            if (!connectionResolved) {
                                clearTimeout(timeoutId);
                                connectionResolved = true;
                                console.log(`[Discovery] Test connection successful to ${url}, closing in 100ms...`);
                                // Note: We resolve with the actual port that was used for connection
                                // For WS, this will be port + 2 (8082), for WSS it will be the original port (8080)
                                const actualPort = protocol === 'ws' ? (port + 2) : port;
                                console.log(`[Discovery] Resolving with ip=${ip}, port=${actualPort} (protocol=${protocol})`);
                                setTimeout(() => {
                                    try {
                                        if (ws && ws.readyState === WebSocket.OPEN) {
                                            console.log(`[Discovery] Closing test connection to ${url}`);
                                            ws.close(1000, 'Discovery test complete'); // Normal closure with reason
                                        }
                                    } catch (e) {
                                        console.warn(`[Discovery] Error closing test connection:`, e);
                                    }
                                }, 100);
                                // Resolve immediately with the result
                                const result = { ip, port: actualPort };
                                console.log(`[Discovery] Inner resolving with:`, result);
                                innerResolve(result);
                            } else {
                                console.warn(`[Discovery] Connection opened but already resolved (duplicate?)`);
                            }
                        };
                        
                        ws.onerror = (event) => {
                            if (!hasOpened && !connectionResolved) {
                                clearTimeout(timeoutId);
                                connectionResolved = true;
                                if (ws) {
                                    try {
                                        ws.close();
                                    } catch (e) {}
                                }
                                innerResolve(null);
                            }
                        };
                        
                        ws.onclose = (event) => {
                            if (!hasOpened && !connectionResolved) {
                                clearTimeout(timeoutId);
                                connectionResolved = true;
                                if (event.code === 1006 && protocol === 'wss') {
                                    console.warn(`[Discovery] WSS connection failed (code: ${event.code}) for ${url}`);
                                    console.warn(`[Discovery] This usually means:`);
                                    console.warn(`  1. SSL certificate not accepted - Open https://${ip}:${port} in browser first`);
                                    console.warn(`  2. mDNS not resolving - Try: ping ${ip} in terminal`);
                                    console.warn(`  3. Gateway not accepting connections - Check Gateway logs`);
                                }
                                innerResolve(null);
                            }
                        };
                    } catch (error) {
                        clearTimeout(timeoutId);
                        innerResolve(null);
                    }
                });
            };

            (async () => {
                const wsPort = port + 2;
                const wsUrl = `ws://${ip}:${wsPort}`;
                console.log(`[Discovery] Trying WS connection: ${wsUrl}`);
                const insecureResult = await tryConnection('ws', wsUrl);
                console.log(`[Discovery] WS result:`, insecureResult, `mainResolved flag:`, mainResolved);
                if (insecureResult) {
                    if (!mainResolved) {
                        mainResolved = true;
                        console.log(`[Discovery] ✓ WS connection successful: ${wsUrl}, resolving with port ${insecureResult.port || wsPort}`);
                        resolve({ ip, port: insecureResult.port || wsPort });
                        return;
                    } else {
                        console.warn(`[Discovery] WS connection successful but already resolved (duplicate?)`);
                    }
                } else {
                    console.log(`[Discovery] WS connection failed or returned null`);
                }
                
                if (!mainResolved) {
                    const wssUrl = `wss://${ip}:${port}`;
                    console.log(`[Discovery] Trying WSS connection: ${wssUrl}`);
                    const secureResult = await tryConnection('wss', wssUrl);
                    console.log(`[Discovery] WSS result:`, secureResult);
                    if (secureResult && !mainResolved) {
                        mainResolved = true;
                        console.log(`[Discovery] ✓ WSS connection successful: ${wssUrl}, resolving with port ${secureResult.port || port}`);
                        resolve({ ip, port: secureResult.port || port });
                    } else if (!mainResolved) {
                        console.log(`[Discovery] ✗ Both WS and WSS connections failed`);
                        resolve(null);
                    }
                }
            })();
        });
    }

    async _testDNSResolution(hostname) {
        return new Promise((resolve) => {
            try {
                const img = new Image();
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
                img.src = `https://${hostname}:8080/favicon.ico?t=${Date.now()}`;
                setTimeout(() => resolve(false), 2000);
            } catch (error) {
                resolve(false);
            }
        });
    }

    stop() {
        this.isDiscovering = false;
    }
}
