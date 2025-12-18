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
        
        Logger.info(`[ConnectionRegistry] Registering connection: ${id} (${role}) - MachineId: ${machineId}`);

        if (this.connections.has(id)) {
            const existing = this.connections.get(id);
            Logger.error(`[ConnectionRegistry] Connection ID ${id} already exists! Existing: ${existing?.role} (${existing?.machineId}), New: ${role} (${machineId})`);
            Logger.error(`[ConnectionRegistry] This is a critical error - duplicate connection IDs should not happen!`);
            // Close the existing connection to prevent conflicts
            if (existing) {
                existing.close();
                this.unregisterConnection(existing.id);
                Logger.warn(`[ConnectionRegistry] Closed existing connection ${id} to make room for new one`);
            }
            // Continue with registration after clearing the old one
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
        
        const agentCount = this.roleConnections.get('AGENT')?.size || 0;
        const clientCount = this.roleConnections.get('CLIENT')?.size || 0;
        Logger.info(`[ConnectionRegistry] Connection registered successfully: ${id} (${role}). Total: ${this.connections.size} (${agentCount} agents, ${clientCount} clients)`);

        return { success: true };
    }

    public unregisterConnection(id: string): boolean {
        const conn = this.connections.get(id);
        if (!conn) {
            Logger.warn(`[ConnectionRegistry] Attempted to unregister non-existent connection: ${id}`);
            return false;
        }

        const { machineId, role } = conn;
        
        Logger.info(`[ConnectionRegistry] Unregistering connection: ${id} (${role}) - MachineId: ${machineId}`);

        this.connections.delete(id);
        
        const machineConnections = this.machineIdToConnection.get(machineId);
        if (machineConnections) {
            machineConnections.delete(id);
            if (machineConnections.size === 0) {
                this.machineIdToConnection.delete(machineId);
            }
        }

        this.roleConnections.get(role)!.delete(id);
        
        const agentCount = this.roleConnections.get('AGENT')?.size || 0;
        const clientCount = this.roleConnections.get('CLIENT')?.size || 0;
        Logger.info(`[ConnectionRegistry] After unregister: Total: ${this.connections.size} (${agentCount} agents, ${clientCount} clients)`);

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
            Logger.warn(`[ConnectionRegistry] getConnectionsByRole('${role}'): roleConnections Map does not have entry for ${role}`);
            return [];
        }

        Logger.debug(`[ConnectionRegistry] getConnectionsByRole('${role}'): Found ${connectionIds.size} connection IDs in roleConnections`);
        
        const connections: Connection[] = [];
        for (const id of connectionIds) {
            const conn = this.connections.get(id);
            if (conn) {
                connections.push(conn);
                Logger.debug(`[ConnectionRegistry] Found connection: ${id} (${conn.role}) - ${conn.machineId}`);
            } else {
                Logger.warn(`[ConnectionRegistry] Connection ID ${id} is in roleConnections but not in main connections Map! This is a data inconsistency.`);
            }
        }

        Logger.debug(`[ConnectionRegistry] getConnectionsByRole('${role}'): Returning ${connections.length} connections`);
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

