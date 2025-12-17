import { Connection } from '../core/Connection';
import { DatabaseManager } from './DatabaseManager';
import { Logger } from '../utils/Logger';

export class ConnectionRegistry {
    private connections: Map<string, Connection> = new Map();
    private machineIdToConnection: Map<string, Set<string>> = new Map(); 
    private roleConnections: Map<'AGENT' | 'CLIENT', Set<string>> = new Map([
        ['AGENT', new Set()],
        ['CLIENT', new Set()]
    ]);

    constructor(private dbManager: DatabaseManager) {}

    public registerConnection(conn: Connection): { success: boolean; reason?: string; existingConnection?: Connection } {
        const { id, machineId, role } = conn;

        if (this.connections.has(id)) {
            Logger.warn(`[ConnectionRegistry] Connection ID ${id} already exists`);
            return { 
                success: false, 
                reason: `Connection ID ${id} already exists`,
                existingConnection: this.connections.get(id)
            };
        }

        const existingByMachineId = this.findConnectionByMachineId(machineId, role);
        if (existingByMachineId) {
            Logger.warn(`[ConnectionRegistry] Duplicate connection detected: ${machineId} as ${role} (existing: ${existingByMachineId.id})`);
            return { 
                success: false, 
                reason: `Machine ${machineId} already connected as ${role}`,
                existingConnection: existingByMachineId
            };
        }

        const oppositeRole: 'AGENT' | 'CLIENT' = role === 'AGENT' ? 'CLIENT' : 'AGENT';
        const oppositeConnection = this.findConnectionByMachineId(machineId, oppositeRole);
        if (oppositeConnection) {
            Logger.warn(`[ConnectionRegistry] Machine ${machineId} is already connected as ${oppositeRole}, closing existing connection`);
            oppositeConnection.close();
            this.unregisterConnection(oppositeConnection.id);
        }

        this.connections.set(id, conn);
        
        if (!this.machineIdToConnection.has(machineId)) {
            this.machineIdToConnection.set(machineId, new Set());
        }
        this.machineIdToConnection.get(machineId)!.add(id);
        
        this.roleConnections.get(role)!.add(id);

        Logger.info(`[ConnectionRegistry] Registered ${role} connection: ${id} (machineId: ${machineId})`);
        return { success: true };
    }

    public unregisterConnection(id: string): boolean {
        const conn = this.connections.get(id);
        if (!conn) {
            return false;
        }

        const { machineId, role } = conn;

        this.connections.delete(id);
        
        const machineConnections = this.machineIdToConnection.get(machineId);
        if (machineConnections) {
            machineConnections.delete(id);
            if (machineConnections.size === 0) {
                this.machineIdToConnection.delete(machineId);
            }
        }

        this.roleConnections.get(role)!.delete(id);

        Logger.info(`[ConnectionRegistry] Unregistered ${role} connection: ${id} (machineId: ${machineId})`);
        return true;
    }

    public findConnectionByMachineId(machineId: string, role: 'AGENT' | 'CLIENT'): Connection | null {
        const machineConnections = this.machineIdToConnection.get(machineId);
        if (!machineConnections) {
            return null;
        }

        for (const connId of machineConnections) {
            const conn = this.connections.get(connId);
            if (conn && conn.role === role) {
                return conn;
            }
        }

        return null;
    }

    public getConnection(id: string): Connection | null {
        return this.connections.get(id) || null;
    }

    public getConnectionsByRole(role: 'AGENT' | 'CLIENT'): Connection[] {
        const connectionIds = this.roleConnections.get(role);
        if (!connectionIds) {
            return [];
        }

        const connections: Connection[] = [];
        for (const id of connectionIds) {
            const conn = this.connections.get(id);
            if (conn) {
                connections.push(conn);
            }
        }

        return connections;
    }

    public getAllConnections(): Connection[] {
        return Array.from(this.connections.values());
    }

    public getConnectionCount(role?: 'AGENT' | 'CLIENT'): number {
        if (role) {
            return this.roleConnections.get(role)?.size || 0;
        }
        return this.connections.size;
    }

    public isMachineConnected(machineId: string, role?: 'AGENT' | 'CLIENT'): boolean {
        if (role) {
            return this.findConnectionByMachineId(machineId, role) !== null;
        }
        const machineConnections = this.machineIdToConnection.get(machineId);
        return machineConnections ? machineConnections.size > 0 : false;
    }
}

