export const CONFIG = {
    SERVER_PORT: 8080,
    AUTH_HASH: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918",
    WEB_PASSWORD : "chuc_ban_qua_mon_project_mang_may_tinh_2025",
    LOCAL_STORAGE_ID_KEY: 'client_machine_id',
    LOCAL_STORAGE_GATEWAY_KEY: 'gateway_ip',

    DEFAULT_GATEWAYS: [
        {ip: '192.168.2.10', port: 8080, protocol: 'wss'},
        {ip: '192.168.2.10', port: 8082, protocol: 'ws'},
    ],

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
        CAMSHOT: "CAMSHOT",
        SCREENSHOT: "SCRSHOT",
        SCR_RECORD: "SCR_RECORD",
        START_KEYLOG: "STARTKLOG",
        STOP_KEYLOG: "STOPKLOG",

        SHUTDOWN: "shutdown",
        RESTART: "restart",
        SLEEP: "sleep",

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

export function loadDefaultGateways() {
    const gateways = [...CONFIG.DEFAULT_GATEWAYS];
    
    const urlGateway = getGatewayFromURL();

    if (urlGateway) {
        gateways.unshift (
            {ip: urlGateway.ip, port: urlGateway.port, protocol: urlGateway.protocol}
        );
        console.log(`[Config] Using gateway from URL: ${urlGateway.ip}:${urlGateway.port} (${urlGateway.protocol})`);
    }

    const cacheIp = localStorage.getItem(CONFIG.LOCAL_STORAGE_GATEWAY_KEY);

    if (cacheIp && cacheIp !== 'localhost') {
        gateways.unshift(
            {ip: cacheIp, port: 8080, protocol: 'wss'},
            {ip: cacheIp, port: 8082, protocol: 'ws'}
        );
        console.log(`[Config] Using cached gateway: ${cacheIp}:8080 (wss) and ${cacheIp}:8082 (ws)`);
    }
    
    return gateways;
}

export function getGatewayFromURL() {
    const hostname = window.location.hostname;
    if (!hostname || hostname === 'localhost' || hostname === '127.0.01') {
        return null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const port = window.location.port || (protocol === 'wss' ? 8080 : 8082);

    return {
        ip:hostname,
        port: parseInt(port),
        protocol: protocol
    };
}