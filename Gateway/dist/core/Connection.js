"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connection = void 0;
const ws_1 = require("ws");
const Protocols_1 = require("../types/Protocols");
const Logger_1 = require("../utils/Logger");
class Connection {
    constructor(ws, id, role, ip) {
        this.isAlive = true;
        this.ws = ws;
        this.id = id;
        this.role = role;
        this.ip = ip;
    }
    send(message) {
        if (this.ws.readyState !== ws_1.WebSocket.OPEN) {
            Logger_1.Logger.warn(`[Connection] Cannot send to ${this.id} (Socket closed)`);
            return false;
        }
        try {
            const payload = JSON.stringify(message);
            this.ws.send(payload, (err) => {
                if (err) {
                    Logger_1.Logger.error(`[Connection] Send error to ${this.id}: ${err.message}`);
                }
            });
            return true;
        }
        catch (error) {
            Logger_1.Logger.error(`[Connection] Serialization error: ${error}`);
            return false;
        }
    }
    sendError(errorMsg) {
        this.send({
            type: Protocols_1.CommandType.ERROR,
            data: { msg: errorMsg }
        });
    }
    close() {
        this.ws.close();
    }
    getRawSocket() {
        return this.ws;
    }
    ping() {
        this.isAlive = false;
        this.ws.ping();
    }
}
exports.Connection = Connection;
