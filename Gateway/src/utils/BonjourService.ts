import { Bonjour } from 'bonjour-service';
import { Logger } from './Logger';
import { Config } from '../config';
import * as os from 'os';

export class BonjourService {
    private bonjourInstance: Bonjour | null = null;
    private service: any | null = null;

    constructor() {
        try {
            this.bonjourInstance = new Bonjour();
        } catch (error) {
            Logger.error(`[Bonjour] Failed to initialize: ${error}`);
        }
    }

    public start(): void {
        if (!this.bonjourInstance) {
            Logger.warn('[Bonjour] Bonjour instance not available');
            return;
        }

        try {
            const serviceName = 'rat-gateway';
            const serviceType = '_http._tcp';
            const port = Config.PORT + 2;
            
            // Get hostname for better network discovery
            const hostname = os.hostname().split('.')[0]; // Remove domain if present
            const networkInterfaces = os.networkInterfaces();
            
            Logger.info(`[Bonjour] Publishing service: ${serviceName} (${serviceType}) on port ${port}`);

            // Try publishing without host first (let Bonjour auto-detect)
            // If that doesn't work, we can try with explicit host
            const publishOptions: any = {
                name: serviceName,
                type: serviceType,
                port: port,
                txt: {
                    version: '1.0.0',
                    protocol: 'ws',
                    port: port.toString(),
                    path: '/'
                }
            };
            
            // Only add host if we have a valid hostname
            if (hostname && hostname !== 'localhost') {
                publishOptions.host = hostname;
            }
            
            this.service = this.bonjourInstance.publish(publishOptions);

            this.service.on('up', () => {
                Logger.info(`[Bonjour] Service published: ${serviceName}.local:${port}`);
            });

            this.service.on('error', (err: any) => {
                Logger.error(`[Bonjour] Service error: ${err}`);
            });


        } catch (error) {
            Logger.error(`[Bonjour] ✗ Failed to publish service: ${error}`);
            Logger.error(`[Bonjour] Make sure bonjour-service package is installed and network allows multicast DNS.`);
        }
    }

    public stop(): void {
        if (this.service) {
            this.service.stop();
            this.service = null;
        }

        if (this.bonjourInstance) {
            this.bonjourInstance.destroy();
            this.bonjourInstance = null;
        }
    }

    public getServiceName(): string {
        return 'rat-gateway.local';
    }
}
