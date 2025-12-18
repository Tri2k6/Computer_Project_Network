import { WebSocket, WebSocketServer } from "ws";
import { AgentManager } from "../managers/AgentManager";
import { ClientManager } from "../managers/ClientManager";
import { DatabaseManager } from "../managers/DatabaseManager";
import { ConnectionRegistry } from "../managers/ConnectionRegistry";
import { RouteHandler } from "../handlers/RouteHandlers";
import { Connection } from "./Connection";
import { Message, createMessage } from "../types/Message";
import { CommandType } from "../types/Protocols";
import { Logger } from "../utils/Logger";
import { DiscoveryListener } from "../utils/DiscoveryListener";
import { Config } from "../config";
import * as https from 'https'
import * as http from 'http'
import * as os from 'os'

export class GatewayServer {
    private wss: WebSocketServer;
    private httpServer: http.Server | null = null;
    private agentManager: AgentManager;
    private clientManager: ClientManager;
    private dbManager: DatabaseManager;
    private connectionRegistry: ConnectionRegistry;
    private router: RouteHandler;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private connectionCounter: number = 1;
    private static globalConnectionCounter: number = 1; // Shared counter across instances
    private dashboardServer: http.Server | null = null;
    private discoveryListener: DiscoveryListener | null = null;
    private static sharedDiscoveryListener: DiscoveryListener | null = null;
    private static sharedDashboardServer: http.Server | null = null;
    private static isDiscoveryStarted: boolean = false;

    constructor(server: http.Server | https.Server) {
        this.dbManager = new DatabaseManager();
        this.connectionRegistry = new ConnectionRegistry(this.dbManager);
        
        this.agentManager = new AgentManager(this.dbManager, this.connectionRegistry);
        this.clientManager = new ClientManager(this.dbManager, this.connectionRegistry);
        this.router = new RouteHandler(
            this.agentManager, 
            this.clientManager,
            this.connectionRegistry,
            this.dbManager
        );
        this.wss = new WebSocketServer({ server });
        
        // Share DiscoveryListener and Dashboard across all GatewayServer instances
        if (!GatewayServer.sharedDiscoveryListener) {
            GatewayServer.sharedDiscoveryListener = new DiscoveryListener();
        }
        this.discoveryListener = GatewayServer.sharedDiscoveryListener;

        Logger.info(`GatewayServer initialized with database and connection registry`);
    }

    public start() {
        this.wss.on('connection', (ws: WebSocket, req) => {
            const ip = req.socket.remoteAddress;
            // Use global counter + timestamp to ensure unique IDs across all connections and server restarts
            const counter = GatewayServer.globalConnectionCounter++;
            const timestamp = Date.now();
            const sessionId = `CONN-${counter}-${timestamp.toString(36)}`;
            ws.id = sessionId;
            
            // Also update instance counter for backward compatibility
            this.connectionCounter = counter + 1;

            Logger.info(`[Server] New WebSocket connection from ${ip} (${sessionId}) - Counter: ${counter}`);
            ws.isAlive = true;
            
            const autoAuthTimer = setTimeout(() => {
                if (!ws.role) {
                    this.autoAuthenticateAgent(ws, sessionId, ip || "unknown");
                }
            }, 1000);

            ws.on('message', (data) => {
                clearTimeout(autoAuthTimer);
                ws.isAlive = true; // Mark as alive when receiving messages
                Logger.debug(`[Server] Received message from ${sessionId}`);
                this.handleMessage(ws, data);
            });

            ws.on('pong', () => {
                ws.isAlive = true;
            });

            ws.on('error', (err) => {
                Logger.error(`[Server] Socket error for ${sessionId}: ${err.message}`);
                // Check if connection is still in registry
                if (ws.id) {
                    const conn = this.connectionRegistry.getConnection(ws.id);
                    if (conn) {
                        Logger.warn(`[Server] Connection ${ws.id} has error but still in registry. Role: ${conn.role}`);
                    }
                }
            });

            ws.on('close', (code, reason) => {
                clearTimeout(autoAuthTimer);
                const role = ws.role || 'unknown';
                const conn = ws.id ? this.connectionRegistry.getConnection(ws.id) : null;
                const machineId = conn?.machineId || 'unknown';
                Logger.info(`[Server] WebSocket ${sessionId} closed. Code: ${code}, Reason: ${reason || 'none'}, Role: ${role}, MachineId: ${machineId}`);
                this.handleClose(ws);
            });
        });

        this.startHeartbeat();
        
        // Only start Dashboard and Discovery once (shared across instances)
        if (!GatewayServer.sharedDashboardServer) {
            this.startDashboard();
            GatewayServer.sharedDashboardServer = this.dashboardServer;
        } else {
            this.dashboardServer = GatewayServer.sharedDashboardServer;
        }
        
        if (this.discoveryListener && !GatewayServer.isDiscoveryStarted) {
            this.discoveryListener.start();
            GatewayServer.isDiscoveryStarted = true;
        }
        
        this.startWebSocketServer();

        process.on('SIGINT', this.shutdown.bind(this));
        process.on('SIGTERM', this.shutdown.bind(this));
    }

    private startWebSocketServer() {
        // WebSocket server is already initialized in constructor
        // This method is kept for consistency but does nothing
        // The actual server is started in index.ts
    }

    private startDashboard() {
        // Don't start if already running
        if (GatewayServer.sharedDashboardServer) {
            this.dashboardServer = GatewayServer.sharedDashboardServer;
            return;
        }
        
        const dashboardPort = parseInt(process.env.DASHBOARD_PORT || '8081');
        this.dashboardServer = http.createServer((req, res) => {
            const url = new URL(req.url || '/', `http://${req.headers.host}`);
            
            if (url.pathname === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'ok',
                    uptime: process.uptime(),
                    connections: {
                        agents: this.connectionRegistry.getConnectionCount('AGENT'),
                        clients: this.connectionRegistry.getConnectionCount('CLIENT')
                    },
                    memory: process.memoryUsage(),
                    timestamp: Date.now()
                }));
                return;
            }

            if (url.pathname === '/stats') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    connections: {
                        total: this.connectionRegistry.getConnectionCount(),
                        agents: this.connectionRegistry.getConnectionCount('AGENT'),
                        clients: this.connectionRegistry.getConnectionCount('CLIENT')
                    }
                }));
                return;
            }


            if (req.method === 'OPTIONS') {
                res.writeHead(200, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });
                res.end();
                return;
            }

            res.writeHead(404);
            res.end('Not Found');
        });

        this.dashboardServer.listen(dashboardPort, '0.0.0.0', () => {
            Logger.info(`[Dashboard] HTTP server listening on port ${dashboardPort}`);
        }).on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                Logger.warn(`[Dashboard] Port ${dashboardPort} already in use. Dashboard may already be running.`);
            } else {
                Logger.error(`[Dashboard] Failed to start: ${err.message}`);
            }
        });
    }

    private async shutdown() {
        Logger.info("Received shutdown signal. Starting graceful shutdown...");
        
        // Only stop shared services once
        if (this.discoveryListener === GatewayServer.sharedDiscoveryListener) {
            this.discoveryListener.stop();
            GatewayServer.sharedDiscoveryListener = null;
        }
        
        if (this.dashboardServer === GatewayServer.sharedDashboardServer) {
            if (this.dashboardServer) {
                this.dashboardServer.close();
            }
            GatewayServer.sharedDashboardServer = null;
        }
        
        if (this.httpServer) {
            this.httpServer.close();
        }
        
        this.wss.close();
        
        try {
            this.dbManager.close();
            Logger.info("Database closed successfully.");
        } catch (error) {
            Logger.error(`Error closing database: ${error}`);
        }
        
        Logger.info("All data saved. Gateway process terminated.");
        process.exit(0);
    }

    private handleMessage(ws: WebSocket, data:any) {
        try {
            const rawString = data.toString();
            const message:  Message = JSON.parse(rawString);
            this.router.handle(ws, message);
        } catch (error) {
            Logger.error(`[Server] Invalid Message format from ${ws.id}: ${(error as Error).message}`);

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: CommandType.ERROR,
                    data: {msg: "Invalid JSON format"}
                }));
            }
        }
    }

    private handleClose(ws: WebSocket) {
        if (ws.id) {
            const conn = this.connectionRegistry.getConnection(ws.id);
            if (conn) {
                Logger.info(`[Server] Connection closing: ${ws.id} (${conn.role}) - MachineId: ${conn.machineId}`);
                const agentCountBefore = this.connectionRegistry.getConnectionCount('AGENT');
                const clientCountBefore = this.connectionRegistry.getConnectionCount('CLIENT');
                
                if (ws.role === 'AGENT') {
                    Logger.info(`[Server] Removing AGENT: ${ws.id} (${conn.machineId})`);
                    this.agentManager.removeAgent(ws.id);
                } else if (ws.role === 'CLIENT') {
                    Logger.info(`[Server] Removing CLIENT: ${ws.id} (${conn.machineId})`);
                    this.clientManager.removeClient(ws.id);
                }
                this.connectionRegistry.unregisterConnection(ws.id);
                
                const agentCountAfter = this.connectionRegistry.getConnectionCount('AGENT');
                const clientCountAfter = this.connectionRegistry.getConnectionCount('CLIENT');
                Logger.info(`[Server] After disconnect: ${agentCountAfter} agents (was ${agentCountBefore}), ${clientCountAfter} clients (was ${clientCountBefore})`);
            } else {
                Logger.warn(`[Server] Connection ${ws.id} closed but not found in registry`);
            }
        } else {
            Logger.info("[Server] Anonymous connection closed.");
        }
    }

    private autoAuthenticateAgent(ws: WebSocket, sessionId: string, ip: string) {
        const machineId = `AGENT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const name = `Agent-${machineId.substring(machineId.length - 6)}`;


        const newConnection = new Connection(ws, sessionId, 'AGENT', ip, machineId, name);

        const registrationResult = this.connectionRegistry.registerConnection(newConnection);
        
        if (!registrationResult.success) {
            if (registrationResult.existingConnection) {
                registrationResult.existingConnection.close();
                const retryResult = this.connectionRegistry.registerConnection(newConnection);
                if (!retryResult.success) {
                    Logger.error(`[Server] Failed to register agent: ${retryResult.reason}`);
                    ws.close();
                    return;
                }
            } else {
                Logger.error(`[Server] Failed to register agent: ${registrationResult.reason}`);
                ws.close();
                return;
            }
        }

        const now = Date.now();
        this.dbManager.addConnection({
            id: sessionId,
            name: name,
            role: 'AGENT',
            machineId: machineId,
            ip: ip,
            connectedAt: now,
            lastSeen: now
        });

        this.dbManager.logAuthAttempt(ip, machineId, 'AGENT', true, "Auto-authenticated");
        this.agentManager.addAgent(newConnection);
        
        Logger.info(`[Server] Agent registered: ${sessionId} (${name}) - Total agents in registry: ${this.connectionRegistry.getConnectionCount('AGENT')}`);

        ws.id = sessionId;
        ws.role = 'AGENT';

        const successMsg = createMessage(
            CommandType.AUTH,
            {
                status: "ok",
                msg: "Auto-authenticated as AGENT",
                sessionId: sessionId,
                machineId: machineId,
                agentId: machineId,
                name: name
            }
        );

        try {
            ws.send(JSON.stringify(successMsg));
            Logger.info(`[Server] Successfully sent AUTH response to auto-authenticated agent ${sessionId}. WebSocket state: ${ws.readyState}`);
            
            // Double-check connection state after sending
            setTimeout(() => {
                const stillConnected = this.connectionRegistry.getConnection(sessionId);
                const wsState = ws.readyState;
                if (!stillConnected) {
                    Logger.warn(`[Server] Auto-authenticated agent ${sessionId} disappeared from registry shortly after registration!`);
                } else if (wsState !== WebSocket.OPEN) {
                    Logger.warn(`[Server] Auto-authenticated agent ${sessionId} WebSocket state changed to ${wsState} shortly after registration!`);
                } else {
                    Logger.info(`[Server] Auto-authenticated agent ${sessionId} connection verified stable. Registry: ${this.connectionRegistry.getConnectionCount('AGENT')} agents`);
                }
            }, 1000);
        } catch (error) {
            Logger.error(`[Server] Failed to send AUTH response to auto-authenticated agent ${sessionId}: ${error}`);
            // Connection might be closed, cleanup
            this.connectionRegistry.unregisterConnection(sessionId);
            this.agentManager.removeAgent(sessionId);
        }
    }

    private startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            // Heartbeat for all connections
            const totalClients = this.wss.clients.size;
            const registryAgents = this.connectionRegistry.getConnectionCount('AGENT');
            const registryClients = this.connectionRegistry.getConnectionCount('CLIENT');
            Logger.debug(`[Heartbeat] Checking ${totalClients} WebSocket connections (Registry: ${registryAgents} agents, ${registryClients} clients)`);
            
            // Check for orphaned connections (in registry but not in WebSocket clients)
            const registryConnections = this.connectionRegistry.getAllConnections();
            registryConnections.forEach(conn => {
                const ws = conn.getRawSocket();
                if (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING) {
                    Logger.warn(`[Heartbeat] Found orphaned connection in registry: ${conn.id} (${conn.role}) - WebSocket state: ${ws.readyState}`);
                    if (conn.role === 'AGENT') {
                        this.agentManager.removeAgent(conn.id);
                    } else {
                        this.clientManager.removeClient(conn.id);
                    }
                    this.connectionRegistry.unregisterConnection(conn.id);
                }
            });
            
            this.wss.clients.forEach((ws : WebSocket) => {
                // Check if connection is still valid
                if (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING) {
                    Logger.warn(`[Heartbeat] WebSocket ${ws.id || 'unknown'} is not OPEN (state: ${ws.readyState}). Cleaning up.`);
                    if (ws.id) {
                        this.handleClose(ws);
                    }
                    return;
                }
                
                if (ws.isAlive === false) {
                    const conn = ws.id ? this.connectionRegistry.getConnection(ws.id) : null;
                    const name = conn?.name || ws.id || 'Anon';
                    const role = ws.role || conn?.role || 'unknown';
                    Logger.warn(`[Heartbeat] Terminating inactive connection: ${name} (${ws.id || 'Anon'}) - Role: ${role}`);
                    
                    // Manually trigger cleanup before terminate
                    if (ws.id && conn) {
                        Logger.info(`[Heartbeat] Manually cleaning up connection ${ws.id} before terminate`);
                        this.handleClose(ws);
                    }
                    return ws.terminate();
                }

                ws.isAlive = false;
                ws.ping();
                
                if (ws.id) {
                    this.dbManager.updateConnectionLastSeen(ws.id);
                }
            });
        }, 30000);
    }
}