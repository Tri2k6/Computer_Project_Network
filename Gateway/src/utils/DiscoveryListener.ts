import * as dgram from 'dgram';
import { Logger } from './Logger';
import { Config } from '../config';
import * as os from 'os';

const DISCOVERY_PORT = 9999;
const DISCOVERY_REQUEST = "WHO_IS_GATEWAY?";
const DISCOVERY_RESPONSE_PREFIX = "I_AM_GATEWAY:";

export class DiscoveryListener {
    private server: dgram.Socket | null = null;
    private gatewayIP: string = "";
    private readonly WSS_PORT = "8080"; // Secure WSS port for Agent connections

    constructor() {
        this.gatewayIP = this.getLocalIP();
    }

    private getLocalIP(): string {
        const interfaces = os.networkInterfaces();
        
        for (const name of Object.keys(interfaces)) {
            const nets = interfaces[name];
            if (!nets) continue;
            
            for (const net of nets) {
                if (net.family === 'IPv4' && !net.internal && net.address) {
                    return net.address;
                }
            }
        }
        
        return "127.0.0.1";
    }

    public start(): void {
        // Don't start if already running
        if (this.server) {
            return;
        }
        
        try {
            this.server = dgram.createSocket('udp4');
            
            this.server.on('message', (msg, rinfo) => {
                const message = msg.toString();
                
                if (message === DISCOVERY_REQUEST) {
                    const response = `${DISCOVERY_RESPONSE_PREFIX} wss://${this.gatewayIP}:${this.WSS_PORT}`;
                    Logger.info(`[Discovery] Received discovery request from ${rinfo.address}:${rinfo.port}, responding with ${response}`);
                    this.server?.send(response, rinfo.port, rinfo.address, (err) => {
                        if (err) {
                            Logger.error(`[Discovery] Failed to send response: ${err.message}`);
                        } else {
                            Logger.info(`[Discovery] Sent discovery response to ${rinfo.address}:${rinfo.port}`);
                        }
                    });
                }
            });
            
            this.server.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    Logger.warn(`[Discovery] Port ${DISCOVERY_PORT} already in use. Discovery may already be running.`);
                } else {
                    Logger.error(`[Discovery] UDP socket error: ${err.message}`);
                }
            });
            
            this.server.bind(DISCOVERY_PORT, () => {
                Logger.info(`[Discovery] UDP listener started on port ${DISCOVERY_PORT}`);
            });
            
        } catch (error) {
            Logger.error(`[Discovery] Failed to start UDP listener: ${error}`);
        }
    }

    public stop(): void {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }

    public getGatewayIP(): string {
        return this.gatewayIP;
    }
    
    public isRunning(): boolean {
        return this.server !== null;
    }
}
