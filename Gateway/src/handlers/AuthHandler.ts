import { WebSocket } from "ws";
import { AgentManager } from "../managers/AgentManager";
import { ClientManager } from "../managers/ClientManager";
import { Message, createMessage } from "../types/Message";
import { CommandType } from "../types/Protocols";
import { Connection } from "../core/Connection";
import { Logger } from "../utils/Logger";

export class AuthHandler {
    constructor(
        private agentManager: AgentManager,
        private clientManager: ClientManager
    ) {}

    public handle(ws: WebSocket, msg: Message) {
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

        const ip = (ws as any)._socket?.remoteAddress || "unknown";
        const userRole = role === 'AGENT' ? 'AGENT' : 'CLIENT';
        const newConnection = new Connection(ws, connectionId, userRole, ip);

        if (userRole === 'AGENT') {
            this.agentManager.addAgent(newConnection);
        } else {
            this.clientManager.addClients(newConnection);
        }

        ws.id = connectionId;
        ws.role= userRole;

        const successMsg = createMessage(
            CommandType.AUTH,
            {
                status: "oke",
                msg: "Auth successful"
            }
        );

        ws.send(JSON.stringify(successMsg));
        Logger.info(`[Auth] ${userRole} authenticated: ${connectionId}`);
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