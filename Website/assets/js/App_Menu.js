// --- 1. Dữ liệu ---
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
        listContainer.innerHTML = '<li style="text-align:center; padding:20px; color:#555;">No app found.</li>';
        updatePagination(0);
        return;
    }

    // Luôn sử dụng currentData đã được filter/paginate
    itemsToShow.forEach((app, idx) => {
        const li = document.createElement('li');
        li.className = 'process-item';

        // Đường dẫn ảnh
        const playSrc = './assets/images/start.png'; 
        const pauseSrc = './assets/images/pause.png';

        // Lấy app ID (ưu tiên app.id, sau đó là index trong danh sách hiện tại)
        // Ensure appId is always a number (server uses 0-based index)
        let appId = startIndex + idx; // Default to index in current page
        if (app.id !== undefined && app.id !== null) {
            const numId = typeof app.id === 'number' ? app.id : parseInt(app.id, 10);
            if (!isNaN(numId) && numId >= 0) {
                appId = numId;
            }
        }
        const appName = app.name || app.appName || 'Unknown App';
        
        // Escape appName cho HTML display
        const escapedAppName = appName.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

        // Logic Toggle Class - dựa trên status
        const startClass = app.status === 'running' ? 'active' : 'inactive';
        const pauseClass = app.status === 'paused' ? 'active' : 'inactive';

        li.innerHTML = `
            <div class="proc-left">
                <span class="proc-name">${escapedAppName}</span>
            </div>

            <div class="proc-actions">
                <button class="action-btn ${startClass}" data-app-id="${appId}" data-action="start" data-app-name="${escapedAppName}" title="Start ${escapedAppName}">
                    <img src="${playSrc}" alt="Start" width="24" height="24">
                </button>
                <button class="action-btn ${pauseClass}" data-app-id="${appId}" data-action="stop" data-app-name="${escapedAppName}" title="Stop ${escapedAppName}">
                    <img src="${pauseSrc}" alt="Stop" width="24" height="24">
                </button>
            </div>
        `;
        
        // Add event listeners instead of inline onclick
        const startBtn = li.querySelector('[data-action="start"]');
        const stopBtn = li.querySelector('[data-action="stop"]');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const idStr = startBtn.getAttribute('data-app-id');
                const id = parseInt(idStr, 10);
                const name = startBtn.getAttribute('data-app-name');
                if (!isNaN(id) && id >= 0) {
                    controlApp(id, 'start', name);
                } else {
                    console.error('[App_Menu] Invalid app ID:', idStr);
                }
            });
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                const idStr = stopBtn.getAttribute('data-app-id');
                const id = parseInt(idStr, 10);
                const name = stopBtn.getAttribute('data-app-name');
                if (!isNaN(id) && id >= 0) {
                    controlApp(id, 'stop', name);
                } else {
                    console.error('[App_Menu] Invalid app ID:', idStr);
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
            const name = (item.name || item.appName || '').toLowerCase();
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
function controlApp(id, action, appName) {
    if (!window.gateway || !window.gateway.ws || window.gateway.ws.readyState !== WebSocket.OPEN) {
        console.warn('[App_Menu] Gateway not connected');
        alert('Please connect to gateway first');
        return;
    }

    if (!window.gateway.isAuthenticated) {
        console.warn('[App_Menu] Gateway not authenticated');
        alert('Please authenticate first');
        return;
    }

    if (action === 'start') {
        window.gateway.startApp(id);
        console.log(`[App_Menu] Starting app: ${appName} (ID: ${id})`);
    } else if (action === 'stop') {
        window.gateway.killApp(id);
        console.log(`[App_Menu] Stopping app: ${appName} (ID: ${id})`);
    } else {
        console.warn(`[App_Menu] Unknown action: ${action}`);
        return;
    }

    // Refresh list after a short delay to show updated status
    setTimeout(() => {
        refreshAppList();
    }, 1000);
}

// Alias for backward compatibility
window.controlProcess = controlApp;

// --- 10. Refresh App List from Gateway ---
function refreshAppList() {
    if (!window.gateway) {
        console.warn('[App_Menu] Gateway not found - main.js may not be loaded, using mock data');
        originalData = [...mockProcessData];
        currentData = [...mockProcessData];
        currentPage = 1;
        renderData();
        return;
    }
    
    if (!window.gateway.ws || window.gateway.ws.readyState !== WebSocket.OPEN) {
        console.warn('[App_Menu] Gateway not connected, using mock data');
        originalData = [...mockProcessData];
        currentData = [...mockProcessData];
        currentPage = 1;
        renderData();
        return;
    }
    
    if (!window.gateway.isAuthenticated) {
        console.warn('[App_Menu] Gateway not authenticated, using mock data');
        originalData = [...mockProcessData];
        currentData = [...mockProcessData];
        currentPage = 1;
        renderData();
        return;
    }

    // Fetch app list từ gateway
    console.log('[App_Menu] Fetching app list from gateway...');
    window.gateway.fetchAppList();
    
    // Track initial cache state để detect khi có update
    const initialCacheLength = window.gateway.appListCache?.length || -1;
    let lastCheckedLength = initialCacheLength;
    let hasReceivedResponse = false;
    
    // Poll để check khi appListCache được update (vì gateway không có callback cho APP_LIST)
    let attempts = 0;
    const maxAttempts = 20; // 20 lần * 300ms = 6 giây timeout
    const pollInterval = setInterval(() => {
        attempts++;
        
        const rawCache = window.gateway.appListCache;
        const currentLength = rawCache?.length || 0;
        
        // Detect nếu cache đã thay đổi (có thể là array rỗng nhưng vẫn là response hợp lệ)
        if (currentLength !== lastCheckedLength || (Array.isArray(rawCache) && attempts > 3)) {
            hasReceivedResponse = true;
            lastCheckedLength = currentLength;
        }
        
        // Debug: log appListCache trực tiếp (chỉ log mỗi 5 lần để không spam)
        if (attempts % 5 === 0 || hasReceivedResponse) {
            console.log(`[App_Menu] Poll attempt ${attempts}/${maxAttempts} - appListCache:`, {
                isArray: Array.isArray(rawCache),
                length: currentLength,
                type: typeof rawCache,
                sample: rawCache?.[0] || 'N/A',
                hasReceivedResponse: hasReceivedResponse
            });
        }
        
        const formattedApps = window.gateway.getFormattedAppList();
        
        // Nếu đã nhận được response (dù rỗng) hoặc hết thời gian chờ
        if (hasReceivedResponse || attempts >= maxAttempts) {
            clearInterval(pollInterval);
            
            if (formattedApps && formattedApps.length > 0) {
                originalData = formattedApps;
                currentData = [...formattedApps];
                console.log(`[App_Menu] ✓ Loaded ${formattedApps.length} apps from gateway`);
            } else if (hasReceivedResponse) {
                // Đã nhận được response nhưng là array rỗng - đây là kết quả hợp lệ từ server
                originalData = [];
                currentData = [];
                console.log('[App_Menu] Server returned empty app list (no apps found)');
            } else {
                // Chưa nhận được response - timeout
                console.warn('[App_Menu] Timeout waiting for app list, using mock data');
                console.warn('[App_Menu] Debug info:', {
                    rawCache: rawCache,
                    formattedApps: formattedApps,
                    cacheLength: currentLength,
                    formattedLength: formattedApps?.length || 0,
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
                    console.log(`[App_Menu] Đã setTarget đến agent: ${agentId}`);
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

// --- 11. Auto-update when appListCache changes ---
let lastAppListCacheLength = 0;
function checkAppListUpdate() {
    if (window.gateway && Array.isArray(window.gateway.appListCache)) {
        const currentLength = window.gateway.appListCache.length;
        // Nếu appListCache có thay đổi (thêm mới hoặc thay đổi)
        if (currentLength !== lastAppListCacheLength && currentLength > 0) {
            lastAppListCacheLength = currentLength;
            const formattedApps = window.gateway.getFormattedAppList();
            if (formattedApps && formattedApps.length > 0) {
                originalData = formattedApps;
                // Giữ nguyên filter nếu đang search
                const searchKeyword = searchInput.value.toLowerCase().trim();
                if (searchKeyword) {
                    currentData = originalData.filter(item => {
                        const name = (item.name || item.appName || '').toLowerCase();
                        const pid = item.pid ? item.pid.toString() : '';
                        return name.includes(searchKeyword) || pid.includes(searchKeyword);
                    });
                } else {
                    currentData = [...formattedApps];
                }
                // Reset về page 1 nếu current page vượt quá total pages
                const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE) || 1;
                if (currentPage > totalPages) currentPage = 1;
                renderData();
                console.log(`[App_Menu] Auto-updated: ${formattedApps.length} apps`);
            }
        }
    }
}

// Check mỗi 500ms để auto-update
setInterval(checkAppListUpdate, 500);

// --- 9. Init & Typing Effect ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize agent target and then refresh app list
    initAgentTarget(refreshAppList);

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
window.refreshAppList = refreshAppList;
window.controlApp = controlApp;