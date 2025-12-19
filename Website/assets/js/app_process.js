
import * as Logic from './logic.js';

// Global variables
let exeListContent;
let prevBtn;
let nextBtn;
let pageIndicator;
let searchInput;
let screenText;
let typingInterval;
let exeData = [];
let currentPage = 1;
let mode;
const ITEMS_PER_PAGE = 5;
const defaultText = "What to do?";

// Hàm chính: Tính toán và Render theo trang
function reloadExes() {
    currentPage = 1;
    fetchAndRenderExes();
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAndRenderExes(isInitialLoad = false) {
    if (!exeListContent) return;
    exeListContent.innerHTML = '<li class="exe-item">Loading...</li>';

    // Fetch data from gateway based on mode
    let data = null;
    if (mode === 'app') {
        data = await Logic.fetchAppList(isInitialLoad);
        if (data) {
            exeData = data.map((app, idx) => ({
                name: app.name || 'Unknown',
                pid: app.id || idx,
                id: app.id || idx
            }));
        }
    } else if (mode === 'process') {
        data = await Logic.fetchProcessList(isInitialLoad);
        if (data) {
            exeData = data.map((proc, idx) => ({
                name: proc.name || 'Unknown',
                pid: proc.pid || proc.id || idx,
                id: proc.id || idx
            }));
        }
    }

    if (!data || exeData.length === 0) {
        exeListContent.innerHTML = '<li class="exe-item">No items found.</li>';
        updateFooterUI();
        return;
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentExes = exeData.slice(startIndex, endIndex);

    exeListContent.innerHTML = '';

    // Render all items at once for faster display (removed delay)
    for (const exe of currentExes) {
        const item = createExeItem(exe);
        exeListContent.appendChild(item);
    }

    updateFooterUI();
}

// Tạo từng phần tử exe theo style bạn có
function createExeItem(exe) {
    const item = document.createElement('li');  // Thay vì <item>, dùng <li> hợp chuẩn hơn
    item.className = 'exe-item';

    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.padding = '12px 5px';
    item.style.borderTop = '1px solid rgba(0, 0, 0, 0.1)';
    item.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';

    const escapedName = exe.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const displayLabel = mode === 'process' ? 'PID' : 'ID';
    const displayValue = mode === 'process' ? (exe.pid || exe.id) : exe.id;
    
    item.innerHTML = `
    <span class="exe-ip" style="flex: 0 0 55%; font-weight: 500;">
        ${escapedName}
    </span>

    <span class="exe-port" style="flex: 0 0 30%; color: #555;">
        ${displayLabel}: ${displayValue}
    </span>

    <button class="start-icon"
        onclick="window.startExe('${escapedName}', ${exe.id})"
        style="
            background: none;
            border: none;
            padding: 0;
            margin-left: auto;
            cursor: pointer;
            appearance: none;
            -webkit-appearance: none;
            outline: none;">
        <img src="./assets/images/start.png" width="34px" height="34px" style="display: block;">
    </button>

    <button class="pause-icon"
        onclick="window.stopExe('${escapedName}', ${exe.id})"
        style="
            background: none;
            border: none;
            padding: 0;
            margin-left: auto;
            cursor: pointer;
            appearance: none;
            -webkit-appearance: none;
            outline: none;">
        <img src="./assets/images/pause.png" width="34px" height="34px" style="display: block;">
    </button>
    `;
    return item;
}

function startExe(name, pid) {
    let success = false;
    if (mode === 'app') {
        // Xử lý cho App - sử dụng logic.js
        const appId = parseInt(pid, 10);
        if (!isNaN(appId)) {
            success = Logic.startApp(appId);
            typeEffect(success ? 'Starting app...' : 'Failed to start app');
        }
    } else if (mode === 'process') {
        // Xử lý cho Process - sử dụng logic.js
        const processId = parseInt(pid, 10);
        if (!isNaN(processId)) {
            success = Logic.startProcess(processId);
            typeEffect(success ? 'Starting process...' : 'Failed to start process');
        }
    }
}

function stopExe(name, pid) {
    let success = false;
    if (mode === 'app') {
        // Xử lý cho App - sử dụng logic.js
        const appId = parseInt(pid, 10);
        if (!isNaN(appId)) {
            success = Logic.stopApp(appId);
            typeEffect(success ? 'Stopping app...' : 'Failed to stop app');
        }
    } else if (mode === 'process') {
        // Xử lý cho Process - sử dụng logic.js
        const processId = parseInt(pid, 10);
        if (!isNaN(processId)) {
            success = Logic.killProcess(processId);
            typeEffect(success ? 'Stopping process...' : 'Failed to stop process');
        }
    }
}

// Hàm phụ: Cập nhật Footer (Số trang, ẩn hiện nút Next/Prev)
function updateFooterUI() {
    if (!pageIndicator || !prevBtn || !nextBtn) return;
    
    const totalPages = Math.ceil(exeData.length / ITEMS_PER_PAGE) || 1;
    
    // Cập nhật text "Page 1/3"
    pageIndicator.textContent = `Page ${currentPage}/${totalPages}`;

    // Xử lý nút Prev (ẩn nếu ở trang 1)
    if (currentPage === 1) {
        prevBtn.disabled = true;
        prevBtn.style.opacity = '0.5';
    } else {
        prevBtn.disabled = false;
        prevBtn.style.opacity = '1';
    }

    // Xử lý nút Next (ẩn nếu ở trang cuối)
    if (currentPage === totalPages) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.5';
    } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
    }
}

// --- Initialize on page load ---

document.addEventListener('DOMContentLoaded', () => {
    // Get mode from URL
    const urlParams = new URLSearchParams(window.location.search);
    mode = urlParams.get('mode'); // "app" hoặc "process"

    // Initialize DOM elements
    exeListContent = document.getElementById('exe-list-content');
    prevBtn = document.querySelector('.prev-btn');
    nextBtn = document.querySelector('.next-btn');
    pageIndicator = document.getElementById('page-indicator');
    searchInput = document.getElementById('search-input');
    screenText = document.querySelector('.screen-text');

    // Initialize typing effect
    typeEffect(defaultText);

    // Setup pagination buttons
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                fetchAndRenderExes();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(exeData.length / ITEMS_PER_PAGE) || 1;
            if (currentPage < totalPages) {
                currentPage++;
                fetchAndRenderExes();
            }
        });
    }

    // Wait for gateway to be ready, then initialize and load data
    const waitForGatewayAndLoad = () => {
        if (window.gateway && window.gateway.isAuthenticated) {
            // Initialize agent target from URL
            Logic.initAgentTargetFromURL(() => {
                // Fetch and render data after target is set (or if no target)
                // Use longer timeout for initial load when switching tabs
                setTimeout(() => {
                    fetchAndRenderExes(true); // Pass true for initial load
                }, 200);
            });
        } else {
            // Retry after 200ms if gateway not ready (faster check)
            setTimeout(waitForGatewayAndLoad, 200);
        }
    };
    
    // Start waiting for gateway
    waitForGatewayAndLoad();

    // Export functions to window for HTML onclick
    window.reloadExes = reloadExes;
    window.backToMenu = backToMenu;
    window.startExe = startExe;
    window.stopExe = stopExe;
});

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

// ================== BACK TO MENU ==================

function backToMenu() {
    window.location.href = 'Feature_menu.html';
}