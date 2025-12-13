import { WebSocket } from "ws";
import { AgentManager } from "../managers/AgentManager";
import { ClientManager } from "../managers/ClientManager";
import { Message, createMessage } from "../types/Message";
import { CommandType } from "../types/Protocols";
import { Connection } from "../core/Connection";
import { Logger } from "../utils/Logger";
import { Config } from "../config";

export class AuthHandler {
    constructor(
        private agentManager: AgentManager,
        private clientManager: ClientManager
    ) {}

    public handle(ws: WebSocket, msg: Message) {
        const { user, pass, role, machineId } = msg.data || {};
        const sessionId = ws.id;

        if (!sessionId) {
            this.sendError(ws, "Internal Error: Missing server-assigned session ID"); 
            ws.close();
            return;
        }

        if (!machineId) {
            this.sendError(ws, "Authentication failed: Missing 'machineId' ");
            ws.close();
            return;
        }

        const VALID_PASS = Config.AUTH_SECRET;

        if (pass !== VALID_PASS) {
            this.sendError(ws, "Authentication failed: Wrong password");
            ws.close();
            return;
        }

        const ip = (ws as any)._socket?.remoteAddress || "unknown";
        const userRole = role === 'AGENT' ? 'AGENT' : 'CLIENT';
        const newConnection = new Connection(ws, sessionId, userRole, ip, machineId);

        if (userRole === 'AGENT') {
            this.agentManager.addAgent(newConnection);
        } else {
            this.clientManager.addClients(newConnection);
        }

        ws.id = sessionId;
        ws.role= userRole;

        const successMsg = createMessage(
            CommandType.AUTH,
            {
                status: "ok",
                msg: "Auth successful",
                sessionId: sessionId,
                machineId: machineId
            }
        );

        ws.send(JSON.stringify(successMsg));
        Logger.info(`[Auth] ${userRole} authenticated: ${sessionId}`);
    }

    private sendError(ws: WebSocket, msg: string) {
        const err = createMessage(
            CommandType.AUTH,
            {
                status: "failed",
                msg : msg
            }
        );

        ws.send(JSON.stringify(err));
    }
}