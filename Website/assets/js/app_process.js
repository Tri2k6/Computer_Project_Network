// Lấy tham số từ URL
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode'); // "app" hoặc "process"

// --- 1. Logic Render dữ liệu & Phân trang ---
const exeListContent = document.getElementById('exe-list-content');

// Cấu hình phân trang
const ITEMS_PER_PAGE = 5; // Số exe hiển thị trên 1 trang (bạn có thể đổi thành 5 tùy ý)
let currentPage = 1;

// Các phần tử DOM cần thiết cho phân trang
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
const pageIndicator = document.getElementById('page-indicator');
const searchInput = document.getElementById('search-input');

// Giả lập dữ liệu
const mockExeData = [
    { name: "Discord", pid: "123123" },
    { name: "Discord", pid: "123123" },
    { name: "Discord", pid: "123123" },
    { name: "Discord", pid: "123123" },
    { name: "Discord", pid: "123123" },
    { name: "Discord", pid: "123123" },
    { name: "Discord", pid: "123123" },
    { name: "Discord", pid: "123123" }
];

// Hàm chính: Tính toán và Render theo trang
function reloadExes() {
    currentPage = 1;
    fetchAndRenderExes();
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAndRenderExes() {
    exeListContent.innerHTML = ''; // Xóa list hiện tại ngay khi bắt đầu fetch

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    const currentExes = mockExeData.slice(startIndex, endIndex);

    if (currentExes.length === 0) {
        exeListContent.innerHTML = '<li class="exe-item">No exes found.</li>';
        updateFooterUI();
        return;
    }

    // Thêm từng item với delay 0.5s
    for (const exe of currentExes) {
        const item = createExeItem(exe);
        exeListContent.appendChild(item);
        await delay(50);
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

    item.innerHTML = `
    <span class="exe-ip" style="flex: 0 0 55%; font-weight: 500;">
        IP: ${exe.name}
    </span>

    <span class="exe-port" style="flex: 0 0 30%; color: #555;">
        Port: ${exe.pid}
    </span>

    <button class="start-icon"
        onclick="startExe('${exe.name}', ${exe.pid})"
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
        onclick="stopExe('${exe.name}', ${exe.pid})"
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
    if (mode === 'app') {
        // Xử lý cho App
        typeEffect('Starting app...');
    
    } else if (mode === 'process') {
        // Xử lý cho Process
        typeEffect('Starting process...');
        
    }
}

function stopExe(name, pid) {
    if (mode === 'app') {
        // Xử lý cho App
        typeEffect('Stopping app...');
    
    } else if (mode === 'process') {
        // Xử lý cho Process
        typeEffect('Stopping process...');
        
    }
}

// Hàm phụ: Cập nhật Footer (Số trang, ẩn hiện nút Next/Prev)
function updateFooterUI() {
    const totalPages = Math.ceil(mockExeData.length / ITEMS_PER_PAGE);
    
    // Cập nhật text "Page 1/3"
    pageIndicator.textContent = `Page ${currentPage}/${totalPages}`;

    // Xử lý nút Prev (ẩn nếu ở trang 1)
    if (currentPage === 1) {
        prevBtn.disabled = true;
        prevBtn.style.opacity = '0.5'; // Làm mờ
    } else {
        prevBtn.disabled = false;
        prevBtn.style.opacity = '1';
    }

    // Xử lý nút Next (ẩn nếu ở trang cuối)
    if (currentPage === totalPages) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.5'; // Làm mờ
    } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
    }
}

// --- 2. Sự kiện chuyển trang ---

// Nút lùi
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        fetchAndRenderExes();
    }
});

// Nút tiến
nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(mockExeData.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        fetchAndRenderExes();
    }
});

// --- 3. Sự kiện mở menu ---

document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderExes();

    const startBtn = document.getElementById('link-icon');
    if (goMenuBtn) {
        goMenuBtn.addEventListener('click', () => {
            window.location.href = 'feature_menu.html';
        });
    }
});

// --- 4. Dòng chữ trên laptop ---

const screenText = document.querySelector('.screen-text');
const defaultText = "What to do?";
let typingInterval;

typeEffect(defaultText);

function typeEffect(text) {
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
    window.location.href = 'feature_menu.html';
}