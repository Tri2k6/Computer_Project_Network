import { WebSocket } from 'ws'
import { Logger } from '../utils/Logger'
import { Connection } from '../core/Connection';
import * as fs from 'fs/promises';
import { execSync } from 'node:child_process';
import { Config } from '../config';
import { parse } from 'node:path';

export interface ClientCache {
    lastConnectedIp: string
    lastSeen: number;
    machineId: string;
    customData?: any;
}

export class ClientManager {
    private clients: Map<string, Connection> = new Map();
    private clientCache: Map<string, ClientCache> = new Map();

    constructor() {
        this.loadCache();
    }

    private async loadCache() {
        try {
            const data = await fs.readFile(Config.CLIENT_CACHE_FILE, 'utf-8');
            const parsed = JSON.parse(data);
            this.clientCache = new Map(Object.entries(parsed));
            Logger.info(`[ClientManager] Loaded ${this.clientCache.size} client caches.`);
        } catch (error) {
            if (typeof(error as any).code === 'string' && (error as any).code === 'ENOENT') {
                Logger.warn(`[ClientManager] Cache file not found. Starting fresh.`);
            } else {
                Logger.error(`[ClientManager] Failed to load cache: ${error}`);
            }
        }
    }

    public async saveCache() {
        try {
            const cacheObject = Object.fromEntries(this.clientCache);
            await fs.writeFile(Config.CLIENT_CACHE_FILE, JSON.stringify(cacheObject, null, 2), 'utf-8');
            Logger.info(`[ClientManager] Saved ${this.clientCache.size} client caches to file.`);
            return true;
        } catch (error) {
            Logger.error(`[ClientManager] Failed to save cache: ${error}`);
            return false;
        }
    }

    public addClients(conn: Connection) {
        if (this.clients.has(conn.id)) {
            Logger.warn(`Client ${conn.id} reconnecting...closing old session.`);
            const oldConn = this.clients.get(conn.id);
            oldConn?.close();
        }

        this.clients.set(conn.id, conn);
        Logger.info(`Client connected: ${conn.id}. Total clients ${this.clients.size}`);
        this.updateClientCache(conn.id, conn.ip, conn.machineId);
    }

    public removeClient(id: string) {
        const conn = this.clients.get(id);
        if (conn) {
            this.updateClientCache(id, conn.ip, conn.machineId);
        }

        this.clients.delete(id);
        Logger.info(`Client disconnected: ${id}`);
    }

    private updateClientCache(id: string, ip: string, machineId: string) {
        const existingCache = this.clientCache.get(id) || {customData : {}};
        this.clientCache.set(
            id, {
                ...existingCache,
                lastConnectedIp: ip,
                lastSeen: Date.now(),
                machineId: machineId
            }
        );
    }

    public getClientSocket(id: string): Connection | undefined {
        return this.clients.get(id);
    }

    public getClientCache(id: string): ClientCache | undefined {
        return this.clientCache.get(id);
    }
}
