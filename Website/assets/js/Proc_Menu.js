// --- 1. Dữ liệu (Mock Data) ---
const mockProcessData = [
    { id: 1, name: "YouTube", pid: 1234, status: 'running' },
    { id: 2, name: "Chrome", pid: 4521, status: 'running' },
    { id: 3, name: "VS Code", pid: 8892, status: 'paused' },
    { id: 4, name: "Spotify", pid: 3321, status: 'running' },
    { id: 5, name: "Discord", pid: 1102, status: 'paused' },
    { id: 6, name: "Task Mgr", pid: 2121, status: 'running' },
    { id: 7, name: "Node.js", pid: 9928, status: 'paused' },
    { id: 8, name: "Python", pid: 2211, status: 'running' },
    { id: 9, name: "Docker", pid: 5543, status: 'running' },
    { id: 10, name: "Figma", pid: 7765, status: 'paused' },
    { id: 11, name: "Word", pid: 1212, status: 'running' },
    { id: 12, name: "Excel", pid: 3434, status: 'paused' }
];

// --- 2. Cấu hình ---
const ITEMS_PER_PAGE = 6;
let currentPage = 1;
let currentData = [];
let originalData = []; // Store original unfiltered data for search

// --- 3. DOM Elements ---
const listContainer = document.getElementById('process-list');
const searchInput = document.getElementById('search-input');
const pageIndicator = document.getElementById('page-indicator');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');

// --- 4. Render ---
function renderData() {
    listContainer.innerHTML = ''; 

    const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE) || 1;
    
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const itemsToShow = currentData.slice(startIndex, endIndex);

    if (itemsToShow.length === 0) {
        listContainer.innerHTML = '<li style="text-align:center; padding:20px; color:#555;">No process found.</li>';
        updatePagination(0);
        return;
    }

    itemsToShow.forEach((proc, idx) => {
        const li = document.createElement('li');
        li.className = 'process-item';
        
        // Đường dẫn ảnh
        const playSrc = './assets/images/start.png'; 
        const pauseSrc = './assets/images/pause.png';

        // Lấy process ID - Server uses index (0-based) to get process from list
        // IMPORTANT: Must use proc.id (which is the index), NOT proc.pid!
        // getFormattedProcessList() already sets id = index (0-based)
        let procId = proc.id; // Use the index from formatted list
        if (procId === undefined || procId === null) {
            // Fallback: use index in originalData if id not available
            const globalIndex = originalData.indexOf(proc);
            procId = globalIndex >= 0 ? globalIndex : (startIndex + idx);
        }
        // Ensure procId is a number
        procId = typeof procId === 'number' ? procId : parseInt(procId, 10);
        if (isNaN(procId) || procId < 0) {
            console.warn('[Proc_Menu] Invalid proc.id, using fallback index:', proc);
            procId = startIndex + idx;
        }
        
        const procName = proc.name || proc.processName || 'Unknown Process';
        
        // Escape procName cho HTML display
        const escapedProcName = procName.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        // Logic Toggle Class
        const startClass = proc.status === 'running' ? 'active' : 'inactive';
        const pauseClass = proc.status === 'paused' ? 'active' : 'inactive';

        li.innerHTML = `
            <div class="proc-left">
                <span class="proc-name">${escapedProcName}</span>
            </div>
            
            <span class="proc-pid">PID: ${proc.pid !== undefined ? proc.pid : (proc.PID !== undefined ? proc.PID : '-')}</span>

            <div class="proc-actions">
                <button class="action-btn ${startClass}" data-proc-id="${procId}" data-action="start" data-proc-name="${escapedProcName}" title="Start ${escapedProcName}">
                    <img src="${playSrc}" alt="Start" width="24" height="24">
                </button>
                <button class="action-btn ${pauseClass}" data-proc-id="${procId}" data-action="stop" data-proc-name="${escapedProcName}" title="Stop ${escapedProcName}">
                    <img src="${pauseSrc}" alt="Stop" width="24" height="24">
                </button>
            </div>
        `;
        
        // Add event listeners instead of inline onclick
        const startBtn = li.querySelector('[data-action="start"]');
        const stopBtn = li.querySelector('[data-action="stop"]');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const idStr = startBtn.getAttribute('data-proc-id');
                const id = parseInt(idStr, 10);
                const name = startBtn.getAttribute('data-proc-name');
                if (!isNaN(id) && id >= 0) {
                    controlProcess(id, 'running', name);
                } else {
                    console.error('[Proc_Menu] Invalid process ID:', idStr);
                }
            });
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                const idStr = stopBtn.getAttribute('data-proc-id');
                const id = parseInt(idStr, 10);
                const name = stopBtn.getAttribute('data-proc-name');
                if (!isNaN(id) && id >= 0) {
                    controlProcess(id, 'paused', name);
                } else {
                    console.error('[Proc_Menu] Invalid process ID:', idStr);
                }
            });
        }
        
        listContainer.appendChild(li);
    });

    updatePagination(totalPages);
}

// --- 5. Pagination Logic ---
function updatePagination(totalPages) {
    pageIndicator.textContent = `Page ${currentPage}/${totalPages}`;
    prevBtn.disabled = (currentPage === 1);
    nextBtn.disabled = (currentPage === totalPages || totalPages === 0);
}

// --- 6. Search Logic ---
searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase().trim();
    
    if (!keyword) {
        // Nếu search rỗng, reset về dữ liệu gốc
        currentData = [...originalData];
    } else {
        // Filter from originalData, not currentData
        currentData = originalData.filter(item => {
            const name = (item.name || item.processName || '').toLowerCase();
            const pid = item.pid ? item.pid.toString() : '';
            return name.includes(keyword) || pid.includes(keyword);
        });
    }
    currentPage = 1;
    renderData();
});

function resetSearch() {
    searchInput.value = '';
    // Reset về dữ liệu gốc
    currentData = [...originalData];
    currentPage = 1;
    renderData();
}

// --- 7. Toggle Control ---
function controlProcess(id, newStatus, procName) {
    if (!window.gateway || !window.gateway.ws || window.gateway.ws.readyState !== WebSocket.OPEN) {
        console.warn('[Proc_Menu] Gateway not connected');
        alert('Please connect to gateway first');
        return;
    }

    if (!window.gateway.isAuthenticated) {
        console.warn('[Proc_Menu] Gateway not authenticated');
        alert('Please authenticate first');
        return;
    }

    // Ensure id is a number (should be index, not PID)
    const processIndex = typeof id === 'number' ? id : parseInt(id, 10);
    if (isNaN(processIndex) || processIndex < 0) {
        console.error('[Proc_Menu] Invalid process index:', id);
        alert('Invalid process ID');
        return;
    }

    // Find the process in the list to get its PID for logging
    const proc = originalData.find(p => p.id === processIndex);
    const processPid = proc?.pid || 'N/A';

    if (newStatus === 'running') {
        window.gateway.startProcess(processIndex);
        console.log(`[Proc_Menu] Starting process: ${procName} (Index: ${processIndex}, PID: ${processPid})`);
    } else {
        window.gateway.killProcess(processIndex);
        console.log(`[Proc_Menu] Stopping process: ${procName} (Index: ${processIndex}, PID: ${processPid})`);
    }
}

// --- 10. Refresh Process List from Gateway ---
function refreshProcessList() {
    if (!window.gateway) {
        console.warn('[Proc_Menu] Gateway not found - main.js may not be loaded, using mock data');
        originalData = [...mockProcessData];
        currentData = [...mockProcessData];
        currentPage = 1;
        renderData();
        return;
    }
    
    if (!window.gateway.ws || window.gateway.ws.readyState !== WebSocket.OPEN) {
        console.warn('[Proc_Menu] Gateway not connected, using mock data');
        originalData = [...mockProcessData];
        currentData = [...mockProcessData];
        currentPage = 1;
        renderData();
        return;
    }
    
    if (!window.gateway.isAuthenticated) {
        console.warn('[Proc_Menu] Gateway not authenticated, using mock data');
        originalData = [...mockProcessData];
        currentData = [...mockProcessData];
        currentPage = 1;
        renderData();
        return;
    }

    // Fetch process list từ gateway
    console.log('[Proc_Menu] Fetching process list from gateway...');
    window.gateway.fetchProcessList();
    
    // Track initial cache state để detect khi có update
    const initialCacheLength = window.gateway.processListCache?.length || -1;
    let lastCheckedLength = initialCacheLength;
    let hasReceivedResponse = false;
    
    // Poll để check khi processListCache được update (vì gateway không có callback cho PROC_LIST)
    let attempts = 0;
    const maxAttempts = 20; // 20 lần * 300ms = 6 giây timeout
    const pollInterval = setInterval(() => {
        attempts++;
        
        const rawCache = window.gateway.processListCache;
        const currentLength = rawCache?.length || 0;
        
        // Detect nếu cache đã thay đổi (có thể là array rỗng nhưng vẫn là response hợp lệ)
        if (currentLength !== lastCheckedLength || (Array.isArray(rawCache) && attempts > 3)) {
            hasReceivedResponse = true;
            lastCheckedLength = currentLength;
        }
        
        // Debug: log processListCache trực tiếp (chỉ log mỗi 5 lần để không spam)
        if (attempts % 5 === 0 || hasReceivedResponse) {
            console.log(`[Proc_Menu] Poll attempt ${attempts}/${maxAttempts} - processListCache:`, {
                isArray: Array.isArray(rawCache),
                length: currentLength,
                type: typeof rawCache,
                sample: rawCache?.[0] || 'N/A',
                hasReceivedResponse: hasReceivedResponse
            });
        }
        
        const formattedProcs = window.gateway.getFormattedProcessList();
        
        // Nếu đã nhận được response (dù rỗng) hoặc hết thời gian chờ
        if (hasReceivedResponse || attempts >= maxAttempts) {
            clearInterval(pollInterval);
            
            if (formattedProcs && formattedProcs.length > 0) {
                originalData = formattedProcs;
                currentData = [...formattedProcs];
                console.log(`[Proc_Menu] ✓ Loaded ${formattedProcs.length} processes from gateway`);
            } else if (hasReceivedResponse) {
                // Đã nhận được response nhưng là array rỗng - đây là kết quả hợp lệ từ server
                originalData = [];
                currentData = [];
                console.log('[Proc_Menu] Server returned empty process list (no processes found)');
            } else {
                // Chưa nhận được response - timeout
                console.warn('[Proc_Menu] Timeout waiting for process list, using mock data');
                console.warn('[Proc_Menu] Debug info:', {
                    rawCache: rawCache,
                    formattedProcs: formattedProcs,
                    cacheLength: currentLength,
                    formattedLength: formattedProcs?.length || 0,
                    attempts: attempts
                });
                // Nếu timeout, dùng mock data
                originalData = [...mockProcessData];
                currentData = [...mockProcessData];
            }
            currentPage = 1;
            renderData();
        }
    }, 300);
}

// --- 8. Event Listeners ---
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderData(); }
});

nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) { currentPage++; renderData(); }
});

// --- Helper function: Initialize agent target ---
function initAgentTarget(onTargetSet) {
    const urlParams = new URLSearchParams(window.location.search);
    const agentId = urlParams.get('id');
    
    if (agentId) {
        const checkAndSetTarget = () => {
            if (window.gateway && window.gateway.isAuthenticated) {
                // Đợi agents list được load trước
                if (window.gateway.agentsList && window.gateway.agentsList.length > 0) {
                    window.gateway.setTarget(agentId);
                    console.log(`[Proc_Menu] Đã setTarget đến agent: ${agentId}`);
                    // Gọi callback sau khi setTarget xong (để fetch list)
                    if (onTargetSet && typeof onTargetSet === 'function') {
                        onTargetSet();
                    }
                } else {
                    // Nếu agents list chưa có, đợi thêm
                    setTimeout(checkAndSetTarget, 500);
                }
            } else {
                setTimeout(checkAndSetTarget, 500);
            }
        };
        setTimeout(checkAndSetTarget, 1000);
    } else if (onTargetSet && typeof onTargetSet === 'function') {
        // Nếu không có agent ID, vẫn gọi callback để load list
        onTargetSet();
    }
}

// --- 11. Auto-update when processListCache changes ---
let lastProcessListCacheLength = 0;
function checkProcessListUpdate() {
    if (window.gateway && Array.isArray(window.gateway.processListCache)) {
        const currentLength = window.gateway.processListCache.length;
        // Nếu processListCache có thay đổi (thêm mới hoặc thay đổi)
        if (currentLength !== lastProcessListCacheLength && currentLength > 0) {
            lastProcessListCacheLength = currentLength;
            const formattedProcs = window.gateway.getFormattedProcessList();
            if (formattedProcs && formattedProcs.length > 0) {
                originalData = formattedProcs;
                // Giữ nguyên filter nếu đang search
                const searchKeyword = searchInput.value.toLowerCase().trim();
                if (searchKeyword) {
                    currentData = originalData.filter(item => {
                        const name = (item.name || item.processName || '').toLowerCase();
                        const pid = item.pid ? item.pid.toString() : '';
                        return name.includes(searchKeyword) || pid.includes(searchKeyword);
                    });
                } else {
                    currentData = [...formattedProcs];
                }
                // Reset về page 1 nếu current page vượt quá total pages
                const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE) || 1;
                if (currentPage > totalPages) currentPage = 1;
                renderData();
                console.log(`[Proc_Menu] Auto-updated: ${formattedProcs.length} processes`);
            }
        }
    }
}

// Check mỗi 500ms để auto-update
setInterval(checkProcessListUpdate, 500);

// --- 9. Init & Typing Effect ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize agent target and then refresh process list
    initAgentTarget(refreshProcessList);

    // Typing Effect
    const textElement = document.querySelector('.code-text');
    if (textElement) {
        const fullText = "Successful!";
        const typingSpeed = 150;
        let charIndex = 0;
        textElement.textContent = ''; 

        function typeWriter() {
            if (charIndex < fullText.length) {
                textElement.textContent += fullText.charAt(charIndex);
                charIndex++;
                setTimeout(typeWriter, typingSpeed);
            }
        }
        setTimeout(typeWriter, 500);
    }
});

// Export for manual refresh
window.refreshProcessList = refreshProcessList;
window.controlProcess = controlProcess;