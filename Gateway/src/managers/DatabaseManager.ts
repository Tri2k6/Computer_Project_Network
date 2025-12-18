import Database from 'better-sqlite3';
import { Logger } from '../utils/Logger';
import { Config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

export interface ConnectionRecord {
    id: string;
    name: string;
    role: 'AGENT' | 'CLIENT';
    machineId: string;
    ip: string;
    connectedAt: number;
    lastSeen: number;
    isActive: number; 
}

export interface ConnectionLog {
    id: string;
    connectionId: string;
    name: string;
    role: 'AGENT' | 'CLIENT';
    machineId: string;
    ip: string;
    event: 'connect' | 'disconnect';
    timestamp: number;
    message?: string;
}

export class DatabaseManager {
    private db: Database.Database;
    private dbPath: string;

    constructor() {
        try {
        const dataDir = path.dirname(Config.DATABASE_PATH);
            const absoluteDataDir = path.isAbsolute(dataDir) ? dataDir : path.resolve(process.cwd(), dataDir);
            
            if (!fs.existsSync(absoluteDataDir)) {
                fs.mkdirSync(absoluteDataDir, { recursive: true });
                Logger.info(`[DatabaseManager] Created data directory: ${absoluteDataDir}`);
            }

            this.dbPath = path.isAbsolute(Config.DATABASE_PATH) 
                ? Config.DATABASE_PATH 
                : path.resolve(process.cwd(), Config.DATABASE_PATH);
            
            Logger.info(`[DatabaseManager] Database path: ${this.dbPath}`);
        this.db = new Database(this.dbPath);
        this.initializeDatabase();
            Logger.info(`[DatabaseManager] Database initialized successfully at ${this.dbPath}`);
        } catch (error) {
            Logger.error(`[DatabaseManager] Failed to initialize database: ${error}`);
            throw error;
        }
    }

    private initializeDatabase() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS connections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('AGENT', 'CLIENT')),
                machineId TEXT NOT NULL,
                ip TEXT NOT NULL,
                connectedAt INTEGER NOT NULL,
                lastSeen INTEGER NOT NULL,
                isActive INTEGER NOT NULL DEFAULT 1
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS connection_logs (
                id TEXT PRIMARY KEY,
                connectionId TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('AGENT', 'CLIENT')),
                machineId TEXT NOT NULL,
                ip TEXT NOT NULL,
                event TEXT NOT NULL CHECK(event IN ('connect', 'disconnect')),
                timestamp INTEGER NOT NULL,
                message TEXT
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS auth_attempts (
                id TEXT PRIMARY KEY,
                ip TEXT NOT NULL,
                machineId TEXT,
                role TEXT,
                success INTEGER NOT NULL DEFAULT 0,
                timestamp INTEGER NOT NULL,
                reason TEXT
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS activity_history (
                id TEXT PRIMARY KEY,
                clientId TEXT NOT NULL,
                clientName TEXT NOT NULL,
                clientMachineId TEXT NOT NULL,
                action TEXT NOT NULL,
                targetAgentId TEXT,
                targetAgentName TEXT,
                commandType TEXT,
                commandData TEXT,
                result TEXT,
                category TEXT,
                success INTEGER NOT NULL DEFAULT 1,
                timestamp INTEGER NOT NULL,
                ip TEXT
            )
        `);

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_connections_machineId ON connections(machineId);
            CREATE INDEX IF NOT EXISTS idx_connections_role ON connections(role);
            CREATE INDEX IF NOT EXISTS idx_connections_isActive ON connections(isActive);
            CREATE INDEX IF NOT EXISTS idx_logs_connectionId ON connection_logs(connectionId);
            CREATE INDEX IF NOT EXISTS idx_logs_machineId ON connection_logs(machineId);
            CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON connection_logs(timestamp);
            CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip ON auth_attempts(ip);
            CREATE INDEX IF NOT EXISTS idx_auth_attempts_timestamp ON auth_attempts(timestamp);
            CREATE INDEX IF NOT EXISTS idx_activity_clientId ON activity_history(clientId);
            CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_history(timestamp);
            CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_history(action);
            CREATE INDEX IF NOT EXISTS idx_activity_commandType ON activity_history(commandType);
            CREATE INDEX IF NOT EXISTS idx_activity_category ON activity_history(category);
        `);

        this.db.prepare('UPDATE connections SET isActive = 0').run();
    }

    public addConnection(record: Omit<ConnectionRecord, 'isActive'>): boolean {
        try {
            // Check if connection with same machineId and role already exists
            const existing = this.db.prepare(`
                SELECT id FROM connections 
                WHERE machineId = ? AND role = ? AND isActive = 1
            `).get(record.machineId, record.role) as { id: string } | undefined;

            if (existing) {
                // Mark old connection as inactive first
                this.db.prepare(`UPDATE connections SET isActive = 0 WHERE id = ?`).run(existing.id);
                
                // Check if new ID already exists, if so mark it inactive too
                const existingById = this.db.prepare(`SELECT id FROM connections WHERE id = ?`).get(record.id) as { id: string } | undefined;
                if (existingById) {
                    this.db.prepare(`UPDATE connections SET isActive = 0 WHERE id = ?`).run(record.id);
                }
            } else {
                // Check if new ID already exists, if so mark it inactive first
                const existingById = this.db.prepare(`SELECT id FROM connections WHERE id = ?`).get(record.id) as { id: string } | undefined;
                if (existingById) {
                    this.db.prepare(`UPDATE connections SET isActive = 0 WHERE id = ?`).run(record.id);
                }
            }

            // Insert or replace connection with new ID
            const insertStmt = this.db.prepare(`
                INSERT OR REPLACE INTO connections 
                (id, name, role, machineId, ip, connectedAt, lastSeen, isActive)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `);
            insertStmt.run(
                record.id,
                record.name,
                record.role,
                record.machineId,
                record.ip,
                record.connectedAt,
                record.lastSeen
            );

            this.logConnection({
                connectionId: record.id,
                name: record.name,
                role: record.role,
                machineId: record.machineId,
                ip: record.ip,
                event: 'connect',
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            Logger.error(`[DatabaseManager] Failed to add connection: ${error}`);
            return false;
        }
    }

    public updateConnectionLastSeen(id: string): boolean {
        try {
            const stmt = this.db.prepare(`
                UPDATE connections 
                SET lastSeen = ? 
                WHERE id = ?
            `);
            stmt.run(Date.now(), id);
            return true;
        } catch (error) {
            Logger.error(`[DatabaseManager] Failed to update last seen: ${error}`);
            return false;
        }
    }

    public removeConnection(id: string, name: string, role: 'AGENT' | 'CLIENT', machineId: string, ip: string): boolean {
        try {
            const stmt = this.db.prepare(`
                UPDATE connections 
                SET isActive = 0, lastSeen = ?
                WHERE id = ?
            `);
            stmt.run(Date.now(), id);

            this.logConnection({
                connectionId: id,
                name: name,
                role: role,
                machineId: machineId,
                ip: ip,
                event: 'disconnect',
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            Logger.error(`[DatabaseManager] Failed to remove connection: ${error}`);
            return false;
        }
    }

    public getConnectionById(id: string): ConnectionRecord | null {
        try {
            const stmt = this.db.prepare('SELECT * FROM connections WHERE id = ?');
            const row = stmt.get(id) as ConnectionRecord | undefined;
            return row || null;
        } catch (error) {
            Logger.error(`[DatabaseManager] Failed to get connection: ${error}`);
            return null;
        }
    }

    public getConnectionByMachineId(machineId: string, role?: 'AGENT' | 'CLIENT'): ConnectionRecord | null {
        try {
            if (role) {
                const stmt = this.db.prepare(`
                    SELECT * FROM connections 
                    WHERE machineId = ? AND role = ? AND isActive = 1
                    ORDER BY lastSeen DESC
                    LIMIT 1
                `);
                const row = stmt.get(machineId, role) as ConnectionRecord | undefined;
                return row || null;
            } else {
                const stmt = this.db.prepare(`
                    SELECT * FROM connections 
                    WHERE machineId = ? AND isActive = 1
                    ORDER BY lastSeen DESC
                    LIMIT 1
                `);
                const row = stmt.get(machineId) as ConnectionRecord | undefined;
                return row || null;
            }
        } catch (error) {
            Logger.error(`[DatabaseManager] Failed to get connection by machineId: ${error}`);
            return null;
        }
    }

    public getAllActiveConnections(role?: 'AGENT' | 'CLIENT'): ConnectionRecord[] {
        try {
            if (role) {
                const stmt = this.db.prepare(`
                    SELECT * FROM connections 
                    WHERE role = ? AND isActive = 1
                    ORDER BY connectedAt DESC
                `);
                return stmt.all(role) as ConnectionRecord[];
            } else {
                const stmt = this.db.prepare(`
                    SELECT * FROM connections 
                    WHERE isActive = 1
                    ORDER BY connectedAt DESC
                `);
                return stmt.all() as ConnectionRecord[];
            }
        } catch (error) {
            Logger.error(`[DatabaseManager] Failed to get active connections: ${error}`);
            return [];
        }
    }

    private logConnection(log: Omit<ConnectionLog, 'id'>): void {
        try {
            const logId = `${log.connectionId}-${log.timestamp}`;
            const stmt = this.db.prepare(`
                INSERT INTO connection_logs 
                (id, connectionId, name, role, machineId, ip, event, timestamp, message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                logId,
                log.connectionId,
                log.name,
                log.role,
                log.machineId,
                log.ip,
                log.event,
                log.timestamp,
                log.message || null
            );
        } catch (error) {
            Logger.error(`[DatabaseManager] Failed to log connection event: ${error}`);
        }
    }

    public getConnectionLogs(
        machineId?: string,
        role?: 'AGENT' | 'CLIENT',
        limit: number = 100
    ): ConnectionLog[] {
        try {
            let query = 'SELECT * FROM connection_logs';
            const conditions: string[] = [];
            const params: any[] = [];

            if (machineId) {
                conditions.push('machineId = ?');
                params.push(machineId);
            }

            if (role) {
                conditions.push('role = ?');
                params.push(role);
            }

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND');
            }

            query += ' ORDER BY timestamp DESC LIMIT ?';
            params.push(limit);

            const stmt = this.db.prepare(query);
            return stmt.all(...params) as ConnectionLog[];
        } catch (error) {
            Logger.error(`[DatabaseManager] Failed to get connection logs: ${error}`);
            return [];
        }
    }

    public getConnectionName(machineId: string, role: 'AGENT' | 'CLIENT'): string | null {
        try {
            const stmt = this.db.prepare(`
                SELECT name FROM connections 
                WHERE machineId = ? AND role = ?
                ORDER BY lastSeen DESC
                LIMIT 1
            `);
            const row = stmt.get(machineId, role) as { name: string } | undefined;
            return row?.name || null;
        } catch (error) {
            Logger.error(`[DatabaseManager] Failed to get connection name: ${error}`);
            return null;
        }
    }

    public logAuthAttempt(
        ip: string,
        machineId: string | null,
        role: 'AGENT' | 'CLIENT' | null,
        success: boolean,
        reason?: string
    ): void {
        try {
            const id = `${ip}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const stmt = this.db.prepare(`
                INSERT INTO auth_attempts 
                (id, ip, machineId, role, success, timestamp, reason)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                id,
                ip,
                machineId || null,
                role || null,
                success ? 1 : 0,
                Date.now(),
                reason || null
            );
        } catch (error) {
            Logger.error(`[DatabaseManager] Failed to log auth attempt: ${error}`);
        }
    }

    public getRecentAuthAttempts(ip: string, windowMs: number = 15 * 60 * 1000): number {
        try {
            const since = Date.now() - windowMs;
            const stmt = this.db.prepare(`
                SELECT COUNT(*) as count FROM auth_attempts 
                WHERE ip = ? AND timestamp > ? AND success = 0
            `);
            const result = stmt.get(ip, since) as { count: number } | undefined;
            return result?.count || 0;
        } catch (error) {
            Logger.error(`[DatabaseManager] Failed to get auth attempts: ${error}`);
            return 0;
        }
    }

    public close(): void {
        try {
            if (this.db) {
        this.db.close();
        Logger.info('[DatabaseManager] Database connection closed');
            }
        } catch (error) {
            Logger.error(`[DatabaseManager] Error closing database: ${error}`);
        }
    }
}

