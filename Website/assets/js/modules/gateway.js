import { CONFIG } from './config.js';

export class Gateway{
    /**
     * @param {Object} callbacks
     * @param {Function} callbacks.onConnected
     * @param {Function} callbacks.onDisconnected
     * @param {Function} callbacks.onMessage
     * @param {Function} callbacks.onError 
     * @param {Function} callbacks.onAuthSuccess 
     */

    constructor(callbacks = {}) {
        this.ws = null;
        this.callbacks = callbacks;
        this.isAuthenticated = false;

        this.ui = window.ui || {
            renderList: (title, list) => console.table(list),
            log: (src, msg) => console.log(`[${src}] ${msg}`)
        };
    }

    /**
     * @param {string} ip 
     * @param {number} port
     */

    connect(ip, port = CONFIG.SERVER_PORT) {
        if (this.ws) {
            this.ws.close();
        }

        const url = `ws://${ip}:${port}`;
        console.log(`[Gateway] Connecting to ${url}...`);

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log(`[Network] Socket opened.`)
            if (this.callbacks.onConnected) this.callbacks.onConnected(ip);

            this.authenticate();
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
            user: CONFIG.AUTH_HASH,
            pass: CONFIG.AUTH_HASH
        });
    }

    /**
     * @param {string} type 
     * @param {any} data 
     */

    send(type, data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn(`[Gateway] Cannot send: Socket not open.`);
            return;
        }
        const packet = JSON.stringify({ type, data });
        this.ws.send(packet);
    }

    fetchProcessList() {
        this.send(CONFIG.CMD.PROC_LIST, "");
    }

    startProcesS(id) {
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

            switch (msg.type) {
                case CONFIG.CMD.AUTH:
                    if (msg.data && msg.data.status === 'ok') {
                        this.isAuthenticated = true;
                        if (this.callbacks.onAuthSuccess) this.callbacks.onAuthSuccess();
                    }
                    else {
                        console.error(`[Gateway] Auth Failed`);
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
                case CONFIG.CMD.ERROR:
                    console.error("[Server Error]", msg.data);
                    this.ui.log('Error', typeof msg.data === 'string' ? msg.data : msg.data.msg);
                    break;
                default:
                    this.ui.log('Server', JSON.stringify(msg.data));
            }

            if(this.callbacks.onMessage) {
                this.callbacks.onMessage(msg);
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