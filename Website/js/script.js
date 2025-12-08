const SERVER_PORT = 8080;

const AUTH_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"; 

let ws = null;
let isConnected = false;

document.addEventListener('DOMContentLoaded', function() {
    initUI();
    
    connectToServer('localhost', SERVER_PORT);
});

function initUI() {
    const toggle = document.getElementById('toggle');
    if (toggle) {
        toggle.addEventListener('change', function() {
            const mode = this.checked ? "ON" : "OFF";
            logToTerminal(`System`, `Broadcast Mode: ${mode}`);
            sendPacket("broadcast_toggle", { enabled: this.checked });
        });
    }

    const sendBtn = document.querySelector('button i.fa-paper-plane')?.parentElement;
    const cmdInput = document.querySelector('input[placeholder^="Enter command"]');

    if (sendBtn && cmdInput) {
        sendBtn.addEventListener('click', () => handleSendCommand(cmdInput));
        
        cmdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSendCommand(cmdInput);
        });
    }

    setupQuickAction('Get WiFi Pass', 'get_wifi');
    setupQuickAction('List Files', 'ls'); 
    setupQuickAction('Delete File...', 'del_file'); 
}

function setupQuickAction(buttonText, cmdType) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        if (btn.textContent.includes(buttonText)) {
            btn.addEventListener('click', () => {
                logToTerminal('User', `Triggered action: ${buttonText}`);
                if (buttonText.includes('List Files')) {
                    sendPacket('proc_list', ''); 
                } else {
                    sendPacket(cmdType, '');
                }
            });
        }
    });
}

function handleSendCommand(inputElement) {
    const cmd = inputElement.value.trim();
    if (cmd !== "") {
        logToTerminal('Me', cmd);
        
        if (cmd.startsWith("echo ")) {
            sendPacket("echo", cmd.substring(5));
        } else {
            sendPacket("cmd", cmd); 
        }
        
        inputElement.value = "";
    }
}

function connectToServer(ip, port) {
    const url = `ws://${ip}:${port}`;
    logToTerminal('System', `Connecting to ${url}...`);

    ws = new WebSocket(url);

    ws.onopen = () => {
        isConnected = true;
        logToTerminal('System', 'Connection established.');
        updateConnectionStatus(1); 
        doLogin();
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            handleServerMessage(msg);
        } catch (e) {
            logToTerminal('Server (Raw)', event.data);
        }
    };

    ws.onclose = () => {
        isConnected = false;
        logToTerminal('System', 'Disconnected from server.');
        updateConnectionStatus(0);
    };

    ws.onerror = (err) => {
        logToTerminal('Error', 'WebSocket error. Check console.');
        console.error(err);
    };
}

function doLogin() {
    logToTerminal('System', 'Authenticating...');
    const loginPayload = {
        user: AUTH_HASH,
        pass: AUTH_HASH
    };
    sendPacket("auth", loginPayload); 
}

function sendPacket(type, data) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        logToTerminal('Error', 'Not connected to server.');
        return;
    }
    
    const packet = JSON.stringify({ type: type, data: data });
    ws.send(packet);
}

function handleServerMessage(msg) {
    if (msg.type === 'auth_result') {
        if (msg.data === 'ok') {
            logToTerminal('System', 'Login Successful! Access Granted.');
            document.body.style.borderColor = "#8b5cf6"; // Đổi màu viền nhẹ để báo hiệu
        } else {
            logToTerminal('System', 'Login Failed.');
        }
    } else if (msg.type === 'proc_list') {
        logToTerminal('Server', 'Process List received:');
        if (Array.isArray(msg.data)) {
            msg.data.forEach(proc => {
                const name = proc.name || proc.exeName || JSON.stringify(proc);
                logToTerminal('Proc', name);
            });
        }
    } else {
        const content = (typeof msg.data === 'object') ? JSON.stringify(msg.data) : msg.data;
        logToTerminal('Server', content);
    }
}

function logToTerminal(source, message) {
    const mainArea = document.querySelector('main .flex-1.bg-dark-800\\/30');
    
    if (!document.getElementById('terminal-log')) {
        mainArea.innerHTML = ''; 
        mainArea.className = "flex-1 bg-dark-900 border border-dark-700 rounded-xl p-4 overflow-hidden flex flex-col font-mono text-sm";
        
        const logContainer = document.createElement('div');
        logContainer.id = 'terminal-log';
        logContainer.className = "flex-1 overflow-y-auto space-y-1 p-2";
        mainArea.appendChild(logContainer);
    }

    const logContainer = document.getElementById('terminal-log');

    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const row = document.createElement('div');
    row.className = "hover:bg-dark-800/50 px-2 py-1 rounded transition-colors";
    
    let colorClass = "text-gray-400";
    if (source === "Me") colorClass = "text-accent-purple font-bold";
    if (source === "Server") colorClass = "text-green-400";
    if (source === "Error") colorClass = "text-red-400";
    
    row.innerHTML = `<span class="text-gray-600 mr-2">[${time}]</span><span class="${colorClass} mr-2">${source}:</span><span class="text-gray-300">${message}</span>`;
    
    logContainer.appendChild(row);
    logContainer.scrollTop = logContainer.scrollHeight; // Auto scroll
}

function updateConnectionStatus(count) {
    const statusSpan = document.querySelector('.fa-user-group + span');
    if (statusSpan) {
        statusSpan.innerText = count;
        statusSpan.className = count > 0 ? "text-green-400 font-bold" : "text-white font-bold";
    }
}