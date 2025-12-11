"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthHandler = void 0;
const Message_1 = require("../types/Message");
const Protocols_1 = require("../types/Protocols");
const Connection_1 = require("../core/Connection");
const Logger_1 = require("../utils/Logger");
class AuthHandler {
    constructor(agentManager, clientManager) {
        this.agentManager = agentManager;
        this.clientManager = clientManager;
    }
    handle(ws, msg) {
        const { user, pass, role } = msg.data || {};
        const connectionId = msg.from;
        if (!connectionId) {
            this.sendError(ws, "Missing 'from'");
            return;
        }
        const VALID_PASS = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
        if (pass !== VALID_PASS) {
            this.sendError(ws, "Authentication failed: Wrong password");
            ws.close();
            return;
        }
        const ip = ws._socket?.remoteAddress || "unknown";
        const userRole = role === 'AGENT' ? 'AGENT' : 'CLIENT';
        const newConnection = new Connection_1.Connection(ws, connectionId, userRole, ip);
        if (userRole === 'AGENT') {
            this.agentManager.addAgent(newConnection);
        }
        else {
            this.clientManager.addClients(newConnection);
        }
        ws.id = connectionId;
        ws.role = userRole;
        const successMsg = (0, Message_1.createMessage)(Protocols_1.CommandType.AUTH, {
            status: "oke",
            msg: "Auth successful"
        });
        ws.send(JSON.stringify(successMsg));
        Logger_1.Logger.info(`[Auth] ${userRole} authenticated: ${connectionId}`);
    }
    sendError(ws, msg) {
        const err = (0, Message_1.createMessage)(Protocols_1.CommandType.AUTH, {
            status: "failed",
            msg: msg
        });
        ws.send(JSON.stringify(err));
    }
}
exports.AuthHandler = AuthHandler;
