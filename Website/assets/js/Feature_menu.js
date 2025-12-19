import * as Logic from './logic.js';

document.addEventListener("DOMContentLoaded", () => {
    /* =========================================
       1. CẤU HÌNH LIÊN KẾT (Bạn điền link vào đây)
       ========================================= */
    const urlMap = {
        // "Application Control": "./app_process.html?mode=app",
        // "Process Control":     "./app_process.html?mode=process",
        "Application Control": "./app_menu.html",
        "Process Control":     "./proc_menu.html",
        "Keylog Control":      "./keylog.html",
        "Screen Control":      "./screen_webcam.html?mode=screen",
        "Webcam Control":      "./screen_webcam.html?mode=webcam",
        "Power Control":       "./power_control.html"
    };

    /* =========================================
       2. KHỞI TẠO BIẾN
       ========================================= */
    const screenText = document.querySelector('.code-text');
    const featureItems = document.querySelectorAll('.feature-content');
    const defaultText = "What to do?";
    let typingInterval;

    typeEffect(defaultText);

    // Đọc agent ID từ URL và tự động setTarget
    Logic.initAgentTargetFromURL();

    /* =========================================
       3. HÀM XỬ LÝ HIỆU ỨNG GÕ CHỮ (TYPING)
       ========================================= */
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


    /* =========================================
       4. GÁN SỰ KIỆN CHO CÁC NÚT
       ========================================= */
    featureItems.forEach(item => {
        const featureName = item.querySelector('.feature-text').textContent.trim();

        // Sự kiện: Khi chuột RÊ VÀO (Hover)
        item.addEventListener('mouseenter', () => {
            typeEffect(featureName);
        });

        // Sự kiện: Khi chuột RỜI RA (Leave)
        item.addEventListener('mouseleave', () => {
            typeEffect(defaultText);
        });

        // Sự kiện: Khi CLICK chuột
        item.addEventListener('click', () => {
            const targetUrl = urlMap[featureName] || '#';
            const currentAgentId = new URLSearchParams(window.location.search).get('id');
            
            if(targetUrl !== '#') {
                let finalUrl = targetUrl;
                if (currentAgentId) {
                    // Check if targetUrl already has query parameters
                    const separator = targetUrl.includes('?') ? '&' : '?';
                    finalUrl = `${targetUrl}${separator}id=${currentAgentId}`;
                }
                window.location.href = finalUrl;
            } else {
                console.log(`Chưa cấu hình link cho: ${featureName}`);
                alert(`Chức năng "${featureName}" đang được phát triển!`);
            }
        });
    });
});

// 5. Ngắt kết nối với server
function Disconnect() {
    if (window.gateway && window.gateway.disconnect) {
        window.gateway.disconnect();
    }
    window.location.href = 'index.html';
}

// Export Disconnect for HTML onclick
window.Disconnect = Disconnect;