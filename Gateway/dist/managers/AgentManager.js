"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentManager = void 0;
const Logger_1 = require("../utils/Logger");
class AgentManager {
    constructor() {
        this.agents = new Map();
    }
    addAgent(conn) {
        if (this.agents.has(conn.id)) {
            Logger_1.Logger.warn(`Agent ${conn.id} reconnecting... closing old socket.`);
            const oldWs = this.agents.get(conn.id);
            oldWs?.close();
        }
        this.agents.set(conn.id, conn);
        Logger_1.Logger.info(`Agent added: ${conn.id}. Total agents: ${this.agents.size}`);
    }
    removeAgent(id) {
        if (this.agents.has(id)) {
            this.agents.delete(id);
            Logger_1.Logger.info(`Agent removed: ${id}. Total agents: ${this.agents.size}`);
        }
    }
    getAgentSocket(id) {
        return this.agents.get(id);
    }
    getAllAgent() {
        return Array.from(this.agents.keys());
    }
}
exports.AgentManager = AgentManager;
