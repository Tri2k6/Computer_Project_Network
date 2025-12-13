console.log("=== STARTING GATEWAY ===")
import { GatewayServer } from "./core/Server";
import { Config } from "./config";
import { Logger } from "./utils/Logger";
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

try {

    const certPath = path.join(__dirname, '../server.cert');
    const keyPath = path.join(__dirname, '../server.key');

    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        console.error("Khong tim thay file 'server.cert' hoac 'server.key'!");
        console.error("Vui long copy 2 file nay vao cung thu muc voi file exe.");
        process.exit(1);
    }

    const sslOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };

    const httpsServer = https.createServer(sslOptions);
    
    const gateway = new GatewayServer(httpsServer);
    
    httpsServer.listen(Config.PORT, '0.0.0.0', () => {
        Logger.info(`Gateway WSS Server listening on port ${Config.PORT}`);
        Logger.info(`Local:   https://localhost:${Config.PORT}`);
        Logger.info(`Network: https://10.148.31.96:${Config.PORT}`); // Hoặc IP LAN của bạn
    });
    
    gateway.start();
} catch (error) {
    Logger.error(`Failed to start Gateway: ${error}`);
    process.exit(1);
}
