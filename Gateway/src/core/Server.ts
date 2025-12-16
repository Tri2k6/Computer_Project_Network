import { WebSocket, WebSocketServer } from "ws";
import { AgentManager } from "../managers/AgentManager";
import { ClientManager } from "../managers/ClientManager";
import { RouteHandler } from "../handlers/RouteHandlers";
import { Logger } from "../utils/Logger";
import { Message } from "../types/Message";
import { CommandType } from "../types/Protocols";
import * as https from 'https'

export class GatewayServer {
    private wss: WebSocketServer;
    private agentManager: AgentManager;
    private clientManager: ClientManager;
    private router: RouteHandler;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private connectionCounter: number = 1;

    constructor(server: https.Server) {
        this.agentManager = new AgentManager();
        this.clientManager = new ClientManager();
        this.router = new RouteHandler(this.agentManager, this.clientManager);
        this.wss = new WebSocketServer({ server });

        Logger.info(`GatewayServer initialized WSS mode`);
    }

    public start() {
        this.wss.on('connection', (ws: WebSocket, req) => {
            const ip = req.socket.remoteAddress;
            const sessionId = `CONN-${this.connectionCounter++}`;
            ws.id = sessionId;
            Logger.info(`New connection from IP: ${ip}`);

            ws.isAlive = true;
            ws.on('message', (data) => this.handleMessage(ws, data));

            ws.on('pong', () => {
                ws.isAlive = true;
            });

            ws.on('error', (err) => Logger.error(`Socket error: ${err.message}`));

            ws.on('close', () => this.handleClose(ws));
        });

        this.startHeartbeat();

        process.on('SIGINT', this.shutdown.bind(this));
        process.on('SIGTERM', this.shutdown.bind(this));
    }

    private async shutdown() {
        Logger.info("Received shutdown signal. Starting graceful shutdown...");
        this.wss.close();
        const clientSave = this.clientManager.saveCache();
        const agentSave = this.agentManager.saveHistory();

        await Promise.all([clientSave, agentSave]);
        Logger.info("All data saved. Gateway process terminated.");
        process.exit(0);
    }

    private handleMessage(ws: WebSocket, data:any) {
        try {
            const rawString = data.toString();
            const message:  Message = JSON.parse(rawString);

            this.router.handle(ws, message);
        } catch (error) {
            Logger.error(`Invalid Message format: ${(error as Error).message}`);

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: CommandType.ERROR,
                    data: {msg: "Invalid JSON format"}
                }));
            }
        }
    }

    private handleClose(ws: WebSocket) {
        if (ws.id) {
            if (ws.role === 'AGENT') {
                this.agentManager.removeAgent(ws.id);
            } else if (ws.role === 'CLIENT') {
                this.clientManager.removeClient(ws.id);
            }
        } else {
            Logger.info("Anonymous connection closed.");
        }
    }

    private startHeartbeat() {
        // every 30s
        this.heartbeatInterval = setInterval(() => {
            this.wss.clients.forEach((ws : WebSocket) => {
                if (ws.isAlive === false) {
                    Logger.warn(`Terminating inactive connection: ${ws.id || 'Anon'}`);
                    return ws.terminate();
                }

                ws.isAlive = false;
                ws.ping();
            })
        }, 30000);
    }
}