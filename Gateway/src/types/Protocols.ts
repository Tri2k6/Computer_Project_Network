export enum CommandType {
    PING = "ping",
    PONG = "pong",
    AUTH = "auth",
    HEARTBEAT = "heartbeat",
    ERROR = "error",
    BROADCAST = "broadcast",

    APP_LIST = "LISTAPP",
    APP_START = "STARTAPP",
    APP_KILL = "STOPAPP",
    
    PROC_LIST = "LISTPROC",
    PROC_START = "STARTPROC",
    PROC_KILL = "STOPPROC",

    CAM_RECORD = "cam_record",
    SCREENSHOT = "SCRSHOT",
    START_KEYLOG = "STARTKLOG",
    STOP_KEYLOG = "STOPKLOG",

    SHUTDOWN = "shutdown",
    RESTART = "restart",
    
    ECHO = "echo",
    WHOAMI = "whoami",

    GET_AGENTS = "get_agents",
    AGEN_STATUS = "agent_status",
    CONNECT_AGENT = "connect_agent"
}
