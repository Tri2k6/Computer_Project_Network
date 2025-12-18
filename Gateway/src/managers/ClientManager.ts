import { WebSocket } from 'ws'
import { Logger } from '../utils/Logger'
import { Connection } from '../core/Connection';
import { DatabaseManager } from './DatabaseManager';
import { ConnectionRegistry } from './ConnectionRegistry';
import * as fs from 'fs/promises';
import { Config } from '../config';

export interface ClientCache {
    lastConnectedIp: string
    lastSeen: number;
    machineId: string;
    customData?: any;
}

export class ClientManager {
    private clients: Map<string, Connection> = new Map();

    constructor(
        private dbManager: DatabaseManager,
        private connectionRegistry: ConnectionRegistry
    ) {
        this.loadActiveClients();
    }

    private loadActiveClients() {
        try {
            const activeConnections = this.dbManager.getAllActiveConnections('CLIENT');
            Logger.info(`[ClientManager] Found ${activeConnections.length} active clients in database`);
        } catch (error) {
            Logger.error(`[ClientManager] Failed to load active clients: ${error}`);
        }
    }

    public addClients(conn: Connection) {
        if (this.clients.has(conn.id)) {
            const oldConn = this.clients.get(conn.id);
            oldConn?.close();
        }

        this.clients.set(conn.id, conn);
    }

    public removeClient(id: string) {
        const conn = this.clients.get(id);
        if (conn) {
            this.clients.delete(id);
            
            this.dbManager.removeConnection(
                id,
                conn.name || id,
                'CLIENT',
                conn.machineId,
                conn.ip
            );

            Logger.info(`[ClientManager] Client disconnected: ${conn.name || 'Unknown'} (${id})`);
        }
    }

    public getClientSocket(id: string): Connection | undefined {
        return this.clients.get(id) || this.connectionRegistry.getConnection(id) || undefined;
    }

    public getClientCache(id: string): ClientCache | undefined {
        const record = this.dbManager.getConnectionById(id);
        if (record) {
            return {
                lastConnectedIp: record.ip,
                lastSeen: record.lastSeen,
                machineId: record.machineId
            };
        }
        return undefined;
    }
}
