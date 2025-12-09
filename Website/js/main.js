import { CONFIG } from './modules/config.js';
import { Gateway } from './modules/gateway.js';
import { LanScanner } from './modules/scanner.js';

// --- KHỞI TẠO CLIENT ---
const client = new Gateway({
    onConnected: (ip) => {
        console.log(`%c[Main] >> Connected to ${ip}`, 'color: #10b981; font-weight: bold;');
    },
    onDisconnected: () => {
        console.log(`%c[Main] >> Disconnected!`, 'color: #ef4444; font-weight: bold;');
    },
    onAuthSuccess: () => {
        console.log(`%c[Main] >> Auth Successful! Ready to rock.`, 'color: #8b5cf6; font-weight: bold;');
        window.whoami();
    },
    onMessage: (msg) => {
        console.log('[Main] Received:', msg);
    },
    onError: (err) => {
        console.error("[Main] Error:", err);
    }
});

const scanner = new LanScanner();

window.connect = (ip) => {
    client.connect(ip);
};

window.scan = () => {
    console.log("[Main] Scanning network (192.168.1.x)...");
    scanner.scan("192.168.1.", (foundIp) => {
        console.log(`%c[Main] Found server: ${foundIp}`, 'color: yellow');
        client.connect(foundIp);
    });
};

window.listApps = () => {
    console.log("[CMD] Fetching App List...");
    client.fetchAppList();
};

window.startApp = (id) => {
    console.log(`[CMD] Starting App ID: ${id}`);
    client.startApp(id);
};

window.stopApp = (id) => {
    console.log(`[CMD] Stopping App ID: ${id}`);
    client.killApp(id);
};

window.listProcs = () => {
    console.log("[CMD] Fetching Process List...");
    client.fetchProcessList();
};

window.startProc = (id) => {
    console.log(`[CMD] Starting Process ID: ${id}`);
    client.startProcess(id);
};

window.stopProc = (id) => {
    console.log(`[CMD] Stopping Process ID: ${id}`);
    client.killProcess(id);
};


window.whoami = () => {
    client.send(CONFIG.CMD.WHOAMI, "");
};

window.echo = (text) => {
    client.send(CONFIG.CMD.ECHO, text);
};

// window.screenshot = () => {
//     const filename = "screen_" + Date.now();
//     console.log(`[CMD] Taking Screenshot (${filename})...`);
//     client.send(CONFIG.CMD.SCREENSHOT, filename);
// };

// window.recordCam = (duration = 5) => {
//     console.log(`[CMD] Recording Webcam for ${duration}s...`);
//     client.send(CONFIG.CMD.CAM_RECORD, String(duration));
// };

// window.startKeylog = () => {
//     console.log("[CMD] Starting Keylogger...");
//     client.send(CONFIG.CMD.START_KEYLOG, "");
// };

// window.stopKeylog = () => {
//     console.log("[CMD] Stopping Keylogger...");
//     client.send(CONFIG.CMD.STOP_KEYLOG, "");
// };


document.addEventListener('DOMContentLoaded', () => {
    console.clear();
    console.log("%c=== CONSOLE CONTROL PANEL ===", "color: #fff; background: #8b5cf6; font-size: 16px; padding: 5px; border-radius: 4px;");
    console.log("%cSau khi connect, hãy gõ các lệnh sau vào Console để test:", "color: #ccc");
    
    console.table({
        'connect("IP")': 'Kết nối đến IP Server (VD: "127.0.0.1")',
        'scan()': 'Tự động quét mạng và kết nối',
        '---': '--- ỨNG DỤNG ---',
        'listApps()': 'Xem danh sách App',
        'startApp(id)': 'Mở App theo ID (xem từ list)',
        'stopApp(id)': 'Tắt App theo ID',
        '---': '--- TIẾN TRÌNH ---',
        'listProcs()': 'Xem danh sách Process',
        'startProc(id)': 'Mở Process theo ID',
        'stopProc(id)': 'Tắt Process theo ID',
        '---': '--- KHÁC ---',
        'whoami()': 'Kiểm tra tên Server',
        'echo("msg")': 'Gửi tin nhắn test',
        'screenshot()': 'Chụp màn hình (Lưu tại Server)',
        'recordCam(s)': 'Quay camera (Giây)'
    });
});