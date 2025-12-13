// --- 1. Xử lý hiệu ứng dây nối (Line Effect) ---
const connectBtn = document.querySelector('.btn-connect');
const connectionLine = document.querySelector('.connection-line'); // Thẻ SVG dây

// Khi chuột vào nút -> Dây chuyển xanh
connectBtn.addEventListener('mouseenter', () => {
    if(connectionLine) connectionLine.classList.add('line-active');
});

// Khi chuột ra khỏi nút -> Dây về màu gốc
connectBtn.addEventListener('mouseleave', () => {
    if(connectionLine) connectionLine.classList.remove('line-active');
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
        serverOverlay.classList.add('hidden'); // Ẩn hẳn sau khi hết animation
    }, 300);
}

// Gán sự kiện click cho nút Connect
connectBtn.addEventListener('click', openServerList);

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
function fetchAndRenderServers() {
    // 1. Tính toán vị trí cắt dữ liệu
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    
    // Lấy danh sách server thuộc trang hiện tại
    const currentServers = mockServerData.slice(startIndex, endIndex);
    
    // 2. Render ra màn hình
    renderList(currentServers);

    // 3. Cập nhật trạng thái nút và số trang
    updateFooterUI();
}

function renderList(servers) {
    serverListContent.innerHTML = ''; 

    if (servers.length === 0) {
        serverListContent.innerHTML = '<li class="server-item">No servers found.</li>';
        return;
    }

    servers.forEach((server, index) => {
        const li = document.createElement('li');
        li.className = 'server-item';

        // 1. Cấu hình Flexbox cho dòng (Lưu ý: Bỏ justify-content: space-between)
        li.style.display = 'flex';
        li.style.alignItems = 'center'; // Căn giữa theo chiều dọc
        li.style.padding = '12px 5px';
        
        // Thêm đường gạch dưới (code cũ)
        if (index < servers.length - 1) {
            li.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
        }

        li.innerHTML = `
            <span class="server-ip" style="flex: 0 0 55%; font-weight: 500;">
                IP: ${server.ip}
            </span>

            <span class="server-port" style="flex: 0 0 30%; color: #555;">
                Port: ${server.port}
            </span>

            <button class="link-icon" style="margin-left: auto; border: none; background: transparent; cursor: pointer; padding: 0;">
                <img src="./assets/images/link.png" width="20px" height="20px" style="display: block;">
            </button>
        `;
        
        serverListContent.appendChild(li);
    });
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

// Reset về trang 1 khi mở popup (Optional)
// Bạn thêm dòng này vào bên trong hàm openServerList() ở phần 2:
// currentPage = 1;