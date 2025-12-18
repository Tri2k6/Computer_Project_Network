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
            const oldConn = this.agents.get(conn.id);
            oldConn?.close();
        }

        this.agents.set(conn.id, conn);
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
        }
    }

    public getConnectionHistory() {
        return this.dbManager.getConnectionLogs(undefined, 'AGENT', 1000);
    }

    public getAgentListDetails() {
        // Luôn ưu tiên lấy từ ConnectionRegistry để đảm bảo dữ liệu chính xác và real-time
        const agentsFromRegistry = this.connectionRegistry.getConnectionsByRole('AGENT');
        const agentsFromMap = Array.from(this.agents.values());
        
        Logger.info(`[AgentManager] ConnectionRegistry has ${agentsFromRegistry.length} agents, internal Map has ${agentsFromMap.length} agents`);
        
        // Ưu tiên ConnectionRegistry (nguồn dữ liệu chính xác nhất)
        if (agentsFromRegistry.length > 0) {
            Logger.info(`[AgentManager] Returning ${agentsFromRegistry.length} agents from ConnectionRegistry`);
            return agentsFromRegistry.map(conn => ({
                id: conn.id,
                name: conn.name || 'Unknown',
                ip: conn.ip,
                machineId: conn.machineId,
                role: conn.role,
                status: 'online' // Agents in registry are online
            }));
        }
        
        // Nếu ConnectionRegistry trống nhưng internal Map có agents, có thể agents chưa được sync
        // Log warning và vẫn trả về từ Map (có thể là agents từ database chưa được load vào registry)
        if (agentsFromMap.length > 0) {
            Logger.warn(`[AgentManager] ConnectionRegistry is empty but internal Map has ${agentsFromMap.length} agents. Returning from Map.`);
            return agentsFromMap.map(conn => ({
                id: conn.id,
                name: conn.name || 'Unknown',
                ip: conn.ip,
                machineId: conn.machineId,
                role: conn.role,
                status: 'online'
            }));
        }
        
        // Cả hai đều trống
        Logger.info(`[AgentManager] No agents found in both ConnectionRegistry and internal Map`);
        return [];
    }

}