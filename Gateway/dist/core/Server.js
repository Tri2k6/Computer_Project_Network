"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayServer = void 0;
const ws_1 = require("ws");
const AgentManager_1 = require("../managers/AgentManager");
const ClientManager_1 = require("../managers/ClientManager");
const RouteHandlers_1 = require("../handlers/RouteHandlers");
const Logger_1 = require("../utils/Logger");
const Protocols_1 = require("../types/Protocols");
class GatewayServer {
    constructor(port) {
        this.heartbeatInterval = null;
        this.agentManager = new AgentManager_1.AgentManager();
        this.clientManager = new ClientManager_1.ClientManager();
        this.router = new RouteHandlers_1.RouteHandler(this.agentManager, this.clientManager);
        this.wss = new ws_1.WebSocketServer({ port });
        Logger_1.Logger.info(`GatewayServer initialized on port ${port}`);
    }
    start() {
        this.wss.on('connection', (ws, req) => {
            const ip = req.socket.remoteAddress;
            Logger_1.Logger.info(`New connection from IP: ${ip}`);
            ws.isAlive = true;
            ws.on('message', (data) => this.handleMessage(ws, data));
            ws.on('pong', () => {
                ws.isAlive = true;
            });
            ws.on('error', (err) => Logger_1.Logger.error(`Socket error: ${err.message}`));
            ws.on('close', () => this.handleClose(ws));
        });
        this.startHeartbeat();
    }
    handleMessage(ws, data) {
        try {
            const rawString = data.toString();
            const message = JSON.parse(rawString);
            this.router.handle(ws, message);
        }
        catch (error) {
            Logger_1.Logger.error(`Invalid Message format: ${error.message}`);
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: Protocols_1.CommandType.ERROR,
                    data: { msg: "Invalid JSON format" }
                }));
            }
        }
    }
    handleClose(ws) {
        if (ws.id) {
            if (ws.role === 'AGENT') {
                this.agentManager.removeAgent(ws.id);
            }
            else if (ws.role === 'CLIENT') {
                this.clientManager.removeClient(ws.id);
            }
        }
        else {
            Logger_1.Logger.info("Anonymous connection closed.");
        }
    }
    startHeartbeat() {
        // every 30s
        this.heartbeatInterval = setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (ws.isAlive === false) {
                    Logger_1.Logger.warn(`Terminating inactive connection: ${ws.id || 'Anon'}`);
                    return ws.terminate();
                }
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);
    }
}
exports.GatewayServer = GatewayServer;
