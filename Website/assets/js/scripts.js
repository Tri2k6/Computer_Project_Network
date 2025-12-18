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
    
    currentPage = 1; // Reset về trang 1 khi mở popup
    
    // Đảm bảo gateway đã sẵn sàng trước khi fetch
    if (typeof window.gateway !== 'undefined' && window.gateway) {
        // Nếu đã authenticated và chưa đang refresh, refresh agents để lấy data mới nhất
        if (window.gateway.isAuthenticated && !isRefreshing) {
            isRefreshing = true;
            window.gateway.refreshAgents();
            setTimeout(() => {
                isRefreshing = false;
            }, 2000);
        }
    }
    
    // Render ngay với data hiện có, sẽ tự update khi có data mới
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
const ITEMS_PER_PAGE = 5; // Số server hiển thị trên 1 trang
let currentPage = 1;
let agentData = []; // Lưu trữ danh sách agent thực tế
let isRefreshing = false; // Flag để tránh loop khi refresh
let lastAgentCount = 0; // Đếm số agent lần trước để detect thay đổi

// Các phần tử DOM cần thiết cho phân trang
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
const pageIndicator = document.getElementById('page-indicator');
const refreshBtn = document.querySelector('.refresh-btn');

// Hàm lấy danh sách agent từ gateway
function getAgentData() {
    // Kiểm tra xem gateway đã được khởi tạo chưa
    if (typeof window.gateway !== 'undefined' && window.gateway) {
        const formattedAgents = window.gateway.getFormattedAgents();
        
        // Lấy raw agent list từ gateway nếu có
        const rawAgents = window.gateway.agentsList || [];
        
        // Ưu tiên dùng rawAgents nếu có, nếu không thì dùng formattedAgents
        if (rawAgents.length > 0) {
            return rawAgents.map(agent => ({
                id: agent.id || agent.ID || '',
                ip: agent.ip || agent["IP Address"] || agent["Địa chỉ IP"] || "N/A",
                machine: agent.machineId || agent.machine || agent["Machine"] || agent["Tên máy"] || "Unknown",
                status: agent.status || agent["Status"] || agent["Trạng thái"] || "Online"
            }));
        }
        
        // Fallback về formattedAgents
        return formattedAgents.map(agent => ({
            id: agent["ID"] || '',
            ip: agent["IP Address"] || agent["Địa chỉ IP"] || "N/A",
            machine: agent["Machine"] || agent["Tên máy"] || "Unknown",
            status: agent["Status"] || agent["Trạng thái"] || "Online"
        }));
    }
    return [];
}

// Hàm chính: Tính toán và Render theo trang
// Export để main.js có thể gọi
window.fetchAndRenderServers = function fetchAndRenderServers() {
    // Kiểm tra gateway connection trước
    if (typeof window.gateway === 'undefined' || !window.gateway) {
        serverListContent.innerHTML = '<li class="server-item" style="text-align: center; padding: 20px; color: #666;">Gateway chưa được khởi tạo</li>';
        updateFooterUI();
        return;
    }
    
    // Nếu chưa authenticated, chỉ hiển thị thông báo
    if (!window.gateway.isAuthenticated) {
        serverListContent.innerHTML = '<li class="server-item" style="text-align: center; padding: 20px; color: #666;">Đang kết nối đến gateway...<br><small>Vui lòng đợi</small></li>';
        updateFooterUI();
        return;
    }
    
    // Lấy dữ liệu agent thực tế từ gateway
    agentData = getAgentData();
    
    // Kiểm tra nếu data không thay đổi thì không cần render lại
    if (agentData.length === lastAgentCount && agentData.length > 0) {
        // Data không đổi, chỉ render lại nếu cần
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const currentAgents = agentData.slice(startIndex, endIndex);
        renderList(currentAgents);
        updateFooterUI();
        return;
    }
    
    // Hiển thị loading nếu chưa có dữ liệu và chưa đang refresh
    if (agentData.length === 0 && !isRefreshing) {
        serverListContent.innerHTML = '<li class="server-item" style="text-align: center; padding: 20px; color: #666;">Đang tải danh sách agent...<br><small>Vui lòng đảm bảo đã kết nối đến gateway</small></li>';
        updateFooterUI();
        // Chỉ refresh một lần nếu chưa có data
        if (window.gateway.isAuthenticated && !isRefreshing) {
            isRefreshing = true;
            window.gateway.refreshAgents();
            // Reset flag sau 2 giây
            setTimeout(() => {
                isRefreshing = false;
            }, 2000);
        }
        return;
    }
    
    // Cập nhật lastAgentCount
    lastAgentCount = agentData.length;
    
    // Reset về trang 1 nếu trang hiện tại vượt quá số trang mới
    const totalPages = Math.ceil(agentData.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = 1;
    }
    
    // 1. Tính toán vị trí cắt dữ liệu
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    
    // Lấy danh sách agent thuộc trang hiện tại
    const currentAgents = agentData.slice(startIndex, endIndex);
    
    // 2. Render ra màn hình
    renderList(currentAgents);

    // 3. Cập nhật trạng thái nút và số trang
    updateFooterUI();
    
    // Log để debug
    console.log(`[Dashboard] Displaying ${currentAgents.length} agents (page ${currentPage}/${totalPages}, total: ${agentData.length})`);
};

function renderList(agents) {
    serverListContent.innerHTML = ''; 

    if (agents.length === 0) {
        serverListContent.innerHTML = '<li class="server-item" style="text-align: center; padding: 20px; color: #666;">Không tìm thấy agent nào.</li>';
        return;
    }

    agents.forEach((agent, index) => {
        const li = document.createElement('li');
        li.className = 'server-item';

        // Cấu hình Flexbox cho dòng
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.padding = '12px 5px';
        li.style.transition = 'background-color 0.2s';
        
        // Hover effect
        li.addEventListener('mouseenter', () => {
            li.style.backgroundColor = '#f5f5f5';
        });
        li.addEventListener('mouseleave', () => {
            li.style.backgroundColor = 'transparent';
        });
        
        // Thêm đường gạch dưới
        if (index < agents.length - 1) {
            li.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
        }

        // Tạo link clickable kế bên IP
        const linkButton = document.createElement('button');
        linkButton.className = 'link-icon';
        linkButton.style.cssText = 'margin-left: auto; border: none; background: transparent; cursor: pointer; padding: 5px; border-radius: 4px; transition: background-color 0.2s;';
        linkButton.title = `Kết nối đến ${agent.machine}`;
        linkButton.innerHTML = '<img src="./assets/images/link.png" width="20px" height="20px" style="display: block;">';
        
        // Xử lý click để mở tab mới và connect đến agent
        linkButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetUrl = `${window.location.origin}${window.location.pathname}?agent=${agent.id}`;
            window.open(targetUrl, '_blank');
        });

        // Hover effect cho button
        linkButton.addEventListener('mouseenter', () => {
            linkButton.style.backgroundColor = '#e3f2fd';
        });
        linkButton.addEventListener('mouseleave', () => {
            linkButton.style.backgroundColor = 'transparent';
        });

        li.innerHTML = `
            <span class="server-ip" style="flex: 0 0 40%; font-weight: 500; color: #2196F3;">
                ${agent.ip}
            </span>
            <span class="server-machine" style="flex: 0 0 45%; color: #555; font-size: 0.9em;">
                ${agent.machine}
            </span>
            <span class="server-status" style="flex: 0 0 10%; text-align: center;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #4CAF50; margin-right: 4px;"></span>
                <span style="font-size: 0.85em; color: #666;">${agent.status}</span>
            </span>
        `;
        
        // Thêm link button vào cuối
        li.appendChild(linkButton);
        serverListContent.appendChild(li);
    });
}

// Hàm phụ: Cập nhật Footer (Số trang, ẩn hiện nút Next/Prev)
function updateFooterUI() {
    const totalPages = Math.ceil(agentData.length / ITEMS_PER_PAGE) || 1;
    
    // Cập nhật text "Page 1/3"
    pageIndicator.textContent = `Trang ${currentPage}/${totalPages} (${agentData.length} agent)`;

    // Xử lý nút Prev (ẩn nếu ở trang 1)
    if (currentPage === 1 || totalPages === 0) {
        prevBtn.disabled = true;
        prevBtn.style.opacity = '0.5';
        prevBtn.style.cursor = 'not-allowed';
    } else {
        prevBtn.disabled = false;
        prevBtn.style.opacity = '1';
        prevBtn.style.cursor = 'pointer';
    }

    // Xử lý nút Next (ẩn nếu ở trang cuối)
    if (currentPage === totalPages || totalPages === 0) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = '0.5';
        nextBtn.style.cursor = 'not-allowed';
    } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
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
    const totalPages = Math.ceil(agentData.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        fetchAndRenderServers();
    }
});

// --- 5. Nút Refresh ---
if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
        // Thêm hiệu ứng loading
        const img = refreshBtn.querySelector('img');
        if (img) {
            img.style.animation = 'spin 1s linear infinite';
        }
        
        // Refresh agent list từ gateway
        if (typeof window.gateway !== 'undefined' && window.gateway && !isRefreshing) {
            isRefreshing = true;
            window.gateway.refreshAgents();
            
            // Đợi một chút để gateway cập nhật dữ liệu, sau đó render lại
            setTimeout(() => {
                currentPage = 1; // Reset về trang 1
                isRefreshing = false;
                fetchAndRenderServers();
                
                // Dừng animation
                if (img) {
                    img.style.animation = '';
                }
            }, 800);
        } else {
            // Nếu gateway chưa sẵn sàng hoặc đang refresh, chỉ render lại dữ liệu hiện có
            fetchAndRenderServers();
            if (img) {
                img.style.animation = '';
            }
        }
    });
}
