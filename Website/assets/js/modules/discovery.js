import { CONFIG, loadDefaultGateways } from "./config.js";

export class GatewayDiscovery {
    constructor() {
        this.isDiscovering = false;
        this.defaultGateways = loadDefaultGateways();
    }

    async discover(onFound, onProgress) {
        if (this.isDiscovering) {
            console.warn("[Discovery] Already discovering... skipping duplicate request");
            return false;
        }

        console.log("[Discovery] Starting discovery process...");
        this.isDiscovering = true;
        
        if (onProgress) {
            onProgress("Trying default gateways...");
        }
        
        const defaultResult = await this.discoverViaDefaultGateways(onFound, onProgress);
        if (defaultResult) {
            this.isDiscovering = false;
            return true;
        }

        if (onProgress) {
            onProgress("Gateway not found. Please ensure Gateway is running and Bonjour/mDNS is installed.");
        }
        this.isDiscovering = false;

        return false;
    }

    async discoverViaDefaultGateways(onFound, onProgress) {
        const gateways = loadDefaultGateways();
        
        for (const gateway of gateways) {
            if (onProgress) onProgress(`Trying ${gateway.ip}:${gateway.port} (${gateway.protocol})...`);
            
            const result = await this._tryWebSocketConnection(gateway.ip, gateway.port, 2000);
            if (result) {
                console.log(`[Discovery] ✓ Gateway found at default: ${gateway.ip}:${result.port || gateway.port}`);
                if (onProgress) onProgress(`✓ Found Gateway: ${gateway.ip}:${result.port || gateway.port}`);
                if (onFound) {
                    onFound(gateway.ip, result.port || gateway.port);
                }
                localStorage.setItem(CONFIG.LOCAL_STORAGE_GATEWAY_KEY, gateway.ip);
                return true;
            }
        }
        
        return false;
    }

    _tryWebSocketConnection(ip, port, customTimeout = 300) {
        return new Promise((resolve) => {
            let mainResolved = false; 
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
                        fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'discovery.js:105',message:'Creating WebSocket',data:{url:url,protocol:protocol},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                        // #endregion
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
                            // #region agent log
                            fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'discovery.js:136',message:'WebSocket error',data:{url:url,protocol:protocol,hasOpened:hasOpened,connectionResolved:connectionResolved,readyState:ws?ws.readyState:'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                            // #endregion
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
                            // #region agent log
                            fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'discovery.js:170',message:'WebSocket close',data:{url:url,protocol:protocol,code:event.code,reason:event.reason,hasOpened:hasOpened,connectionResolved:connectionResolved,wasClean:event.wasClean},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                            // #endregion
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
                const wsPort = port >= 8082 ? port : port + 2;
                const wsUrl = `ws://${ip}:${wsPort}`;
                console.log(`[Discovery] Trying WS connection: ${wsUrl}`);
                fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'discovery.js:195',message:'Before WS connection attempt',data:{ip:ip,basePort:port,calculatedWSPort:wsPort,wsUrl:wsUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
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
                    if (port < 8082) {
                        const wssUrl = `wss://${ip}:${port}`;
                        console.log(`[Discovery] Trying WSS connection: ${wssUrl}`);
                        fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'discovery.js:214',message:'Before WSS connection attempt',data:{ip:ip,basePort:port,wssUrl:wssUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                        // #endregion
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
                    } else {
                        console.log(`[Discovery] ✗ WS connection failed (port ${port} is WS-only, no WSS to try)`);
                        resolve(null);
                    }
                }
            })();
        });
    }

    stop() {
        this.isDiscovering = false;
    }
}
