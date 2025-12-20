import * as Logic from './logic.js';

// ================== BACK TO MENU ==================

document.addEventListener('DOMContentLoaded', () => {
    const returnBtn = document.getElementById('return-btn');
    const clearBtn = document.getElementById('clear-btn');

    if (!returnBtn) {
        console.warn('[App_Menu] return-btn not found');
        return;
    }
    if (!clearBtn) {
        console.warn('[App_Menu] clear-btn not found');
        return;
    }

    returnBtn.addEventListener('click', () => {
        window.location.href = './Feature_menu.html';
    });

    clearBtn.addEventListener('click', () => {
        resetSearch();
    });
});

function resetSearch() {
    searchInput.value = '';
    // Reset về dữ liệu gốc
    currentData = [...originalData];
    currentPage = 1;
    renderData();
}

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
async function renderData() {
    listContainer.innerHTML = ''; 

    const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE) || 1;
    
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const itemsToShow = currentData.slice(startIndex, endIndex);

    if (itemsToShow.length === 0) {
        listContainer.innerHTML = '<li class="process-item empty">No app found.</li>';
        updatePagination(0);
        return;
    }

    // Luôn sử dụng currentData đã được filter/paginate
    for (let idx = 0; idx < itemsToShow.length; idx++) {
        const app = itemsToShow[idx];

        const li = document.createElement('li');
        li.className = 'process-item';

        const playSrc = './assets/images/start.png';
        const pauseSrc = './assets/images/pause.png';

        // ===================== APP ID =====================
        let appId = startIndex + idx; // default index hiện tại (0-based)
        if (app.id !== undefined && app.id !== null) {
            const numId = typeof app.id === 'number' ? app.id : parseInt(app.id, 10);
            if (!isNaN(numId) && numId >= 0) {
                appId = numId;
            }
        }

        // ===================== APP NAME =====================
        const appName = app.name || app.appName || 'Unknown App';

        const escapedAppName = appName
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        // ===================== STATUS =====================
        const startClass = app.status === 'running' ? 'active' : 'inactive';
        const pauseClass = app.status === 'paused' ? 'active' : 'inactive';

        li.innerHTML = `
            <div class="proc-left">
                <span class="proc-name">${escapedAppName}</span>
            </div>

            <div class="proc-actions">
                <button class="action-btn ${startClass}"
                    data-app-id="${appId}"
                    data-action="start"
                    data-app-name="${escapedAppName}"
                    title="Start ${escapedAppName}">
                    <img src="${playSrc}" alt="Start" width="28" height="28">
                </button>

                <button class="action-btn ${pauseClass}"
                    data-app-id="${appId}"
                    data-action="stop"
                    data-app-name="${escapedAppName}"
                    title="Stop ${escapedAppName}">
                    <img src="${pauseSrc}" alt="Stop" width="28" height="28">
                </button>
            </div>
        `;

        // ===================== EVENTS =====================
        const startBtn = li.querySelector('[data-action="start"]');
        const stopBtn = li.querySelector('[data-action="stop"]');

        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const id = parseInt(startBtn.dataset.appId, 10);
                const name = startBtn.dataset.appName;
                if (!isNaN(id) && id >= 0) {
                    controlApp(id, 'start', name);
                } else {
                    console.error('[App_Menu] Invalid app ID:', startBtn.dataset.appId);
                }
            });
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                const id = parseInt(stopBtn.dataset.appId, 10);
                const name = stopBtn.dataset.appName;
                if (!isNaN(id) && id >= 0) {
                    controlApp(id, 'stop', name);
                } else {
                    console.error('[App_Menu] Invalid app ID:', stopBtn.dataset.appId);
                }
            });
        }

        listContainer.appendChild(li);
        await delay(50);
    }

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

// --- 7. Toggle Control ---
function controlApp(id, action, appName) {
    let success = false;
    
    if (action === 'start') {
        success = Logic.startApp(id);
        if (success) {
            console.log(`[App_Menu] Starting app: ${appName} (ID: ${id})`);
            typeEffect('Starting app...')
        }
    } else if (action === 'stop') {
        success = Logic.stopApp(id);
        if (success) {
            console.log(`[App_Menu] Stopping app: ${appName} (ID: ${id})`);
            typeEffect('Stopping app...')
        }
    } else {
        console.warn(`[App_Menu] Unknown action: ${action}`);
        return;
    }

    if (!success) {
        alert('Không thể thực hiện thao tác. Vui lòng kiểm tra kết nối.');
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
async function refreshAppList(isInitialLoad = false) {
    // Sử dụng logic.js để fetch dữ liệu
    typeEffect('Loading list...');
    const apps = await Logic.fetchAppList(isInitialLoad);
    
    console.log('[App_Menu] refreshAppList result:', {
        apps: apps,
        isNull: apps === null,
        isArray: Array.isArray(apps),
        length: apps?.length || 0,
        cacheLength: window.gateway?.appListCache?.length || 0
    });
    
    if (apps !== null && apps !== undefined) {
        // Có dữ liệu từ gateway (có thể là empty array hoặc có data)
        originalData = apps;
        currentData = [...apps];
        console.log(`[App_Menu] ✓ Loaded ${apps.length} apps from gateway`);
        typeEffect('Done!');
        
        // Nếu là initial load và apps rỗng, đợi thêm một chút để check lại
        if (isInitialLoad && apps.length === 0) {
            console.log('[App_Menu] Initial load returned empty, waiting a bit more...');
            setTimeout(async () => {
                const retryApps = await Logic.fetchAppList(false); // Retry with shorter timeout
                if (retryApps && retryApps.length > 0) {
                    originalData = retryApps;
                    currentData = [...retryApps];
                    console.log(`[App_Menu] ✓ Retry loaded ${retryApps.length} apps`);
                    currentPage = 1;
                    renderData();
                    return;
                }
            }, 1000);
        }
    } else {
        // Fallback về mock data nếu không có kết nối
        console.warn('[App_Menu] Gateway not available, using mock data');
        originalData = [...mockProcessData];
        currentData = [...mockProcessData];
    }
    
    currentPage = 1;
    renderData();
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
    Logic.initAgentTargetFromURL(onTargetSet);
}

// --- 11. Auto-update when appListCache changes ---
let lastAppListCacheLength = 0;
function checkAppListUpdate() {
    const formattedApps = Logic.checkAppListUpdate();
    if (formattedApps && formattedApps.length > 0) {
        const currentLength = formattedApps.length;
        // Nếu appListCache có thay đổi (thêm mới hoặc thay đổi)
        if (currentLength !== lastAppListCacheLength) {
            lastAppListCacheLength = currentLength;
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

// Check mỗi 300ms để auto-update (faster response)
setInterval(checkAppListUpdate, 300);

// --- 9. Init & Typing Effect ---
document.addEventListener('DOMContentLoaded', () => {
    // Wait for gateway to be ready, then initialize and load data
    const waitForGatewayAndLoad = () => {
        if (window.gateway && window.gateway.isAuthenticated) {
            // Initialize agent target and then refresh app list
            initAgentTarget(() => {
                // Always refresh app list after target is set (or if no target)
                // Use longer timeout for initial load when switching tabs
                setTimeout(() => {
                    refreshAppList(true); // Pass true for initial load
                }, 200);
            });
        } else {
            // Retry after 200ms if gateway not ready (faster check)
            setTimeout(waitForGatewayAndLoad, 200);
        }
    };
    
    // Start waiting for gateway
    waitForGatewayAndLoad();

    // Typing Effect
    if (screenText) {
        typeEffect('Successful');
    }
});

// Export for manual refresh
window.refreshAppList = refreshAppList;
window.controlApp = controlApp;

// hiệu ứng gõ chữ và delay khi refresh (cho đẹp)
const screenText = document.querySelector('.code-text');
let typingInterval;

function typeEffect(text) {
    if (!screenText) return;
    
    screenText.classList.add('typing-effect');
    screenText.style.width = 'auto';

    clearInterval(typingInterval);
    screenText.textContent = "";

    let i = 0;
    const speed = 50;

    typingInterval = setInterval(() => {
        if (i < text.length) {
            screenText.textContent += text.charAt(i);
            i++;
        } else {
            clearInterval(typingInterval);
        }
    }, speed);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


