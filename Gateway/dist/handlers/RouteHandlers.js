"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteHandler = void 0;
const Message_1 = require("../types/Message");
const Protocols_1 = require("../types/Protocols");
const AuthHandler_1 = require("./AuthHandler");
const Logger_1 = require("../utils/Logger");
class RouteHandler {
    constructor(agentManager, clientManager) {
        this.agentManager = agentManager;
        this.clientManager = clientManager;
        this.authHandler = new AuthHandler_1.AuthHandler(agentManager, clientManager);
    }
    handle(ws, msg) {
        if (msg.type == Protocols_1.CommandType.AUTH) {
            this.authHandler.handle(ws, msg);
            return;
        }
        if (!ws.id) {
            ws.send(JSON.stringify((0, Message_1.createMessage)(Protocols_1.CommandType.ERROR, {
                msg: "Please login first"
            })));
            return;
        }
        if (msg.to) {
            this.forwardMessage(msg);
            return;
        }
        if (msg.type === Protocols_1.CommandType.GET_AGENTS) {
            const list = this.agentManager.getAllAgent();
            const response = (0, Message_1.createMessage)(Protocols_1.CommandType.GET_AGENTS, list);
            ws.send(JSON.stringify(response));
            Logger_1.Logger.info(`[Router] Sent agent list to ${ws.id}`);
        }
    }
    forwardMessage(msg) {
        const targetAgent = this.agentManager.getAgentSocket(msg.to);
        const targetClient = this.clientManager.getClientSocket(msg.to);
        if (targetAgent && targetAgent.isAlive) {
            targetAgent.send(msg);
            return;
        }
        if (targetClient && targetClient.isAlive) {
            targetClient.send(msg);
            return;
        }
        console.warn(`[ROUTER] Target not found or offline: ${msg.to}`);
    }
}
exports.RouteHandler = RouteHandler;
