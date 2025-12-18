import { CONFIG } from "./config.js";

export class GatewayDiscovery {
    constructor() {
        this.isDiscovering = false;
    }

    async discover(onFound, onProgress) {
        if (this.isDiscovering) {
            return false;
        }

        this.isDiscovering = true;
        
        if (onProgress) onProgress(`Connecting to Gateway at ${CONFIG.GATEWAY_IP}:${CONFIG.GATEWAY_PORT}...`);
        
        // Simply use static IP from config
        if (onFound) {
            onFound(CONFIG.GATEWAY_IP, CONFIG.GATEWAY_PORT);
        }
        
        this.isDiscovering = false;
        return true;
    }

    stop() {
        this.isDiscovering = false;
    }
}
