"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
console.log("=== STARTING GATEWAY ===");
const Server_1 = require("./core/Server");
const config_1 = require("./config");
const Logger_1 = require("./utils/Logger");
try {
    const server = new Server_1.GatewayServer(config_1.Config.PORT);
    server.start();
}
catch (error) {
    Logger_1.Logger.error(`Failed to start Gateway: ${error}`);
    process.exit(1);
}
