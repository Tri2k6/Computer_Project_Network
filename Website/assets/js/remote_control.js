import { CONFIG } from './modules/config.js';

const agentId = sessionStorage.getItem('current_agent_id') || 'ALL';
let lastBlobUrl = null;

let isStreaming = false;
let agentResolution = { width: 1920, height: 1080 }; 
let frameCount = 0;
let lastFrameTime = Date.now();

const dom = {
    screenImg: document.getElementById('remote-screen'),
    screenContainer: document.getElementById('screen-container'),
    btnConnect: document.getElementById('btn-connect'),
    btnDisconnect: document.getElementById('btn-disconnect'),
    statusDot: document.getElementById('status-indicator'),
    statusBadge: document.getElementById('connection-status'),
    loader: document.getElementById('stream-loader'),
    loaderText: document.getElementById('loader-text'),
    fps: document.getElementById('fps-counter'),
    res: document.getElementById('resolution-display'),
    agentDisplay: document.getElementById('agent-id-display')
};

document.addEventListener("DOMContentLoaded", () => {
    const checkInterval = setInterval(() => {
        if (window.gateway && window.gateway.isAuthenticated) {
            clearInterval(checkInterval);
            window.gateway.refreshAgents();
            startAgentNameUpdater();
            setStatus("ready");
        }
    }, 500);

    dom.btnConnect.onclick = startSession;
    dom.btnDisconnect.onclick = stopSession;

    window.renderStreamFrame = (data) => {
        if (!isStreaming) return;
        
        if (data instanceof ArrayBuffer) {
            const blob = new Blob([data], { type: "image/jpeg" });
            const url = URL.createObjectURL(blob);
            
            dom.screenImg.src = url;
            dom.screenImg.onload = () => {
                if (lastBlobUrl && lastBlobUrl !== url) {
                    URL.revokeObjectURL(lastBlobUrl);
                }
                lastBlobUrl = url;
            };
        } 
        else if (typeof data === 'string') {
            dom.screenImg.src = "data:image/jpeg;base64," + data;
        }

        frameCount++;
        const now = Date.now();
        if (now - lastFrameTime >= 1000) {
            dom.fps.innerText = `${frameCount} FPS`;
            frameCount = 0;
            lastFrameTime = now;
        }
    };

    window.renderFrame = window.renderStreamFrame;

    window.onSystemInfo = (data) => {
        if (data && data.display) {
            agentResolution.width = parseInt(data.display.width);
            agentResolution.height = parseInt(data.display.height);
            dom.res.innerText = `${agentResolution.width} x ${agentResolution.height}`;
        }
    };
});

function startAgentNameUpdater() {
    updateDisplay();

    const interval = setInterval(() => {
        const found = updateDisplay();
        if (found) clearInterval(interval); 
    }, 1000);

    function updateDisplay() {
        const display = dom.agentDisplay;
        const win = window; 

        if (display && win.gateway) {
            const agents = win.gateway.agentsList || [];
            
            const target = win.gateway.targetId !== 'ALL' ? win.gateway.targetId : agentId;
            const currentAgent = agents.find(a => a.id === target);
            
            const displayName = currentAgent ? currentAgent.machineId : target;
            
            display.innerHTML = `${displayName}`;

            return !!currentAgent;
        }
        return false;
    }
}

function startSession() {
    if (!window.gateway || !window.gateway.isAuthenticated) {
        alert("Gateway is not ready!");
        return;
    }

    isStreaming = true;
    window.gateway.setTarget(agentId);

    window.gateway.send(CONFIG.CMD.SYSTEM_INFO, ""); 
    window.gateway.send(CONFIG.CMD.START_STREAM, ""); 

    dom.btnConnect.style.display = 'none';
    dom.btnDisconnect.style.display = 'inline-flex';
    dom.loader.style.display = 'none';
    dom.screenImg.draggable = false;
    dom.screenContainer.focus();
    
    setupInputListeners();
    setStatus("streaming");
}

function stopSession() {
    isStreaming = false;
    if (window.gateway) {
        window.gateway.send(CONFIG.CMD.STOP_STREAM, "");
    }

    if (lastBlobUrl) {
        URL.revokeObjectURL(lastBlobUrl);
        lastBlobUrl = null;
    }

    dom.btnConnect.style.display = 'inline-flex';
    dom.btnDisconnect.style.display = 'none';
    dom.loader.style.display = 'flex';
    dom.loaderText.innerText = "Session Paused";
    dom.screenImg.src = "";
    
    setStatus("ready");
}

function updateAgentInfo() {
    if (window.gateway && window.gateway.agentsList) {
        const agent = window.gateway.agentsList.find(a => a.id === agentId);
        if (agent) {
            machineId = agent.machineId;
            if (dom.agentDisplay) {
                dom.agentDisplay.innerText = `${agent.name || 'Agent'} (${machineId})`;
            }
            console.log("Found Machine ID:", machineId);
        }
    }
}

function setupInputListeners() {
    const img = dom.screenImg;
    let lastSent = 0;

    img.onmousemove = (e) => {
        if (!isStreaming) return;
        const now = Date.now();
        if (now - lastSent < 30) return;
        lastSent = now;

        const coords = getScaledCoordinates(e);
        if (coords) window.gateway.sendMouseMove(coords.x, coords.y);
    };

    img.onmousedown = (e) => sendClick(e, true);
    img.onmouseup = (e) => {
        sendClick(e, false);
        dom.screenContainer.focus();
    };
    img.oncontextmenu = (e) => e.preventDefault();

    dom.screenContainer.onkeydown = (e) => {
        if (!isStreaming) return;
        e.preventDefault();
        window.gateway.sendKeyEvent(e.keyCode, true);
    };
    dom.screenContainer.onkeyup = (e) => {
        if (!isStreaming) return;
        e.preventDefault();
        window.gateway.sendKeyEvent(e.keyCode, false);
    };
}

function sendClick(e, isDown) {
    if (!isStreaming) return;
    const btn = e.button === 2 ? "right" : "left";
    window.gateway.sendMouseClick(btn, isDown);
}

function getScaledCoordinates(e) {
    const rect = dom.screenImg.getBoundingClientRect();
    const naturalRatio = agentResolution.width / agentResolution.height;
    const visibleRatio = rect.width / rect.height;

    let drawWidth = rect.width;
    let drawHeight = rect.height;
    let offsetX = 0, offsetY = 0;

    if (visibleRatio > naturalRatio) {
        drawWidth = rect.height * naturalRatio;
        offsetX = (rect.width - drawWidth) / 2;
    } else {
        drawHeight = rect.width / naturalRatio;
        offsetY = (rect.height - drawHeight) / 2;
    }

    const clientX = e.clientX - rect.left - offsetX;
    const clientY = e.clientY - rect.top - offsetY;

    if (clientX < 0 || clientX > drawWidth || clientY < 0 || clientY > drawHeight) return null;

    return {
        x: Math.round((clientX / drawWidth) * agentResolution.width),
        y: Math.round((clientY / drawHeight) * agentResolution.height)
    };
}

function setStatus(state) {
    const map = {
        idle: { color: '#cbd5e1', text: 'Disconnected', badgeBg: '#e2e8f0', badgeColor: '#64748b' },
        ready: { color: '#f59e0b', text: 'Gateway Ready', badgeBg: '#ffedd5', badgeColor: '#c2410c' },
        streaming: { color: '#22c55e', text: 'Live', badgeBg: '#dcfce7', badgeColor: '#15803d' }
    };
    
    const s = map[state] || map.idle;
    dom.statusDot.style.backgroundColor = s.color;
    dom.statusBadge.innerText = s.text;
    dom.statusBadge.style.backgroundColor = s.badgeBg;
    dom.statusBadge.style.color = s.badgeColor;
}