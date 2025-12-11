import { WebSocket } from 'ws'
import { Message, createMessage } from '../types/Message'
import { CommandType } from '../types/Protocols'
import { AgentManager } from '../managers/AgentManager'
import { ClientManager } from '../managers/ClientManager'
import { AuthHandler } from './AuthHandler'
import { Logger } from '../utils/Logger'

export class RouteHandler {
    private authHandler: AuthHandler;

    constructor (
        private agentManager: AgentManager,
        private clientManager: ClientManager
    ) {
        this.authHandler = new AuthHandler(agentManager, clientManager);
    }

    public handle(ws: WebSocket, msg: Message) {
        if (msg.type == CommandType.AUTH) {
            this.authHandler.handle(ws, msg);
            return;
        }
        
        if (!ws.id) {
            ws.send(JSON.stringify(createMessage(
                CommandType.ERROR, {
                    msg: "Please login first"
                }
            )));

            return;
        }

        if (msg.to) {
            this.forwardMessage(msg);
            return;
        }

        if (msg.type === CommandType.GET_AGENTS) {
            const list = this.agentManager.getAllAgent();
            const response = createMessage(
                CommandType.GET_AGENTS,
                list
            );

            ws.send(JSON.stringify(response));
            Logger.info(`[Router] Sent agent list to ${ws.id}`)
        }
    }

    private forwardMessage(msg: Message) {
        const targetAgent = this.agentManager.getAgentSocket(msg.to!);
        const targetClient = this.clientManager.getClientSocket(msg.to!);

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