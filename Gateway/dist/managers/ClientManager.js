"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientManager = void 0;
const Logger_1 = require("../utils/Logger");
class ClientManager {
    constructor() {
        this.clients = new Map();
    }
    addClients(conn) {
        if (this.clients.has(conn.id)) {
            Logger_1.Logger.warn(`Client ${conn.id} reconnecting...closing old session.`);
            const oldConn = this.clients.get(conn.id);
            oldConn?.close();
        }
        this.clients.set(conn.id, conn);
        Logger_1.Logger.info(`Client connected: ${conn.id}. Total clients ${this.clients.size}`);
    }
    removeClient(id) {
        this.clients.delete(id);
        Logger_1.Logger.info(`Client disconnected: ${id}`);
    }
    getClientSocket(id) {
        return this.clients.get(id);
    }
}
exports.ClientManager = ClientManager;
