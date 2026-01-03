import { WebSocket, RawData } from "ws"; // [CẬP NHẬT] Thêm RawData
import { Message } from "../types/Message";
import { CommandType } from "../types/Protocols";
import { Logger } from "../utils/Logger";
import * as crypto from 'crypto';

export type ConnectionRole = 'AGENT' | 'CLIENT'

export interface MachineInfo {
    ip: string;
    port: number;
    role: 'AGENT' | 'CLIENT';
}

export interface ConnectionHistory {
    timestamp: number;
    event: 'connect' | 'disconnect' | 'reconnect';
    ip: string;
    port: number;
}

export class Connection {
    private ws: WebSocket;
    public readonly id: string; 
    public readonly persistentId: string;
    public readonly role: ConnectionRole;
    public readonly ip: string;
    public readonly machineId: string;
    public name: string;
    public machineInfo: MachineInfo | null = null;
    public connectionHistory: ConnectionHistory[] = [];
    public queryResults: Map<string, any> = new Map();

    public isAlive: boolean = true;

    // [MỚI] Callbacks để Server.ts gán logic xử lý vào
    public onCommand: ((msg: Message) => void) | null = null; // Xử lý JSON (Lệnh)
    public onStream: ((data: RawData) => void) | null = null; // Xử lý Binary (Hình ảnh)
    public onDisconnect: (() => void) | null = null;

    constructor(ws: WebSocket, id: string, role: ConnectionRole, ip: string, machineId: string, name: string = '', port: number = 0) {
        this.ws = ws;
        this.id = id;
        this.role = role;
        this.ip = ip;
        this.machineId = machineId;
        this.name = name;
        this.persistentId = this.generatePersistentId(role, machineId, ip);
        
        this.machineInfo = {
            ip: ip,
            port: port,
            role: role
        };
        
        this.addConnectionEvent({
            timestamp: Date.now(),
            event: 'connect',
            ip: ip,
            port: port
        });

        // [MỚI] Khởi tạo lắng nghe sự kiện ngay khi tạo Connection
        this.initListeners();
    }

    // [MỚI] Hàm thiết lập các Event Listeners
    private initListeners() {
        // Lắng nghe tin nhắn từ Socket
        this.ws.on('message', (data: RawData, isBinary: boolean) => {
            try {
                if (isBinary) {
                    // ==> NẾU LÀ BINARY: Đây là dữ liệu Stream hình ảnh
                    // Chuyển ngay cho hàm xử lý Stream (sẽ được Server gán)
                    if (this.onStream) {
                        this.onStream(data);
                    }
                } else {
                    // ==> NẾU LÀ TEXT: Đây là JSON Lệnh (Command)
                    const messageString = data.toString();
                    const message = JSON.parse(messageString) as Message;
                    
                    // Chuyển cho hàm xử lý Lệnh
                    if (this.onCommand) {
                        this.onCommand(message);
                    }
                }
            } catch (error) {
                Logger.error(`[Connection] Error parsing message from ${this.id}: ${error}`);
            }
        });

        this.ws.on('close', () => {
            this.isAlive = false;
            this.addConnectionEvent({
                timestamp: Date.now(),
                event: 'disconnect',
                ip: this.ip,
                port: this.machineInfo?.port || 0
            });
            if (this.onDisconnect) this.onDisconnect();
        });

        this.ws.on('error', (err) => {
            Logger.error(`[Connection] Socket error for ${this.id}: ${err.message}`);
        });

        this.ws.on('pong', () => {
            this.isAlive = true;
        });
    }

    public sendBinary(data: any) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(data, { binary: true });
        }
    }

    private generatePersistentId(role: ConnectionRole, machineId: string, ip: string): string {
        const hash = crypto.createHash('md5').update(ip).digest('hex').substring(0, 8);
        return `${role}-${machineId}-${hash}`;
    }

    public updateMachineInfo(info: Partial<MachineInfo>): void {
        this.machineInfo = {
            ip: info.ip || this.ip,
            port: info.port || 0,
            role: info.role || this.role
        };
    }

    public addConnectionEvent(event: ConnectionHistory): void {
        this.connectionHistory.push(event);
        if (this.connectionHistory.length > 100) {
            this.connectionHistory.shift();
        }
    }

    public storeQueryResult(result: any): void {
        const id = `${Date.now()}`;
        this.queryResults.set(id, result);
        
        if (this.queryResults.size > 10) {
            const firstKey = this.queryResults.keys().next().value;
            if (firstKey !== undefined) {
                this.queryResults.delete(firstKey);
            }
        }
    }

    public getQueryResults(): any[] {
        return Array.from(this.queryResults.values()).slice(-10);
    }

    public send(message: Message): boolean {
        if (this.ws.readyState !== WebSocket.OPEN) {
            // Logger.warn(`[Connection] Cannot send to ${this.id} (Socket closed)`);
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