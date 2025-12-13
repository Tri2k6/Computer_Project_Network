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


// --- 3. Logic Render dữ liệu (Placeholder cho logic sau này) ---

// Giả lập dữ liệu server trả về từ API/Logic khác
const mockServerData = [
    { ip: "192.168.1.10", port: "8080", status: "online" },
    { ip: "192.168.1.15", port: "3000", status: "busy" },
    { ip: "10.0.0.5", port: "22", status: "online" }
];

// Hàm này sau này bạn sẽ thay bằng logic gọi API thật
function fetchAndRenderServers() {
    // Xóa nội dung cũ (loading...)
    serverListContent.innerHTML = '';

    // Duyệt qua data và tạo phần tử HTML
    mockServerData.forEach(server => {
        const li = document.createElement('li');
        li.className = 'server-item';
        
        // Cấu trúc mỗi dòng server (định nghĩa sẵn template)
        li.innerHTML = `
            <span class="server-ip">IP: ${server.ip}</span>
            <span class="server-port">Port: ${server.port}</span>
            <button class="link-icon">🔗</button>
        `;
        
        serverListContent.appendChild(li);
    });
}