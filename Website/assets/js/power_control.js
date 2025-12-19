
import * as Logic from './logic.js';

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
    Logic.initAgentTargetFromURL();
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
                if (btn.id === "btn-restart") {
                    Logic.restartAgent();
                    return; 
                } else if (btn.id === "btn-shutdown") {
                    Logic.shutdownAgent();
                    return; 
                } else if (btn.id === "btn-sleep") {
                    Logic.sleepAgent();
                    return; 
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