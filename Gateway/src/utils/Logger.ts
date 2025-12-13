export class Logger {
    public static info(msg: string, ...args: any[]) {
        console.log(`[${new Date().toISOString()}] [INFO] ${msg}`, ...args);
    }

    public static warn(msg: string, ...args: any[]) {
        console.warn(`[${new Date().toISOString()}] [ERROR] ${msg}`, ...args);
    }

    public static error(msg: string, ...args: any[]) {
        console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, ...args);
    }
}