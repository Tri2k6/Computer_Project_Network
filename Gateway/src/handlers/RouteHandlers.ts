import { WebSocket } from 'ws'
import { Message, createMessage } from '../types/Message'
import { CommandType } from '../types/Protocols'
import { AgentManager } from '../managers/AgentManager'
import { ClientManager } from '../managers/ClientManager'
import { ConnectionRegistry } from '../managers/ConnectionRegistry'
import { DatabaseManager } from '../managers/DatabaseManager'
import { ActivityLogger } from '../managers/ActivityLogger'
import { AuthHandler } from './AuthHandler'
import { TokenManager } from '../utils/TokenManager'
import { Logger } from '../utils/Logger'
import { Connection } from '../core/Connection'

export class RouteHandler {
    private authHandler: AuthHandler;
    private tokenManager: TokenManager;
    private activityLogger: ActivityLogger;

    constructor (
        private agentManager: AgentManager,
        private clientManager: ClientManager,
        private connectionRegistry: ConnectionRegistry,
        private dbManager: DatabaseManager
    ) {
        this.authHandler = new AuthHandler(agentManager, clientManager, connectionRegistry, dbManager);
        this.tokenManager = new TokenManager();
        this.activityLogger = new ActivityLogger(dbManager);
    }

    public handle(ws: WebSocket, msg: Message) {
        if (msg.type == CommandType.AUTH) {
            this.authHandler.handle(ws, msg);
            return;
        }
        
        if (!ws.id) {
            if (msg.data?.token) {
                const payload = this.tokenManager.verifyToken(msg.data.token);
                if (payload) {
                    const conn = this.connectionRegistry.getConnection(payload.sessionId);
                    if (conn && conn.machineId === payload.machineId) {
                        ws.id = payload.sessionId;
                        ws.role = payload.role;
                    } else {
                        ws.send(JSON.stringify(createMessage(
                            CommandType.ERROR, {
                                msg: "Token does not match active session. Please re-authenticate."
                            }
                        )));
                        return;
                    }
                } else {
                    ws.send(JSON.stringify(createMessage(
                        CommandType.ERROR, {
                            msg: "Invalid or expired token. Please re-authenticate."
                        }
                    )));
                    return;
                }
            } else {
            ws.send(JSON.stringify(createMessage(
                CommandType.ERROR, {
                    msg: "Please login first"
                }
            )));
                return;
            }
        }

        const conn = this.connectionRegistry.getConnection(ws.id!);
        if (!conn) {
            ws.send(JSON.stringify(createMessage(
                CommandType.ERROR,
                { msg: "Connection not found. Please re-authenticate." }
            )));
            return;
        }

        if (conn.role === 'AGENT') {
            // Agent can send responses back to clients (messages with 'to' field)
            // When agent responds, it sets 'to' = client ID and 'from' might be empty or agent ID
            if (msg.to) {
                // This is a response from agent to a client - forward it
                // Set 'from' to agent ID if it's empty (for proper routing)
                if (!msg.from) {
                    msg.from = conn.id;
                }
                this.forwardResponseFromAgent(ws, msg);
                return;
            }
            
            // If agent sends response without 'to' field, broadcast to all clients
            // This handles responses like SCREENSHOT, CAMSHOT, etc.
            if (msg.type === CommandType.SCREENSHOT || 
                msg.type === CommandType.CAMSHOT || 
                msg.type === CommandType.CAM_RECORD || 
                msg.type === CommandType.SCR_RECORD ||
                msg.type === CommandType.STREAM_DATA ||
                msg.type === CommandType.APP_LIST ||
                msg.type === CommandType.PROC_LIST ||
                msg.type === CommandType.FILE_LIST) {
                // Broadcast agent response to all clients
                if (!msg.from) {
                    msg.from = conn.id;
                }
                const clients = this.connectionRegistry.getConnectionsByRole('CLIENT');
                clients.forEach(client => {
                    if (client.isAlive) {
                        const responseMsg = { ...msg, to: client.id };
                        client.send(JSON.stringify(responseMsg));
                    }
                });
                Logger.info(`[Router] Broadcasted agent response ${msg.type} from ${conn.id} to ${clients.length} clients`);
                return;
            }
            
            if (msg.type !== CommandType.PONG && 
                msg.type !== CommandType.ECHO && 
                msg.type !== CommandType.ERROR &&
                !msg.from) {
                this.activityLogger.logActivity(conn, 'unauthorized_command_from_agent', {
                    commandType: msg.type,
                    success: false
                });
                ws.send(JSON.stringify(createMessage(
                    CommandType.ERROR,
                    { msg: "AGENT role can only receive commands, not send them." }
                )));
                return;
            }
        }

        const isControlCommand = (msg.to && msg.to === 'ALL') || 
            [CommandType.APP_LIST, CommandType.APP_START, CommandType.APP_KILL,
             CommandType.PROC_LIST, CommandType.PROC_START, CommandType.PROC_KILL,
             CommandType.CAM_RECORD, CommandType.SCREENSHOT, CommandType.START_KEYLOG,
             CommandType.STOP_KEYLOG, CommandType.SHUTDOWN, CommandType.RESTART,
             CommandType.CONNECT_AGENT, CommandType.GET_AGENTS,
             CommandType.ADD_AGENT_TAG, CommandType.REMOVE_AGENT_TAG, CommandType.GET_AGENTS_BY_TAG,
             CommandType.GET_AGENT_TAGS, CommandType.GET_ALL_TAGS,
             CommandType.FILE_LIST].includes(msg.type as CommandType);

        if (isControlCommand && conn.role !== 'CLIENT') {
            this.activityLogger.logActivity(conn, 'unauthorized_control_attempt', {
                commandType: msg.type,
                success: false
            });
            ws.send(JSON.stringify(createMessage(
                CommandType.ERROR,
                { msg: "Only CLIENT role can control agents. AGENT role is console-only." }
            )));
            return;
        }

        // Handle GET_AGENTS
        if (msg.type === CommandType.GET_AGENTS) {
            const list = this.agentManager.getAgentListDetails();
            
            const response = createMessage(
                CommandType.GET_AGENTS,
                list
            );

            ws.send(JSON.stringify(response));
            this.activityLogger.logAgentListRequest(conn);
            Logger.info(`[Router] Sent agent list to ${conn.name} (${conn.id})`)
            return;
        }

        // Handle Activity History
        if (msg.type === CommandType.GET_ACTIVITY_HISTORY) {
            const query = msg.data || {};
            const activities = this.activityLogger.getActivityHistory({
                clientId: query.clientId || conn.id,
                action: query.action,
                targetAgentId: query.targetAgentId,
                startTime: query.startTime,
                endTime: query.endTime,
                limit: query.limit || 100,
                offset: query.offset || 0
            });

            ws.send(JSON.stringify(createMessage(
                CommandType.GET_ACTIVITY_HISTORY,
                { activities, count: activities.length }
            )));
            this.activityLogger.logActivity(conn, 'get_activity_history', { success: true });
            return;
        }



        if (msg.type === CommandType.FILE_LIST) {
            const { agentId, path } = msg.data || {};
            if (!agentId || !path) {
                ws.send(JSON.stringify(createMessage(CommandType.ERROR, { msg: "Missing 'agentId' or 'path'" })));
                return;
            }
            
            const agent = this.connectionRegistry.getConnection(agentId);
            if (!agent || agent.role !== 'AGENT') {
                ws.send(JSON.stringify(createMessage(CommandType.ERROR, { msg: `Agent ${agentId} not found or offline` })));
                return;
            }

            msg.to = agentId;
            msg.from = conn.id;
            agent.send(msg);
            
            this.activityLogger.logActivity(conn, 'file_list', {
                targetAgentId: agentId,
                commandData: { path },
                success: true
            });
            return;
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
        const senderConn = this.connectionRegistry.getConnection(sender.id!);
        if (!senderConn) return;

        let targetAgent: Connection | null = this.connectionRegistry.getConnection(targetId);

        if (!targetAgent || targetAgent.role !== 'AGENT') {
            const client = this.clientManager.getClientSocket(targetId);
            targetAgent = client || null;
        }

        if (targetAgent && targetAgent.isAlive) {
            msg.from = sender.id;
            targetAgent.send(msg);
            const senderName = senderConn.name || sender.id;
            const targetName = targetAgent.name || targetId;
            
            // Log the command
            this.activityLogger.logCommand(
                senderConn,
                msg,
                targetAgent,
                true
            );
            
            Logger.info(`[Router] Forwarded ${msg.type} from ${senderName} (${sender.id}) to ${targetName} (${targetId})`);
        } else {
            this.activityLogger.logCommand(
                senderConn,
                msg,
                null,
                false,
                { error: `Target ${targetId} not found or offline` }
            );
            sender.send(JSON.stringify(createMessage(
                CommandType.ERROR, 
                { msg: `Target ${targetId} not found or offline` }
            )));
        }
    }

    private forwardResponseFromAgent(agentWs: WebSocket, msg: Message) {
        const targetClientId = msg.to!;
        const agentConn = this.connectionRegistry.getConnection(agentWs.id!);
        if (!agentConn) return;

        const targetClient = this.connectionRegistry.getConnection(targetClientId);
        
        if (targetClient && targetClient.role === 'CLIENT' && targetClient.isAlive) {
            // Forward response from agent to client
            targetClient.send(msg);
            const agentName = agentConn.name || agentWs.id;
            const clientName = targetClient.name || targetClientId;
            Logger.info(`[Router] Forwarded response ${msg.type} from agent ${agentName} (${agentWs.id}) to client ${clientName} (${targetClientId})`);
            
            // Log the response
            this.activityLogger.logActivity(agentConn, `response_${msg.type}`, {
                targetClientId: targetClientId,
                success: true
            });
        } else {
            Logger.warn(`[Router] Cannot forward response from agent ${agentWs.id} to client ${targetClientId}: client not found or offline`);
        }
    }

    private broadcastToAgents(sender: WebSocket, msg: Message) {
        const senderConn = this.connectionRegistry.getConnection(sender.id!);
        if (!senderConn) return;

        const agents = this.connectionRegistry.getConnectionsByRole('AGENT');
        let count = 0;
        msg.from = sender.id;
        agents.forEach(agent =>{
            if (agent.isAlive) {
                agent.send(msg);
                count++
            }
        });

        // Log broadcast activity
        this.activityLogger.logBroadcast(senderConn, msg, count);

        const senderName = senderConn.name || sender.id;
        Logger.info(`[Router] Broadcast ${msg.type} from ${senderName} (${sender.id}) to ${count} agents.`);
        sender.send(JSON.stringify(createMessage(
            CommandType.ECHO, 
            { msg: `Broadcasted to ${count} agents` }
        )));
    }
}