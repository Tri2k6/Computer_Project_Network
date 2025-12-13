import { WebSocket } from 'ws';
import { Logger } from '../utils/Logger';
import { Connection } from '../core/Connection';
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
    private connectionHistory: ConnectionHistory[] = [];

    constructor() {
        this.loadHistory();
    }

    private async loadHistory() {
        try {
            const data = await fs.readFile(Config.AGENT_HISTORY_FILE, 'utf-8');
            this.connectionHistory = JSON.parse(data);
            Logger.info(`[AgentManager] Loaded ${this.connectionHistory.length}`);
        } catch (error) {
            if (typeof(error as any).code === 'string' && (error as any).code === 'ENOENT') {
                Logger.warn(`[ClientManager] Cache file not found. Starting fresh.`);
            } else {
                Logger.error(`[ClientManager] Failed to load cache: ${error}`);
            }
        }
    }

    public async saveHistory() {
        try {
            await fs.writeFile(Config.AGENT_HISTORY_FILE, JSON.stringify(this.connectionHistory, null, 2), 'utf-8');
            Logger.info(`[AgentManager] Saved ${this.connectionHistory.length} history events to file.`);
            return true;
        } catch (error) {
            Logger.error(`[AgentManager] Failed to save history: ${error}`);
            return false;
        }
    }
    private logHistory(event: ConnectionHistory) {
        if (this.connectionHistory.length >= 1000) {
            this.connectionHistory.shift();
        }
        this.connectionHistory.push(event);
    }

    public addAgent(conn: Connection) {
        if (this.agents.has(conn.id)) {
            Logger.warn(`Agent ${conn.id} reconnecting... closing old socket.`);
            const oldWs = this.agents.get(conn.id);
            oldWs?.close()
        }

        this.agents.set(conn.id, conn);
        Logger.info(`Agent added: ${conn.id}. Total agents: ${this.agents.size}`);

        this.agents.set(conn.id, conn);
        Logger.info(`Agent added: ${conn.id}. Total agents: ${this.agents.size}`);
        
        this.logHistory({
            id: conn.id,
            role: 'AGENT',
            timestamp: Date.now(),
            event: 'connect',
            ip: conn.ip,
            machineId: conn.machineId
        });
    }

    public removeAgent(id: string) {
        const conn = this.agents.get(id);

        if (conn) {
            this.agents.delete(id);
            Logger.info(`Agent removed: ${id}. Total agents: ${this.agents.size}`);

            this.logHistory({
                id: id,
                role: 'AGENT',
                timestamp: Date.now(),
                event: 'disconnect',
                ip: conn.ip,
                machineId: conn.machineId
            });
        }
    }

    public getConnectionHistory(): ConnectionHistory[] {
        return this.connectionHistory;
    }

    public getAgentSocket(id: string): Connection | undefined {
        return this.agents.get(id);
    }

    public getAllAgent(): string[] {
        return Array.from(this.agents.keys());
    }

    public getAllSockets(): Connection[] {
        return Array.from(this.agents.values());
    }
}