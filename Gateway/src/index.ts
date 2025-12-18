console.log("=== STARTING GATEWAY ===")
import { GatewayServer } from "./core/Server";
import { Config } from "./config";
import { Logger } from "./utils/Logger";
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import * as path from 'path';

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

try {
    // Start WSS server (secure) on port 8080
    let httpsServer: https.Server | null = null;
    const certPath = path.join(__dirname, '../server.cert');
    const keyPath = path.join(__dirname, '../server.key');

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const sslOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        httpsServer = https.createServer(sslOptions);
        const gatewayWSS = new GatewayServer(httpsServer);
        
        httpsServer.listen(Config.PORT, '0.0.0.0', () => {
            Logger.info(`Gateway WSS Server listening on port ${Config.PORT}`);
            Logger.info(`Local:   wss://localhost:${Config.PORT}`);
        });
        
        gatewayWSS.start();
    } else {
        Logger.warn("SSL certificates not found. WSS server will not start.");
        Logger.warn("Only WS (insecure) server will be available on port 8082");
    }

    // Start WS server (insecure) on port 8082
    const httpServer = http.createServer();
    const gatewayWS = new GatewayServer(httpServer);
    
    const wsPort = Config.PORT + 2; // 8082
    httpServer.listen(wsPort, '0.0.0.0', () => {
        Logger.info(`Gateway WS Server listening on port ${wsPort}`);
        Logger.info(`Local:   ws://localhost:${wsPort}`);
    });
    
    gatewayWS.start();
    
} catch (error) {
    Logger.error(`Failed to start Gateway: ${error}`);
    process.exit(1);
}
