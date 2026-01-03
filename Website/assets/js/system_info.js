import { CONFIG } from './modules/config.js';

const win = window;
let ramChart = null;
let cpuChart = null;

// Cấu hình chung cho Chart
const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Tắt animation để update mượt hơn real-time
    plugins: { legend: { display: false } },
    scales: {
        y: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' }, ticks: { display: false } },
        x: { display: false }
    },
    elements: { point: { radius: 0 } } // Ẩn điểm tròn cho gọn
};

function initCharts() {
    // 1. RAM Chart
    const ctxRam = document.getElementById('ramHistoryChart');
    if (ctxRam) {
        ramChart = new Chart(ctxRam, {
            type: 'line',
            data: {
                labels: Array(30).fill(''),
                datasets: [{
                    data: Array(30).fill(0),
                    borderColor: '#f97316', // Orange
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                }]
            },
            options: commonOptions
        });
    }

    // 2. CPU Chart
    const ctxCpu = document.getElementById('cpuHistoryChart');
    if (ctxCpu) {
        cpuChart = new Chart(ctxCpu, {
            type: 'line',
            data: {
                labels: Array(30).fill(''),
                datasets: [{
                    data: Array(30).fill(0),
                    borderColor: '#3b82f6', // Blue
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                }]
            },
            options: commonOptions
        });
    }
}


function updateChart(chart, value) {
    if (!chart) return;
    const data = chart.data.datasets[0].data;
    const labels = chart.data.labels;

    data.push(value);
    data.shift();
    // Label shift (dummy)
    labels.push('');
    labels.shift();

    chart.update('none'); // Update mode 'none' để không trigger animation
}

// === MAIN RENDER FUNCTION ===
win.ui.renderSystemInfo = (response) => {
    // console.log("[SystemInfo] Received:", response); // Debug nếu cần

    if (!response || response.status !== "ok" || !response.data) return;
    const stats = response.data;

    // 1. OS Info
    if (document.getElementById('os-info')) 
        document.getElementById('os-info').textContent = stats.os || "Unknown OS";
    
    const osName = (stats.os || "Unknown").trim();
    if (document.getElementById('os-info')) 
        document.getElementById('os-info').textContent = osName;

    // Logic đổi Icon
    const osIcon = document.getElementById('os-icon');
    if (osIcon) {
        // Reset class gốc
        osIcon.className = ''; 
        
        const lowerOS = osName.toLowerCase();
        if (lowerOS.includes('win')) {
            osIcon.className = 'fa-brands fa-windows';
        } else if (lowerOS.includes('mac') || lowerOS.includes('darwin') || lowerOS.includes('apple')) {
            osIcon.className = 'fa-brands fa-apple';
        } else if (lowerOS.includes('linux') || lowerOS.includes('ubuntu') || lowerOS.includes('debian')) {
            osIcon.className = 'fa-brands fa-linux';
        } else if (lowerOS.includes('android')) {
            osIcon.className = 'fa-brands fa-android';
        } else {
            osIcon.className = 'fa-solid fa-desktop'; // Mặc định
        }
    }
    // 2. CPU Info
    const cpuModel = stats.cpu?.model || "Unknown CPU";
    const cpuLoad = Math.round(stats.cpu?.load_percent || 0);
    
    if (document.getElementById('cpu-model')) 
        document.getElementById('cpu-model').textContent = cpuModel;
    if (document.getElementById('cpu-load-val')) 
        document.getElementById('cpu-load-val').textContent = cpuLoad + "%";
    
    updateChart(cpuChart, cpuLoad);

    // 3. RAM Info
    const ramTotal = stats.ram?.total_mb || 0;
    const ramUsed = stats.ram?.used_mb || 0;
    const ramPercent = Math.round(stats.ram?.usage_percent || 0);

    if (document.getElementById('ram-usage-val')) 
        document.getElementById('ram-usage-val').textContent = ramPercent + "%";
    if (document.getElementById('ram-detail-text')) 
        document.getElementById('ram-detail-text').textContent = `${(ramUsed/1024).toFixed(1)} / ${(ramTotal/1024).toFixed(1)} GB`;

    updateChart(ramChart, ramPercent);

    // 4. Battery Info
    const batPercent = stats.battery?.percent || 0;
    const batStatus = stats.battery?.status || "No Battery";
    if (document.getElementById('battery-text')) {
        document.getElementById('battery-text').innerHTML = `${batPercent}% <small>(${batStatus})</small>`;
    }

    // 5. Disk Info (Render List)
    const diskContainer = document.getElementById('disk-container');
    if (diskContainer && Array.isArray(stats.disk)) {
        diskContainer.innerHTML = stats.disk.map(d => {
            const usedGb = d.total_gb - d.free_gb;
            const percent = d.total_gb > 0 ? (usedGb / d.total_gb * 100) : 0;
            let colorClass = '#3b82f6'; // Blue default
            if (percent > 80) colorClass = '#f97316'; // Orange warning
            if (percent > 90) colorClass = '#ef4444'; // Red alert

            return `
                <div class="disk-item">
                    <div class="disk-info">
                        <span><i class="fa-solid fa-hdd"></i> ${d.name}</span>
                        <span>${d.free_gb} GB Free / ${d.total_gb} GB</span>
                    </div>
                    <div class="progress-bg">
                        <div class="progress-fill" style="width: ${percent}%; background-color: ${colorClass}"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 6. Network Info (Render List)
    const netContainer = document.getElementById('network-container');
    if (netContainer && Array.isArray(stats.network)) {
        netContainer.innerHTML = stats.network.map(n => `
            <div class="net-item">
                <div class="net-icon"><i class="fa-solid fa-globe"></i></div>
                <div class="net-details">
                    <div><strong>${n.interface}</strong></div>
                    <div>IP: ${n.ipv4 || 'N/A'}</div>
                    <small>MAC: ${n.mac || 'N/A'}</small>
                </div>
            </div>
        `).join('');
    }
};

function fetchStats() {
    // Chỉ gửi lệnh nếu đã đăng nhập và đã chọn 1 target cụ thể
    if (win.gateway?.isAuthenticated && win.gateway.targetId !== 'ALL') {
        
        // 1. Gửi lệnh lấy thông tin
        win.gateway.send(CONFIG.CMD.SYSTEM_INFO, {});
        
        // 2. Cập nhật hiển thị tên Agent
        const display = document.getElementById('agent-name-display');
        if(display) {
            // Lấy danh sách các agent đang online
            const agents = win.gateway.agentsList || [];
            
            // Tìm agent trùng với targetId hiện tại
            const currentAgent = agents.find(a => a.id === win.gateway.targetId);
            
            // Nếu tìm thấy thì lấy machineId, còn không thì dùng tạm targetId
            const displayName = currentAgent ? currentAgent.machineId : win.gateway.targetId;
            
            // Hiển thị ra màn hình (giữ nguyên icon desktop cho đẹp)
            display.innerHTML = ` ${displayName}`;
        }
        
        return true; 
    }
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    initCharts();

    // Polling logic: Gọi liên tục mỗi 2s để chart chạy mượt
    const initialFetch = setInterval(() => {
        if (fetchStats()) {
            clearInterval(initialFetch); 
            setInterval(fetchStats, 1000); // 2 giây refresh 1 lần
        }
    }, 500);

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', fetchStats);
});