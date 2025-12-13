import 'ws'

declare module 'ws' {
    interface WebSocket {
        id?: string;
        isAlive?: boolean // for heartbeat (ping/pong)
        role?: 'AGENT' | 'CLIENT';
    }
}
