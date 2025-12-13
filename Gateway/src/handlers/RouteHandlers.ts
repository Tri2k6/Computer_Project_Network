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

        if (msg.type === CommandType.GET_AGENTS) {
            const list = this.agentManager.getAllAgent();
            const response = createMessage(
                CommandType.GET_AGENTS,
                list
            );

            ws.send(JSON.stringify(response));
            Logger.info(`[Router] Sent agent list to ${ws.id}`)
        }

        if (msg.to === 'ALL') {
            this.broadcastToAgents(ws, msg);
            return;
        }

        if (msg.to) {
            this.forwardMessage(ws, msg);
            return;
        }

        if (msg.type === CommandType.ECHO) {
            ws.send(JSON.stringify(createMessage(
                CommandType.ECHO,
                "Gateway echo: " + msg.data
            )));
        }
    }

    private forwardMessage(sender: WebSocket, msg: Message) {
        const targetId = msg.to!;
        const targetAgent = this.agentManager.getAgentSocket(targetId);

        if (targetAgent && targetAgent.isAlive) {
            msg.from = sender.id;
            targetAgent.send(msg);
            Logger.info(`[Router] Forwarded ${msg.type} from ${sender.id} to ${targetId}`);
        } else {
            sender.send(JSON.stringify(createMessage(
                CommandType.ERROR, 
                { msg: `Target ${targetId} not found or offline` }
            )));
        }
    }

    private broadcastToAgents(sender: WebSocket, msg: Message) {
        const agents = this.agentManager.getAllSockets();
        let count = 0;
        msg.from = sender.id;
        agents.forEach(agent =>{
            if (agent.isAlive) {
                agent.send(msg);
                count++
            }
        });

        Logger.info(`[Router] Broadcast ${msg.type} from ${sender.id} to ${count} agents.`);
        sender.send(JSON.stringify(createMessage(
            CommandType.ECHO, 
            { msg: `Broadcasted to ${count} agents` }
        )));
    }
}