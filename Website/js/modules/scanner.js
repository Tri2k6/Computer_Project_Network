import { CONFIG } from "./config.js";

export class LanScanner {
    constructor() {
        this.isScanning = false;
    }

    /**
     * @param {string} subnet
     * @param {Fuction} onFound
     * @param {Function} onProgress
     */

    async scan(subnet = "192.168.1.", onFound, onProgress) {
        this.isScanning = true;
        console.log(`[Scanner] Starting scan on ${subnet}1-255`);
        
        const batchSize = 20;
        for (let i = 1; i < 255; i += batchSize) {
            if (!this.isScanning) break;

            const promises = [];
            for (let j = 0; j < batchSize && (i + j) < 255; j++) {
                const ip = subnet + (i + j);
                if (onProgress) onProgress(ip);
                promises.push(this._checkIp(ip));
            }

            const results = await Promise.all(promises);

            results.forEach(result => {
                if (result.status === 'open' && onFound) {
                    onFound(result.ip);
                    this.isScanning = false;
                }
            });

            if (!this.isScanning) break;
        }
        console.log('[Scanner] Scan finished.');
    }

    stop() {
        this.isScanning = false;
    }

    _checkIp(ip) {
        return new Promise((resolve) => {
            const socket = new WebSocket(`ws://${ip}:${CONFIG.SERVER_PORT}`);

            const timer = setTimeout(() => {
                if (socket.readyState !== WebSocket.OPEN) {
                    socket.close();
                    resolve({ip, status: 'timeoute'});
                }
            }, CONFIG.SCAN_TIMEOUT);

            socket.onopen = () => {
                clearTimeout(timer);
                socket.close();
                resolve({ip, status: 'open'});
            };

            socket.onerror = () => {
                clearTimeout(timer);
                resolve({ip, status: 'closed'});
            };
        });
    }
}