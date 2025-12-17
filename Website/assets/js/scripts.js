// --- 1. Xử lý hiệu ứng dây nối (Line Effect) ---
const connectBtn = document.querySelector('.btn-connect');
const wire = document.querySelector('.wire');

connectBtn.addEventListener('click', () => {
    if (wire) {
        wire.classList.remove('off');
        void wire.offsetWidth;
        wire.classList.add('active');
    }
    // chỉ hiển thị sau khi hết animation
    setTimeout(openServerList, 500);
});

// --- 2. Xử lý Popup Server List ---
const serverOverlay = document.getElementById('server-list-overlay');
const serverListContent = document.getElementById('server-list-content');

// Hàm mở popup
function openServerList() {
    serverOverlay.classList.remove('hidden');
    serverOverlay.classList.add('visible');
    
    // Gọi hàm load dữ liệu (giả lập)
    fetchAndRenderServers();
}

// Hàm đóng popup
function closeServerList() {
    serverOverlay.classList.remove('visible');
    setTimeout(() => {
        serverOverlay.classList.add('hidden');
        if (wire) {
            wire.classList.remove('active');
            void wire.offsetWidth;
            wire.classList.add('off');
        }  
    }, 300); // Ẩn hẳn sau khi hết animation
}

// --- 3. Logic Render dữ liệu & Phân trang ---

// Cấu hình phân trang
const ITEMS_PER_PAGE = 5; // Số server hiển thị trên 1 trang (bạn có thể đổi thành 5 tùy ý)
let currentPage = 1;

// Các phần tử DOM cần thiết cho phân trang
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
const pageIndicator = document.getElementById('page-indicator');

// Giả lập dữ liệu (9 servers -> sẽ chia thành 3 trang nếu mỗi trang 4 dòng)
const mockServerData = [
    { ip: "192.168.1.10", port: "8080", status: "online" },
    { ip: "192.168.1.15", port: "3000", status: "busy" },
    { ip: "10.0.0.5", port: "2200", status: "online" },
    { ip: "192.168.1.20", port: "8080", status: "online" },
    { ip: "192.168.1.25", port: "3000", status: "busy" },
    { ip: "10.0.0.6", port: "22", status: "online" },
    { ip: "192.168.1.30", port: "8080", status: "online" },
    { ip: "192.168.1.35", port: "3000", status: "busy" },
    { ip: "10.0.0.7", port: "22", status: "online" }
];

// Hàm chính: Tính toán và Render theo trang
function reloadServers() {
    currentPage = 1;
    fetchAndRenderServers();
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAndRenderServers() {
    serverListContent.innerHTML = ''; // Xóa list hiện tại ngay khi bắt đầu fetch

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;

    const currentServers = mockServerData.slice(startIndex, endIndex);

    if (currentServers.length === 0) {
        serverListContent.innerHTML = '<li class="server-item">No servers found.</li>';
        updateFooterUI();
        return;
    }

    // Thêm từng item với delay 0.5s
    for (const server of currentServers) {
        const item = createServerItem(server);
        serverListContent.appendChild(item);
        await delay(50);
    }

    updateFooterUI();
}

// Tạo từng phần tử server theo style bạn có
function createServerItem(server) {
    const item = document.createElement('li');  // Thay vì <item>, dùng <li> hợp chuẩn hơn
    item.className = 'server-item';

    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.padding = '12px 5px';
    item.style.borderTop = '1px solid rgba(0, 0, 0, 0.1)';
    item.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';

    item.innerHTML = `
    <span class="server-ip" style="flex: 0 0 55%; font-weight: 500;">
        IP: ${server.ip}
    </span>

    <span class="server-port" style="flex: 0 0 30%; color: #555;">
        Port: ${server.port}
    </span>

    <button class="link-icon"
        onclick="connectToServer('${server.ip}', ${server.port})"
        style="
            background: none;
            border: none;
            padding: 0;
            margin-left: auto;
            cursor: pointer;
            appearance: none;
            -webkit-appearance: none;
            outline: none;">
        <img src="./assets/images/link.png" width="34px" height="34px" style="display: block;">
    </button>
    `;
    return item;
}

function connectToServer(ip, port) {
    // viết logic để kết nối tới server ở đây
    window.location.href = 'feature_menu.html';
}

// Hàm phụ: Cập nhật Footer (Số trang, ẩn hiện nút Next/Prev)
function updateFooterUI() {
    const totalPages = Math.ceil(mockServerData.length / ITEMS_PER_PAGE);
    
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

// --- 4. Sự kiện chuyển trang ---

// Nút lùi
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        fetchAndRenderServers();
    }
});

// Nút tiến
nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(mockServerData.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        fetchAndRenderServers();
    }
});

// --- 5. Sự kiện mở menu ---

document.addEventListener('DOMContentLoaded', () => {
    const goMenuBtn = document.getElementById('link-icon');
    if (goMenuBtn) {
        goMenuBtn.addEventListener('click', () => {
            window.location.href = 'menu.html';
        });
    }
});
