import { WebSocket } from 'ws';
import { Logger } from '../utils/Logger';

export class AgentManager {
    private agents: Map<string, WebSocket> = new Map();

    public addAgent(id: string, ws: WebSocket) {
        if (this.agents.has(id)) {
            Logger.warn(`Agent ${id} reconnecting... closing old socket.`);
            const oldWs = this.agents.get(id);
            oldWs?.close()
        }

        this.agents.set(id, ws);
        Logger.info(`Agent added: ${id}. Total agents: ${this.agents.size}`);
    }

    public removeAgent(id: string) {
        if (this.agents.has(id)) {
            this.agents.delete(id);
            Logger.info(`Agent removed: ${id}. Total agents: ${this.agents.size}`);
        }
    }

    public getAgentSocket(id: string): WebSocket | undefined {
        return this.agents.get(id);
    }

    public getAllAgentIds(): string[] {
        return Array.from(this.agents.keys());
    }
}