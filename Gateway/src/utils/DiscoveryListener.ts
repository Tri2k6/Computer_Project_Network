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
    private gatewayPort: string = "";

    constructor() {
        this.gatewayIP = this.getLocalIP();
        this.gatewayPort = Config.PORT.toString();
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
        try {
            this.server = dgram.createSocket('udp4');
            
            this.server.on('message', (msg, rinfo) => {
                const message = msg.toString();
                Logger.info(`[Discovery] Received message from ${rinfo.address}:${rinfo.port} - "${message}"`);
                
                if (message === DISCOVERY_REQUEST) {
                    const response = `${DISCOVERY_RESPONSE_PREFIX} ws://${this.gatewayIP}:${this.gatewayPort}`;
                    
                    this.server?.send(response, rinfo.port, rinfo.address, (err) => {
                        if (err) {
                            Logger.error(`[Discovery] Failed to send response: ${err.message}`);
                        } else {
                            Logger.info(`[Discovery] Responded to ${rinfo.address}:${rinfo.port} - Gateway at ws://${this.gatewayIP}:${this.gatewayPort}`);
                        }
                    });
                } else {
                    Logger.warn(`[Discovery] Received unknown message: "${message}"`);
                }
            });
            
            this.server.on('error', (err) => {
                Logger.error(`[Discovery] UDP socket error: ${err.message}`);
            });
            
            this.server.bind(DISCOVERY_PORT, () => {
                Logger.info(`[Discovery] UDP listener started on port ${DISCOVERY_PORT}`);
                Logger.info(`[Discovery] Gateway will respond with: ${this.gatewayIP}:${this.gatewayPort}`);
            });
            
        } catch (error) {
            Logger.error(`[Discovery] Failed to start UDP listener: ${error}`);
        }
    }

    public stop(): void {
        if (this.server) {
            this.server.close();
            this.server = null;
            Logger.info(`[Discovery] UDP listener stopped`);
        }
    }

    public getGatewayIP(): string {
        return this.gatewayIP;
    }

    public getGatewayPort(): string {
        return this.gatewayPort;
    }
}
