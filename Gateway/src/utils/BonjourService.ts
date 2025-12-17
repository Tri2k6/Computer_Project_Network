import { Bonjour } from 'bonjour-service';
import { Logger } from './Logger';
import { Config } from '../config';

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

            Logger.info(`[Bonjour] Attempting to publish HTTP service: ${serviceName} (type: ${serviceType}, port: ${port})`);

            this.service = this.bonjourInstance.publish({
                name: serviceName,
                type: serviceType,
                port: port,
                txt: {
                    version: '1.0.0',
                    protocol: 'ws',
                    port: port.toString()
                }
            });

            this.service.on('up', () => {
                Logger.info(`[Bonjour] ✓ Service published successfully!`);
                Logger.info(`[Bonjour] Service name: ${serviceName}.local`);
                Logger.info(`[Bonjour] Service type: ${serviceType}`);
                Logger.info(`[Bonjour] Port: ${port}`);
                Logger.info(`[Bonjour] Clients can connect to: ws://${serviceName}.local:${port} (HTTP/WS)`);
                Logger.info(`[Bonjour] Test with: ping ${serviceName}.local`);
            });

            this.service.on('error', (err: any) => {
                Logger.error(`[Bonjour] ✗ Service error: ${err}`);
                Logger.error(`[Bonjour] Service may not be discoverable. Check network settings and multicast DNS.`);
            });

            Logger.info(`[Bonjour] Service publishing initiated. Waiting for 'up' event...`);
        } catch (error) {
            Logger.error(`[Bonjour] ✗ Failed to publish service: ${error}`);
            Logger.error(`[Bonjour] Make sure bonjour-service package is installed and network allows multicast DNS.`);
        }
    }

    public stop(): void {
        if (this.service) {
            this.service.stop();
            this.service = null;
            Logger.info('[Bonjour] Service stopped');
        }

        if (this.bonjourInstance) {
            this.bonjourInstance.destroy();
            this.bonjourInstance = null;
            Logger.info('[Bonjour] Bonjour instance destroyed');
        }
    }

    public getServiceName(): string {
        return 'rat-gateway.local';
    }
}
