import { WebSocket } from 'ws';
import { Logger } from '../utils/Logger';
import { Connection } from '../core/Connection';

export class AgentManager {
    private agents: Map<string, Connection> = new Map();

    public addAgent(conn: Connection) {
        if (this.agents.has(conn.id)) {
            Logger.warn(`Agent ${conn.id} reconnecting... closing old socket.`);
            const oldWs = this.agents.get(conn.id);
            oldWs?.close()
        }

        this.agents.set(conn.id, conn);
        Logger.info(`Agent added: ${conn.id}. Total agents: ${this.agents.size}`);
    }

    public removeAgent(id: string) {
        if (this.agents.has(id)) {
            this.agents.delete(id);
            Logger.info(`Agent removed: ${id}. Total agents: ${this.agents.size}`);
        }
    }

    public getAgentSocket(id: string): Connection | undefined {
        return this.agents.get(id);
    }

    public getAllAgent(): string[] {
        return Array.from(this.agents.keys());
    }
}