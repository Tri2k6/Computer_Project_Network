console.log("=== STARTING GATEWAY ===")
import { GatewayServer } from "./core/Server";
import { Config } from "./config";
import { Logger } from "./utils/Logger";
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import * as os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    const certPath = path.join(__dirname, '../server.cert');
    const keyPath = path.join(__dirname, '../server.key');

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        Logger.error("Khong tim thay file 'server.cert' hoac 'server.key'!");
        Logger.error("Vui long copy 2 file nay vao cung thu muc voi file exe.");
        process.exit(1);
    }

    const sslOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };

    const httpsServer = https.createServer(sslOptions);
    
    const networkInterfaces = os.networkInterfaces();
    let gatewayIP = 'localhost';
    
    for (const name of Object.keys(networkInterfaces || {})) {
        const nets = networkInterfaces![name];
        if (!nets) continue;
    
        for (const net of nets) {
            if (net.family === 'IPv4' && !net.internal && net.address) {
                gatewayIP = net.address;
                break;
            }
        }
        if (gatewayIP !== 'localhost') break;
    }

    const gateway = new GatewayServer(httpsServer);
    
    httpsServer.listen(Config.PORT, '0.0.0.0', () => {
        Logger.info(`Gateway WSS Server listening on port ${Config.PORT}`);
        Logger.info(`Local:   https://localhost:${Config.PORT}`);
        Logger.info(`Network: https://${gatewayIP}:${Config.PORT}`);
        Logger.info(`Website: https://${gatewayIP}:${Config.PORT}`);
    });
    
    gateway.start();
} catch (error) {
    Logger.error(`Failed to start Gateway: ${error}`);
    process.exit(1);
}
