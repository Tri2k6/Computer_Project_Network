import { WebSocket } from 'ws'
import { Logger } from '../utils/Logger'

export class ClientManager {
    private clients: Map<string, WebSocket> = new Map();

    public addClients(id: string, ws: WebSocket) {
        this.clients.set(id, ws);
        Logger.info(`Client connected: ${id}`);
    }

    public removeClient(id: string) {
        this.clients.delete(id);
        Logger.info(`Client disconnected: ${id}`);
    }

    public getClientSocket(id: string): WebSocket | undefined {
        return this.clients.get(id);
    }
}