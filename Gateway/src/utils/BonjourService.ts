import { Bonjour } from 'bonjour-service';
import { Logger } from './Logger';
import { Config } from '../config';
import * as os from 'os';
import * as child_process from 'child_process';

export class BonjourService {
    private bonjourInstance: Bonjour | null = null;
    private httpService: any | null = null;
    private httpsService: any | null = null;
    private isPublished: boolean = false;

    constructor() {
        try {
            this.bonjourInstance = new Bonjour();
        } catch (error) {
            Logger.error(`[Bonjour] Failed to initialize: ${error}`);
        }
    }

    public checkSystemSupport(): boolean {
        const platform = os.platform();
        
        if (platform === 'darwin') {
            return true;
        }
        
        if (platform === 'linux') {
            try {
                child_process.execSync('which avahi-daemon', { stdio: 'ignore' });
                return true;
            } catch {
                return false;
            }
        }
        
        if (platform === 'win32') {
            try {
                child_process.execSync('sc query Bonjour', { stdio: 'ignore' });
                return true;
            } catch {
                return false;
            }
        }
        
        return false;
    }

    public verifyInstallation(): boolean {
        if (!this.checkSystemSupport()) {
            return false;
        }

        if (!this.bonjourInstance) {
            return false;
        }

        return true;
    }

    public start(): void {
        if (!this.verifyInstallation()) {
            Logger.error('[Bonjour] ✗ Bonjour/mDNS service is REQUIRED but not installed!');
            Logger.error('[Bonjour] Please install Bonjour/mDNS service:');
            Logger.error('[Bonjour]   Windows: Run scripts/install-bonjour-windows.ps1');
            Logger.error('[Bonjour]   Linux: Run sudo bash scripts/install-avahi-linux.sh');
            Logger.error('[Bonjour]   macOS: Already installed');
            Logger.error('[Bonjour] Gateway will continue but mDNS discovery will not work.');
            return;
        }

        try {
            this.publishHTTPService();
            this.publishHTTPSService();
        } catch (error) {
            Logger.error(`[Bonjour] ✗ Failed to publish services: ${error}`);
        }
    }

    private publishHTTPService(): void {
        if (!this.bonjourInstance) return;

        try {
            const serviceName = 'rat-gateway';
            const serviceType = '_http._tcp';
            const port = Config.PORT + 2;

            Logger.info(`[Bonjour] Publishing HTTP service: ${serviceName} (type: ${serviceType}, port: ${port})`);

            this.httpService = this.bonjourInstance.publish({
                name: serviceName,
                type: serviceType,
                port: port,
                txt: {
                    version: '1.0.0',
                    protocol: 'ws',
                    port: port.toString()
                }
            });

            this.httpService.on('up', () => {
                Logger.info(`[Bonjour] ✓ HTTP service published: ws://${serviceName}.local:${port}`);
                this.checkPublishedStatus();
            });

            this.httpService.on('error', (err: any) => {
                Logger.error(`[Bonjour] ✗ HTTP service error: ${err}`);
            });
        } catch (error) {
            Logger.error(`[Bonjour] ✗ Failed to publish HTTP service: ${error}`);
        }
    }

    private publishHTTPSService(): void {
        if (!this.bonjourInstance) return;

        try {
            const serviceName = 'rat-gateway';
            const serviceType = '_https._tcp';
            const port = Config.PORT;

            Logger.info(`[Bonjour] Publishing HTTPS service: ${serviceName} (type: ${serviceType}, port: ${port})`);

            this.httpsService = this.bonjourInstance.publish({
                name: serviceName,
                type: serviceType,
                port: port,
                txt: {
                    version: '1.0.0',
                    protocol: 'wss',
                    port: port.toString()
                }
            });

            this.httpsService.on('up', () => {
                Logger.info(`[Bonjour] ✓ HTTPS service published: wss://${serviceName}.local:${port}`);
                this.checkPublishedStatus();
            });

            this.httpsService.on('error', (err: any) => {
                Logger.error(`[Bonjour] ✗ HTTPS service error: ${err}`);
            });
        } catch (error) {
            Logger.error(`[Bonjour] ✗ Failed to publish HTTPS service: ${error}`);
        }
    }

    private checkPublishedStatus(): void {
        const httpUp = this.httpService && this.httpService.published;
        const httpsUp = this.httpsService && this.httpsService.published;
        
        if (httpUp || httpsUp) {
            this.isPublished = true;
            Logger.info(`[Bonjour] Service status: HTTP=${httpUp}, HTTPS=${httpsUp}`);
        }
    }

    public isServicePublished(): boolean {
        return this.isPublished;
    }

    public stop(): void {
        if (this.httpService) {
            this.httpService.stop();
            this.httpService = null;
        }

        if (this.httpsService) {
            this.httpsService.stop();
            this.httpsService = null;
        }

        if (this.bonjourInstance) {
            this.bonjourInstance.destroy();
            this.bonjourInstance = null;
        }

        this.isPublished = false;
        Logger.info('[Bonjour] Services stopped');
    }

    public getServiceName(): string {
        return 'rat-gateway.local';
    }
}
