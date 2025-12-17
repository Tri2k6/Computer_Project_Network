import { WebSocket } from 'ws';
import { Logger } from '../utils/Logger';
import { Connection } from '../core/Connection';
import { DatabaseManager } from './DatabaseManager';
import { ConnectionRegistry } from './ConnectionRegistry';
import * as fs from 'fs/promises';
import { Config } from '../config';

export interface ConnectionHistory {
    id: string;
    role: 'AGENT' | 'CLIENT';
    timestamp: number;
    event: 'connect' | 'disconnect';
    ip: string;
    machineId: string
}

export class AgentManager {
    private agents: Map<string, Connection> = new Map();

    constructor(
        private dbManager: DatabaseManager,
        private connectionRegistry: ConnectionRegistry
    ) {
        this.loadActiveAgents();
    }

    private loadActiveAgents() {
        try {
            const activeConnections = this.dbManager.getAllActiveConnections('AGENT');
            Logger.info(`[AgentManager] Found ${activeConnections.length} active agents in database`);
        } catch (error) {
            Logger.error(`[AgentManager] Failed to load active agents: ${error}`);
        }
    }

    public addAgent(conn: Connection) {
        if (this.agents.has(conn.id)) {
            Logger.warn(`[AgentManager] Agent ${conn.name || conn.id} (${conn.id}) reconnecting... closing old socket.`);
            const oldConn = this.agents.get(conn.id);
            oldConn?.close();
        }

        this.agents.set(conn.id, conn);
        Logger.info(`[AgentManager] Agent added: ${conn.name || 'Unknown'} (${conn.id}) - Machine: ${conn.machineId}. Total agents: ${this.agents.size}`);
    }

    public removeAgent(id: string) {
        const conn = this.agents.get(id);

        if (conn) {
            this.agents.delete(id);
            
            this.dbManager.removeConnection(
                id,
                conn.name || id,
                'AGENT',
                conn.machineId,
                conn.ip
            );

            Logger.info(`[AgentManager] Agent removed: ${conn.name || 'Unknown'} (${id}). Total agents: ${this.agents.size}`);
        }
    }

    public getConnectionHistory() {
        return this.dbManager.getConnectionLogs(undefined, 'AGENT', 1000);
    }

    public getAgentListDetails() {
        return Array.from(this.agents.values()).map(conn => ({
            id: conn.id,
            name: conn.name || 'Unknown',
            ip: conn.ip,
            machineId: conn.machineId,
            role: conn.role
        }));
    }

}