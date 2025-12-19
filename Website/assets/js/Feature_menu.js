document.addEventListener("DOMContentLoaded", () => {
    /* =========================================
       1. CẤU HÌNH LIÊN KẾT (Bạn điền link vào đây)
       ========================================= */
    const urlMap = {
        "Application Control": "./app_process.html?mode=app",
        "Process Control":     "./app_process.html?mode=process",
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
            
            if(targetUrl !== '#') {
                window.location.href = targetUrl;
            } else {
                console.log(`Chưa cấu hình link cho: ${featureName}`);
                alert(`Chức năng "${featureName}" đang được phát triển!`);
            }
        });
    });
});

// 5. Ngắt kết nối với server
function Disconnect() {
    // thêm logic ngắt kết nối ở đây
    window.location.href = 'index.html';
}