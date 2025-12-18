// 
// const connectBtn = document.querySelector('.btn-connect');
// const wire = document.querySelector('.wire'); // SVG dây

// // Khi chuột vào nút -> Dây sáng
// connectBtn.addEventListener('mouseenter', () => {
//     // if (connectionLine) connectionLine.classList.add('active');
// });

// // Khi chuột ra khỏi nút -> Dây về màu gốc
// connectBtn.addEventListener('mouseleave', () => {
//     // if (connectionLine) connectionLine.classList.remove('active');
// });

// --- 1. Xử lý hiệu ứng dây nối (Line Effect) ---
const connectBtn = document.querySelector('.btn-connect');
const wire = document.querySelector('.wire');

connectBtn.addEventListener('click', async () => {
    if (wire) {
        wire.classList.remove('off');
        void wire.offsetWidth;
        wire.classList.add('active');
    }
    
    // Xử lý logic kết nối và lấy agent list
    await handleConnectAndFetchAgents();
    
    // chỉ hiển thị sau khi hết animation
    setTimeout(() => {
        openServerList();
        // Sau khi mở overlay, thử fetch lại agent list nếu đã kết nối
        if (typeof window.gateway !== 'undefined') {
            const gateway = window.gateway;
            if (gateway.ws && gateway.ws.readyState === WebSocket.OPEN && gateway.isAuthenticated) {
                console.log('[Connect] Đã kết nối, đang refresh agent list...');
                gateway.refreshAgents();
            }
        }
    }, 500);
});

// --- 2. Xử lý Popup Server List ---
const serverOverlay = document.getElementById('server-list-overlay');
const serverListContent = document.getElementById('server-list-content');

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
const ITEMS_PER_PAGE = 5; // Số agent hiển thị trên 1 trang
let currentPage = 1;

// Các phần tử DOM cần thiết cho phân trang
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
const pageIndicator = document.getElementById('page-indicator');

// Biến lưu trữ agent list
let agentListData = [];

// Hàm xử lý kết nối và lấy agent list
async function handleConnectAndFetchAgents() {
    // Kiểm tra xem gateway và appState có sẵn không
    if (typeof window.gateway === 'undefined' || typeof window.appState === 'undefined') {
        console.warn('[Connect] Gateway chưa sẵn sàng, đợi...');
        // Đợi một chút để gateway khởi tạo
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (typeof window.gateway === 'undefined') {
            console.error('[Connect] Không thể kết nối: Gateway chưa được khởi tạo');
            return;
        }
    }

    const gateway = window.gateway;
    const appState = window.appState || { isConnected: false, agents: [] };

    // Kiểm tra trạng thái kết nối
    const isConnected = gateway.ws && gateway.ws.readyState === WebSocket.OPEN;
    const isAuthenticated = gateway.isAuthenticated || false;

    console.log('[Connect] Trạng thái:', { isConnected, isAuthenticated });

    if (isConnected && isAuthenticated) {
        // Đã kết nối và authenticated, chỉ cần fetch agent list
        console.log('[Connect] Đã kết nối, đang lấy danh sách agent...');
        gateway.refreshAgents();
        // Agent list sẽ được cập nhật qua callback onAgentListUpdate
        return;
    }

    if (isConnected && !isAuthenticated) {
        // Đã kết nối nhưng chưa authenticated, đợi auth xong rồi fetch
        console.log('[Connect] Đã kết nối nhưng chưa authenticated, đang đợi...');
        // Auth sẽ tự động được gọi trong onConnected callback
        // Agent list sẽ được fetch tự động trong onAuthSuccess
        return;
    }

    // Chưa kết nối, cần connect trước
    console.log('[Connect] Chưa kết nối, đang tìm Gateway...');
    
    // Thử lấy server từ cache trước
    const cachedIp = localStorage.getItem('gateway_ip');
    if (cachedIp) {
        console.log(`[Connect] Thử kết nối với server đã cache: ${cachedIp}`);
        try {
            gateway.connect(cachedIp);
            // Connection và auth sẽ được xử lý tự động qua callbacks
            return;
        } catch (error) {
            console.warn('[Connect] Không thể kết nối với server đã cache:', error);
        }
    }

    // Nếu không có cache hoặc cache thất bại, dùng discovery
    if (typeof window.discovery !== 'undefined') {
        console.log('[Connect] Đang tìm Gateway bằng discovery...');
        try {
            const found = await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve(false);
                }, 8000);

                window.discovery.discover((ip, port) => {
                    clearTimeout(timeout);
                    console.log(`[Connect] Tìm thấy Gateway: ${ip}:${port}`);
                    gateway.connect(ip, port);
                    resolve(true);
                }, (progress) => {
                    if (progress) {
                        console.log(`[Connect] ${progress}`);
                    }
                });
            });

            if (!found) {
                console.warn('[Connect] Không tìm thấy Gateway. Vui lòng đảm bảo Gateway đang chạy.');
            }
        } catch (error) {
            console.error('[Connect] Lỗi discovery:', error);
        }
    } else {
        console.error('[Connect] Discovery không khả dụng');
    }
}

// Hàm chính: Tính toán và Render theo trang
function fetchAndRenderServers() {
    // 1. Tính toán vị trí cắt dữ liệu
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    
    // Lấy danh sách agent thuộc trang hiện tại
    const currentAgents = agentListData.slice(startIndex, endIndex);
    
    // 2. Render ra màn hình
    renderList(currentAgents);

    // 3. Cập nhật trạng thái nút và số trang
    updateFooterUI();
}

function renderList(agents) {
    console.log('[Scripts] renderList called with', agents ? agents.length : 0, 'agents');
    serverListContent.innerHTML = ''; 

    if (!agents || agents.length === 0) {
        serverListContent.innerHTML = '<li class="server-item">No agents found. Đang tải...</li>';
        console.log('[Scripts] No agents to render');
        return;
    }

    agents.forEach((agent, index) => {
        const li = document.createElement('li');
        li.className = 'server-item';

        // 1. Cấu hình Flexbox cho dòng
        li.style.display = 'flex';
        li.style.alignItems = 'center'; // Căn giữa theo chiều dọc
        li.style.padding = '12px 5px';
        
        // Thêm đường gạch dưới
        if (index < agents.length - 1) {
            li.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
        }

        // Format agent data
        const agentName = agent.name || 'Unknown';
        const agentIp = agent.ip || '-';
        const agentId = agent.id || '-';
        const status = agent.status || 'online';
        const statusColor = status === 'online' ? '#22c55e' : '#ef4444';

        li.innerHTML = `
            <span class="server-ip" style="flex: 0 0 40%; font-weight: 500;">
                ${agentName}
            </span>

            <span class="server-port" style="flex: 0 0 35%; color: #555;">
                IP: ${agentIp}
            </span>

            <span class="agent-status" style="flex: 0 0 15%; color: ${statusColor}; font-size: 12px;">
                ${status}
            </span>

            <button class="link-icon" style="margin-left: auto; border: none; background: transparent; cursor: pointer; padding: 0;" 
                    onclick="selectAgent('${agentId}')" title="Select agent: ${agentId}">
                <img src="./assets/images/link.png" width="20px" height="20px" style="display: block;">
            </button>
        `;
        
        serverListContent.appendChild(li);
    });
}

// Hàm chọn agent
window.selectAgent = (agentId) => {
    if (typeof window.setTarget === 'function') {
        window.setTarget(agentId);
        console.log(`[Connect] Đã chọn agent: ${agentId}`);
        // Đóng overlay sau khi chọn
        closeServerList();
    } else {
        console.warn('[Connect] setTarget function không khả dụng');
    }
};

// Setup refresh button event listener
document.addEventListener('DOMContentLoaded', () => {
    const refreshBtn = document.getElementById('refresh-agent-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            if (typeof window.refreshAgentList === 'function') {
                window.refreshAgentList();
            } else {
                console.warn('[Refresh] Function chưa sẵn sàng. Đang đợi...');
                // Retry sau khi module load
                setTimeout(() => {
                    if (typeof window.refreshAgentList === 'function') {
                        window.refreshAgentList();
                    } else {
                        console.error('[Refresh] Không thể refresh. Gateway chưa được khởi tạo.');
                    }
                }, 1000);
            }
        });
    }
});

// Hàm refresh agent list - sẽ được override bởi main.js
window.refreshAgentList = () => {
    if (typeof window.gateway !== 'undefined') {
        const gateway = window.gateway;
        if (gateway.ws && gateway.ws.readyState === WebSocket.OPEN && gateway.isAuthenticated) {
            console.log('[Connect] Đang làm mới danh sách agent...');
            gateway.refreshAgents();
        } else {
            console.warn('[Connect] Chưa kết nối hoặc chưa authenticated. Đang thử kết nối...');
            if (typeof handleConnectAndFetchAgents === 'function') {
                handleConnectAndFetchAgents();
            }
        }
    } else {
        console.warn('[Connect] Gateway chưa sẵn sàng');
    }
};

// Hàm phụ: Cập nhật Footer (Số trang, ẩn hiện nút Next/Prev)
function updateFooterUI() {
    const totalPages = Math.max(1, Math.ceil(agentListData.length / ITEMS_PER_PAGE));
    
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
    const totalPages = Math.max(1, Math.ceil(agentListData.length / ITEMS_PER_PAGE));
    if (currentPage < totalPages) {
        currentPage++;
        fetchAndRenderServers();
    }
});

// Hàm cập nhật agent list từ gateway
function updateAgentListFromGateway(agentList) {
    console.log('[Scripts] Nhận danh sách mới:', agentList);
    
    if (!Array.isArray(agentList)) return;

    // Chuyển đổi dữ liệu từ Gateway format sang format hiển thị của UI
    agentListData = agentList.map(agent => ({
        id: agent.id || agent.machineId,
        name: agent.name || "Unkown machine",
        ip: agent.ip || "0.0.0.0",
        status: agent.status || 'online'
    }));

    currentPage = 1;
    fetchAndRenderServers(); 
}

// Export function để main.js có thể gọi - đảm bảo được định nghĩa sớm
window.updateAgentListFromGateway = updateAgentListFromGateway;

// Lắng nghe sự kiện cập nhật agent list từ main.js
document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra định kỳ nếu appState có agents và cập nhật UI
    const checkInterval = setInterval(() => {
        if (typeof window.appState !== 'undefined' && window.appState.agents) {
            if (window.appState.agents.length > 0) {
                // Cập nhật nếu danh sách thay đổi
                const currentIds = agentListData.map(a => a.id).sort().join(',');
                const newIds = window.appState.agents.map(a => a.id || a.machineId).sort().join(',');
                if (currentIds !== newIds) {
                    updateAgentListFromGateway(window.appState.agents);
                }
            }
        }
        
        // Dừng interval sau khi gateway đã sẵn sàng
        if (typeof window.gateway !== 'undefined' && typeof window.appState !== 'undefined') {
            // Giữ interval chạy để cập nhật real-time
        }
    }, 1000);
});

// Reset về trang 1 khi mở popup
function openServerList() {
    console.log('[Scripts] openServerList called');
    currentPage = 1;
    serverOverlay.classList.remove('hidden');
    serverOverlay.classList.add('visible');
    
    // Kiểm tra và cập nhật agent list nếu có
    if (typeof window.appState !== 'undefined' && window.appState.agents) {
        console.log('[Scripts] appState.agents found:', window.appState.agents.length, 'agents');
        if (window.appState.agents.length > 0) {
            updateAgentListFromGateway(window.appState.agents);
        } else {
            console.log('[Scripts] No agents in appState, showing empty list');
            fetchAndRenderServers(); // Hiển thị "No agents found"
        }
    } else {
        console.log('[Scripts] appState not available, checking gateway directly');
        // Thử lấy từ gateway trực tiếp
        if (typeof window.gateway !== 'undefined' && window.gateway.agentsList) {
            console.log('[Scripts] Found agents in gateway.agentsList:', window.gateway.agentsList.length);
            if (window.gateway.agentsList.length > 0) {
                updateAgentListFromGateway(window.gateway.agentsList);
            } else {
                fetchAndRenderServers();
            }
        } else {
            console.log('[Scripts] No agents found anywhere, showing empty list');
            fetchAndRenderServers(); // Hiển thị "No agents found"
        }
    }
}