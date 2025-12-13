"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    static info(msg, ...args) {
        console.log(`[${new Date().toISOString()}] [INFO] ${msg}`, ...args);
    }
    static warn(msg, ...args) {
        console.warn(`[${new Date().toISOString()}] [ERROR] ${msg}`, ...args);
    }
    static error(msg, ...args) {
        console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, ...args);
    }
}
exports.Logger = Logger;
