import { WebSocket } from "ws";
import { Message } from "../types/Message";
import { CommandType } from "../types/Protocols";
import { Logger } from "../utils/Logger";

export type ConnectionRole = 'AGENT' | 'CLIENT'

export class Connection {
    private ws: WebSocket;
    public readonly id: string; 
    public readonly role: ConnectionRole;
    public readonly ip: string;

    public isAlive: boolean = true;

    constructor(ws: WebSocket, id: string, role: ConnectionRole, ip: string) {
        this.ws = ws;
        this.id = id;
        this.role = role;
        this.ip = ip;
    }

    public send(message: Message): boolean {
        if (this.ws.readyState !== WebSocket.OPEN) {
            Logger.warn(`[Connection] Cannot send to ${this.id} (Socket closed)`);
            return false;
        }

        try {
            const payload = JSON.stringify(message);
            this.ws.send(payload, (err) => {
                if (err) {
                    Logger.error(`[Connection] Send error to ${this.id}: ${err.message}`);
                }
            });
            return true;
        } catch (error) {
            Logger.error(`[Connection] Serialization error: ${error}`);
            return false;
        }
    }

    public sendError(errorMsg: string) {
        this.send({
            type: CommandType.ERROR,
            data: {msg: errorMsg}
        });
    }

    public close() {
        this.ws.close();
    }

    public getRawSocket(): WebSocket {
        return this.ws;
    }

    public ping() {
        this.isAlive = false;
        this.ws.ping();
    }
}
