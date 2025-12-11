import { WebSocket } from 'ws'
import { Logger } from '../utils/Logger'
import { Connection } from '../core/Connection';

export class ClientManager {
    private clients: Map<string, Connection> = new Map();

    public addClients(conn: Connection) {
        if (this.clients.has(conn.id)) {
            Logger.warn(`Client ${conn.id} reconnecting...closing old session.`);
            const oldConn = this.clients.get(conn.id);
            oldConn?.close();
        }

        this.clients.set(conn.id, conn);
        Logger.info(`Client connected: ${conn.id}. Total clients ${this.clients.size}`);
    }

    public removeClient(id: string) {
        this.clients.delete(id);
        Logger.info(`Client disconnected: ${id}`);
    }

    public getClientSocket(id: string): Connection | undefined {
        return this.clients.get(id);
    }
}
