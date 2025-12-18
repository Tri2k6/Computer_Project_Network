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
        listContainer.innerHTML = '<li style="text-align:center; padding:20px; color:#555;">No app found.</li>';
        updatePagination(0);
        return;
    }

    itemsToShow.forEach((proc) => {
        const li = document.createElement('li');
        li.className = 'process-item';
        
        // Đường dẫn ảnh
        const playSrc = './assets/images/start.png'; 
        const pauseSrc = './assets/images/pause.png';

        // Logic Toggle Class
        const startClass = proc.status === 'running' ? 'active' : 'inactive';
        const pauseClass = proc.status === 'paused' ? 'active' : 'inactive';

        li.innerHTML = `
            <div class="proc-left">
                <span class="bullet">${proc.id}.</span> 
                <span class="proc-name">${proc.name}</span>
            </div>
            
            <span class="proc-pid">PID: ${proc.pid}</span>

            <div class="proc-actions">
                <button class="action-btn ${startClass}" onclick="controlProcess(${proc.id}, 'running', '${proc.name}')">
                    <img src="${playSrc}" alt="Start" width="24" height="24">
                </button>
                <button class="action-btn ${pauseClass}" onclick="controlProcess(${proc.id}, 'paused', '${proc.name}')">
                    <img src="${pauseSrc}" alt="Stop" width="24" height="24">
                </button>
            </div>
        `;
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
    const keyword = e.target.value.toLowerCase();
    // Filter from originalData, not currentData
    currentData = originalData.filter(item => 
        item.name.toLowerCase().includes(keyword) || 
        (item.pid && item.pid.toString().includes(keyword))
    );
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

    if (newStatus === 'running') {
        window.gateway.startProcess(id);
    } else {
        window.gateway.killProcess(id);
    }

    console.log(`[Message Sent] Target: ${procName} | Command: ${newStatus.toUpperCase()}`);
}

// --- 10. Refresh Process List from Gateway ---
function refreshProcessList() {
    if (!window.gateway || !window.gateway.ws || window.gateway.ws.readyState !== WebSocket.OPEN) {
        console.warn('[Proc_Menu] Gateway not connected, using mock data');
        originalData = [...mockProcessData];
        currentData = [...mockProcessData];
        currentPage = 1;
        renderData();
        return;
    }

    window.gateway.fetchProcessList();
    
    setTimeout(() => {
        const formattedProcs = window.gateway.getFormattedProcessList();
        if (formattedProcs && formattedProcs.length > 0) {
            originalData = formattedProcs;
            currentData = [...formattedProcs];
        } else {
            originalData = [...mockProcessData];
            currentData = [...mockProcessData];
        }
        currentPage = 1;
        renderData();
    }, 500);
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