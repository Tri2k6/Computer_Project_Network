import { WebSocket } from "ws";
import { AgentManager } from "../managers/AgentManager";
import { ClientManager } from "../managers/ClientManager";
import { ConnectionRegistry } from "../managers/ConnectionRegistry";
import { DatabaseManager } from "../managers/DatabaseManager";
import { Message, createMessage } from "../types/Message";
import { CommandType } from "../types/Protocols";
import { Connection } from "../core/Connection";
import { Logger } from "../utils/Logger";
import { Config } from "../config";
import { TokenManager } from "../utils/TokenManager";

export class AuthHandler {
    private tokenManager: TokenManager;

    constructor(
        private agentManager: AgentManager,
        private clientManager: ClientManager,
        private connectionRegistry: ConnectionRegistry,
        private dbManager: DatabaseManager
    ) {
        this.tokenManager = new TokenManager();
    }

    public handle(ws: WebSocket, msg: Message) {
        const { user, pass, role, machineId, token, refreshToken } = msg.data || {};
        const sessionId = ws.id;
        const ip = (ws as any)._socket?.remoteAddress || "unknown";
        
        Logger.info(`[Auth] Authentication request from ${ip} (${sessionId}): role=${role}, machineId=${machineId}`);
        Logger.info(`[Auth] Current ConnectionRegistry state: ${this.connectionRegistry.getConnectionCount('AGENT')} agents, ${this.connectionRegistry.getConnectionCount('CLIENT')} clients`);

        if (!sessionId) {
            Logger.error(`[Auth] Missing session ID for connection from ${ip}`);
            this.sendError(ws, "Internal Error: Missing server-assigned session ID"); 
            ws.close();
            return;
        }

        if (refreshToken) {
            this.handleTokenRefresh(ws, refreshToken, ip);
            return;
        }

        if (token) {
            this.handleTokenAuth(ws, token, ip);
            return;
        }

        const userRole = role === 'CLIENT' ? 'CLIENT' : 'AGENT';

        if (userRole === 'AGENT') {
            const agentMachineId = machineId || this.generateAgentId(ip);
            Logger.info(`[Auth] Processing AGENT authentication for ${agentMachineId} from ${ip}`);
            this.authenticateAgent(ws, sessionId, ip, agentMachineId, user);
            Logger.info(`[Auth] After authenticateAgent: ${this.connectionRegistry.getConnectionCount('AGENT')} agents in registry`);
            return;
        }

        if (!machineId) {
            this.sendError(ws, "Authentication failed: Missing 'machineId'");
            this.dbManager.logAuthAttempt(ip, null, null, false, "Missing machineId");
            ws.close();
            return;
        }

        const VALID_PASS = Config.AUTH_SECRET;

        if (!pass || pass.trim() !== VALID_PASS.trim()) {
            Logger.warn(`[Auth] Failed CLIENT authentication from IP ${ip}`);
            this.sendError(ws, "Authentication failed: Wrong password.");
            this.dbManager.logAuthAttempt(ip, machineId, 'CLIENT', false, "Wrong password");
            ws.close();
            return;
        }

        this.authenticateClient(ws, sessionId, ip, user, machineId);
    }

    /**
     * Auto-authenticate AGENT (server) - no password required
     * Agent just needs to connect and will receive its unique ID
     */
    private authenticateAgent(
        ws: WebSocket,
        sessionId: string,
        ip: string,
        machineId: string,
        user?: string
    ): void {
        let name = user || machineId;
        const cachedName = this.dbManager.getConnectionName(machineId, 'AGENT');
        if (cachedName) {
            name = cachedName;
        }

        // Check if there's an existing connection with the same machineId
        const existingConnection = this.connectionRegistry.findConnectionByMachineId(machineId, 'AGENT');
        let finalSessionId = sessionId;
        
        if (existingConnection) {
            // Reuse the existing connection ID for the same Agent
            finalSessionId = existingConnection.id;
            Logger.info(`[Auth] Found existing connection for Agent ${machineId} with ID ${finalSessionId}. Closing old connection.`);
            Logger.info(`[Auth] Before close: ${this.connectionRegistry.getConnectionCount('AGENT')} agents in registry`);
            existingConnection.close();
            this.connectionRegistry.unregisterConnection(existingConnection.id);
            Logger.info(`[Auth] After close: ${this.connectionRegistry.getConnectionCount('AGENT')} agents in registry`);
        }

        const newConnection = new Connection(ws, finalSessionId, 'AGENT', ip, machineId, name);

        const registrationResult = this.connectionRegistry.registerConnection(newConnection);
        
        if (!registrationResult.success) {
                Logger.error(`[AuthHandler] Failed to register agent: ${registrationResult.reason}`);
                this.sendError(ws, `Connection failed: ${registrationResult.reason}`);
                ws.close();
                return;
        }
        
        // Ensure WebSocket properties are set immediately after registration
        ws.id = finalSessionId;
        ws.role = 'AGENT';
        
        // Verify connection is still open after registration
        if (ws.readyState !== WebSocket.OPEN) {
            Logger.error(`[AuthHandler] Agent connection ${finalSessionId} is not OPEN after registration (state: ${ws.readyState}). Cleaning up.`);
            this.connectionRegistry.unregisterConnection(finalSessionId);
            ws.close();
            return;
        }

        const now = Date.now();
        this.dbManager.addConnection({
            id: finalSessionId,
            name: name,
            role: 'AGENT',
            machineId: machineId,
            ip: ip,
            connectedAt: now,
            lastSeen: now
        });

        this.dbManager.logAuthAttempt(ip, machineId, 'AGENT', true, "Auto-authenticated");
        this.agentManager.addAgent(newConnection);
        
        Logger.info(`[AuthHandler] Agent registered: ${finalSessionId} (${name}) - Total agents in registry: ${this.connectionRegistry.getConnectionCount('AGENT')}`);

        ws.id = finalSessionId;
        ws.role = 'AGENT';
        
        // Verify WebSocket is still open before sending response
        if (ws.readyState !== WebSocket.OPEN) {
            Logger.error(`[AuthHandler] Agent connection ${finalSessionId} is not OPEN after registration (state: ${ws.readyState}). Cleaning up.`);
            this.connectionRegistry.unregisterConnection(finalSessionId);
            this.agentManager.removeAgent(finalSessionId);
            return;
        }

        const successMsg = createMessage(
            CommandType.AUTH,
            {
                status: "ok",
                msg: "Agent registered successfully",
                sessionId: finalSessionId,
                machineId: machineId,
                name: name,
                agentId: finalSessionId
            }
        );

        try {
            ws.send(JSON.stringify(successMsg));
            Logger.info(`[AuthHandler] Successfully sent AUTH response to agent ${finalSessionId}. WebSocket state: ${ws.readyState}`);
            
            // Double-check connection state after sending
            setTimeout(() => {
                const stillConnected = this.connectionRegistry.getConnection(finalSessionId);
                const wsState = ws.readyState;
                if (!stillConnected) {
                    Logger.warn(`[AuthHandler] Agent ${finalSessionId} disappeared from registry shortly after registration!`);
                } else if (wsState !== WebSocket.OPEN) {
                    Logger.warn(`[AuthHandler] Agent ${finalSessionId} WebSocket state changed to ${wsState} shortly after registration!`);
                } else {
                    Logger.info(`[AuthHandler] Agent ${finalSessionId} connection verified stable. Registry: ${this.connectionRegistry.getConnectionCount('AGENT')} agents`);
                }
            }, 1000);
        } catch (error) {
            Logger.error(`[AuthHandler] Failed to send AUTH response to agent ${finalSessionId}: ${error}`);
            // Connection might be closed, cleanup
            this.connectionRegistry.unregisterConnection(finalSessionId);
            this.agentManager.removeAgent(finalSessionId);
        }
        // Agent auto-authenticated
    }

    private authenticateClient(
        ws: WebSocket,
        sessionId: string,
        ip: string,
        user: string | undefined,
        machineId: string
    ): void {
        let name = user || machineId;
        const cachedName = this.dbManager.getConnectionName(machineId, 'CLIENT');
        if (cachedName) {
            name = cachedName;
        } else if (user) {
            name = user;
        }

        const newConnection = new Connection(ws, sessionId, 'CLIENT', ip, machineId, name);

        const registrationResult = this.connectionRegistry.registerConnection(newConnection);
        
        if (!registrationResult.success) {
            if (registrationResult.existingConnection) {
                Logger.warn(`[Auth] Closing duplicate CLIENT connection: ${registrationResult.reason}`);
                registrationResult.existingConnection.close();
                const retryResult = this.connectionRegistry.registerConnection(newConnection);
                if (!retryResult.success) {
                    this.sendError(ws, `Connection failed: ${retryResult.reason}`);
                    this.dbManager.logAuthAttempt(ip, machineId, 'CLIENT', false, retryResult.reason);
                    ws.close();
                    return;
                }
            } else {
                this.sendError(ws, `Connection failed: ${registrationResult.reason}`);
                this.dbManager.logAuthAttempt(ip, machineId, 'CLIENT', false, registrationResult.reason);
                ws.close();
                return;
            }
        }

        const now = Date.now();
        this.dbManager.addConnection({
            id: sessionId,
            name: name,
            role: 'CLIENT',
            machineId: machineId,
            ip: ip,
            connectedAt: now,
            lastSeen: now
        });

        this.dbManager.logAuthAttempt(ip, machineId, 'CLIENT', true, "Password auth");
        this.clientManager.addClients(newConnection);

        ws.id = sessionId;
        ws.role = 'CLIENT';

        const accessToken = this.tokenManager.generateAccessToken({
            sessionId: sessionId,
            machineId: machineId,
            role: 'CLIENT',
            name: name,
            ip: ip
        });

        const refreshToken = this.tokenManager.generateRefreshToken({
            sessionId: sessionId,
            machineId: machineId,
            role: 'CLIENT',
            name: name,
            ip: ip
        });

        const successMsg = createMessage(
            CommandType.AUTH,
            {
                status: "ok",
                msg: "Auth successful",
                sessionId: sessionId,
                machineId: machineId,
                name: name,
                token: accessToken,
                refreshToken: refreshToken,
                expiresIn: Config.JWT_EXPIRES_IN
            }
        );

        ws.send(JSON.stringify(successMsg));
        Logger.info(`[Auth] CLIENT authenticated: ${name} (${sessionId}) - Machine: ${machineId} - IP: ${ip}`);
    }

    private generateAgentId(ip: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `AGENT-${ip.replace(/\./g, '-')}-${timestamp}-${random}`;
    }

    private handleTokenAuth(ws: WebSocket, token: string, ip: string) {
        const payload = this.tokenManager.verifyToken(token);

        if (!payload) {
            this.sendError(ws, "Authentication failed: Invalid or expired token");
            this.dbManager.logAuthAttempt(ip, null, null, false, "Invalid token");
            ws.close();
            return;
        }

        // Token is valid, authenticate
        const sessionId = ws.id || payload.sessionId;
        this.authenticateConnection(
            ws,
            sessionId,
            ip,
            payload.name,
            payload.role,
            payload.machineId,
            true // isTokenAuth
        );
    }

    private handleTokenRefresh(ws: WebSocket, refreshToken: string, ip: string) {
        const newAccessToken = this.tokenManager.refreshAccessToken(refreshToken);

        if (!newAccessToken) {
            this.sendError(ws, "Token refresh failed: Invalid or expired refresh token");
            this.dbManager.logAuthAttempt(ip, null, null, false, "Invalid refresh token");
            ws.close();
            return;
        }

        const payload = this.tokenManager.verifyToken(newAccessToken);
        if (!payload) {
            this.sendError(ws, "Token refresh failed: Could not generate new token");
            ws.close();
            return;
        }

        const response = createMessage(CommandType.AUTH, {
            status: "ok",
            msg: "Token refreshed",
            token: newAccessToken,
            sessionId: payload.sessionId,
            machineId: payload.machineId,
            name: payload.name
        });

        ws.send(JSON.stringify(response));
    }

    private authenticateConnection(
        ws: WebSocket,
        sessionId: string,
        ip: string,
        user: string | undefined,
        role: string | undefined,
        machineId: string,
        isTokenAuth: boolean = false
    ) {
        const userRole = role === 'AGENT' ? 'AGENT' : 'CLIENT';
        
        // Get or generate name for the connection
        let name = user || machineId;
        const cachedName = this.dbManager.getConnectionName(machineId, userRole);
        if (cachedName) {
            name = cachedName;
        } else if (user) {
            name = user;
        }

        // For AGENT: reuse existing connection ID if machineId already exists
        let finalSessionId = sessionId;
        if (userRole === 'AGENT') {
            const existingConnection = this.connectionRegistry.findConnectionByMachineId(machineId, 'AGENT');
            if (existingConnection) {
                finalSessionId = existingConnection.id;
                existingConnection.close();
                this.connectionRegistry.unregisterConnection(existingConnection.id);
            }
        }

        const newConnection = new Connection(ws, finalSessionId, userRole, ip, machineId, name);

        // Check for duplicates using ConnectionRegistry
        const registrationResult = this.connectionRegistry.registerConnection(newConnection);
        
        if (!registrationResult.success) {
                this.sendError(ws, `Connection failed: ${registrationResult.reason}`);
                this.dbManager.logAuthAttempt(ip, machineId, userRole, false, registrationResult.reason);
                ws.close();
                return;
        }

        // Save to database
        const now = Date.now();
        this.dbManager.addConnection({
            id: finalSessionId,
            name: name,
            role: userRole,
            machineId: machineId,
            ip: ip,
            connectedAt: now,
            lastSeen: now
        });

        // Log successful authentication
        this.dbManager.logAuthAttempt(ip, machineId, userRole, true, isTokenAuth ? "Token auth" : "Password auth");

        // Add to appropriate manager
        if (userRole === 'AGENT') {
            this.agentManager.addAgent(newConnection);
        } else {
            this.clientManager.addClients(newConnection);
        }

        ws.id = finalSessionId;
        ws.role = userRole;

        // Generate JWT tokens only for CLIENT (AGENT doesn't need tokens)
        let accessToken: string | undefined;
        let refreshToken: string | undefined;
        
        if (userRole === 'CLIENT') {
            const clientPayload = {
                sessionId: finalSessionId,
                machineId: machineId,
                role: 'CLIENT' as const,
                name: name,
                ip: ip
            };
            
            accessToken = this.tokenManager.generateAccessToken(clientPayload);
            refreshToken = this.tokenManager.generateRefreshToken(clientPayload);
        }

        const successMsg = createMessage(
            CommandType.AUTH,
            {
                status: "ok",
                msg: "Auth successful",
                sessionId: finalSessionId,
                machineId: machineId,
                name: name,
                ...(accessToken && refreshToken ? {
                    token: accessToken,
                    refreshToken: refreshToken,
                    expiresIn: Config.JWT_EXPIRES_IN
                } : {})
            }
        );

        ws.send(JSON.stringify(successMsg));
    }

    private sendError(ws: WebSocket, msg: string) {
        const err = createMessage(
            CommandType.AUTH,
            {
                status: "failed",
                msg: msg
            }
        );

        if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(err));
        }
    }
}
