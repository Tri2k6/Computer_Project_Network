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
let currentData = [...mockProcessData];

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
    currentData = mockProcessData.filter(item => 
        item.name.toLowerCase().includes(keyword) || 
        item.pid.toString().includes(keyword)
    );
    currentPage = 1;
    renderData();
});

function resetSearch() {
    searchInput.value = '';
    currentData = [...mockProcessData];
    currentPage = 1;
    renderData();
}

// --- 7. Toggle Control ---
function controlProcess(id, newStatus, procName) {
    const index = mockProcessData.findIndex(p => p.id === id);
    if (index !== -1 && mockProcessData[index].status !== newStatus) {
        mockProcessData[index].status = newStatus;
        
        // Update mảng search nếu cần
        const searchIndex = currentData.findIndex(p => p.id === id);
        if (searchIndex !== -1) currentData[searchIndex].status = newStatus;

        console.log(`[Message Sent] Target: ${procName} | Command: ${newStatus.toUpperCase()}`);
        renderData();
    }
}

// --- 8. Event Listeners ---
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderData(); }
});

nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) { currentPage++; renderData(); }
});

// --- 9. Init & Typing Effect ---
document.addEventListener('DOMContentLoaded', () => {
    renderData();

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