// ================== CONFIG ==================

// Text hiển thị khi hover từng nút
const hoverTexts = {
    'btn-restart':  'Restarting...',
    'btn-shutdown': 'Shutting Down...',
    'btn-sleep':    'Sleeping...'
};

const screenText = document.querySelector('.screen-text');
const featureItems = document.querySelectorAll('.feature-content');
const defaultText = "What to do?";
let typingInterval;

// Helper function: Initialize agent target
function initAgentTarget() {
    const urlParams = new URLSearchParams(window.location.search);
    const agentId = urlParams.get('id');
    
    if (agentId) {
        const checkAndSetTarget = () => {
            if (window.gateway && window.gateway.isAuthenticated) {
                // Đợi agents list được load trước
                if (window.gateway.agentsList && window.gateway.agentsList.length > 0) {
                    window.gateway.setTarget(agentId);
                    console.log(`[Power_Control] Đã setTarget đến agent: ${agentId}`);
                } else {
                    // Nếu agents list chưa có, đợi thêm
                    setTimeout(checkAndSetTarget, 500);
                }
            } else {
                setTimeout(checkAndSetTarget, 500);
            }
        };
        setTimeout(checkAndSetTarget, 1000);
    }
}

// Initialize agent target when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAgentTarget);
} else {
    initAgentTarget();
}

typeEffect(defaultText);

function typeEffect(text) {
    screenText.classList.add('typing-effect');
    screenText.style.width = 'auto'; // hoặc bỏ dòng này đi

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
            // giữ nhấp nháy hoặc tắt class:
            // screenText.classList.remove('typing-effect');
        }
    }, speed);
}

// ================== CONFIRM PANEL ==================

let pendingAction = null;

const confirmPanel = document.getElementById("confirmPanel");
const yesBtn = document.querySelector(".confirm-btn.yes");
const noBtn  = document.querySelector(".confirm-btn.no");

function openConfirm() {
    confirmPanel.classList.remove("hidden");
}

function closeConfirm() {
    confirmPanel.classList.add("hidden");
}

yesBtn.addEventListener("click", () => {
    if (pendingAction) {
        pendingAction();
        pendingAction = null;
    }
    closeConfirm();
});

noBtn.addEventListener("click", () => {
    pendingAction = null;
    closeConfirm();
});

// ================== MAIN LOGIC ==================

document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".img-btn");

    // Khi chưa hover nút nào, hiển thị default text
    typeEffect(defaultText);

    buttons.forEach(btn => {

        // Hover vào nút: gõ text tương ứng
        btn.addEventListener("mouseenter", () => {
            const text = hoverTexts[btn.id] || defaultText;
            typeEffect(text);
        });

        // Rời nút: gõ lại default text
        btn.addEventListener("mouseleave", () => {
            typeEffect(defaultText);
        });

        // Click nút: xử lý confirm nếu cần
        btn.addEventListener("click", () => {

            if (btn.id === "btn-back") {
                backToMenu();
                return; // Không mở confirm panel cho nút back
            }

            // Lưu hành động chờ xác nhận
            pendingAction = () => {
                console.log(`Confirmed action: ${btn.id}`);

                // Kiểm tra gateway có sẵn và đã authenticated
                if (!window.gateway) {
                    console.error('[Power_Control] Gateway không khả dụng');
                    alert('Lỗi: Không thể kết nối đến Gateway. Vui lòng kiểm tra kết nối.');
                    return;
                }

                if (!window.gateway.ws || window.gateway.ws.readyState !== WebSocket.OPEN) {
                    console.error('[Power_Control] WebSocket chưa kết nối');
                    alert('Lỗi: Chưa kết nối đến Gateway. Vui lòng kiểm tra kết nối.');
                    return;
                }

                if (!window.gateway.isAuthenticated) {
                    console.error('[Power_Control] Chưa authenticated');
                    alert('Lỗi: Chưa xác thực với Gateway. Vui lòng đợi...');
                    return;
                }

                // Xử lý từng loại nút
                const CMD = window.CONFIG ? window.CONFIG.CMD : {
                    RESTART: 'restart',
                    SHUTDOWN: 'shutdown'
                };

                switch (btn.id) {
                    case 'btn-restart':
                        console.log('[Power_Control] Gửi lệnh RESTART...');
                        window.gateway.send(CMD.RESTART, "");
                        break;

                    case 'btn-shutdown':
                        console.log('[Power_Control] Gửi lệnh SHUTDOWN...');
                        window.gateway.send(CMD.SHUTDOWN, "");
                        break;

                    case 'btn-sleep':
                        console.warn('[Power_Control] Lệnh SLEEP chưa được hỗ trợ trên server');
                        alert('Lệnh Sleep chưa được hỗ trợ. Vui lòng sử dụng Shutdown hoặc Restart.');
                        break;

                    default:
                        console.warn(`[Power_Control] Không xác định được hành động cho nút: ${btn.id}`);
                }
            };

            openConfirm();
        });
    });
});

// ================== BACK TO MENU ==================

function backToMenu() {
    window.location.href = 'feature_menu.html';
}