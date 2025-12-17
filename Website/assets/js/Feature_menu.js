document.addEventListener("DOMContentLoaded", () => {
    /* =========================================
       1. CẤU HÌNH LIÊN KẾT (Bạn điền link vào đây)
       ========================================= */
    const urlMap = {
        "Application Control": "./application.html", // Ví dụ: trang điều khiển ứng dụng
        "Process Control":     "./process.html",
        "Keylog Control":      "./keylog.html",
        "Screen Control":      "./screen.html",
        "Webcam Control":      "./webcam.html",
        "Power Control":       "./power.html"
    };

    /* =========================================
       2. KHỞI TẠO BIẾN
       ========================================= */
    const screenText = document.querySelector('.code-text');
    const featureItems = document.querySelectorAll('.feature-content');
    const defaultText = "What to do?";
    let typingInterval; // Biến để lưu trạng thái gõ phím

    /* =========================================
       3. HÀM XỬ LÝ HIỆU ỨNG GÕ CHỮ (TYPING)
       ========================================= */
    function typeEffect(text) {
        // Xóa animation CSS cũ (để tránh xung đột với JS)
        screenText.classList.remove('typing-effect');
        screenText.style.width = 'auto'; // Cho phép chiều rộng tự động theo nội dung
        screenText.style.borderRight = '2px solid #3A6DAF'; // Giữ con trỏ nhấp nháy

        // Xóa nội dung cũ và interval cũ đang chạy
        clearInterval(typingInterval);
        screenText.textContent = "";

        let i = 0;
        const speed = 50; // Tốc độ gõ (ms) - càng nhỏ gõ càng nhanh

        // Bắt đầu gõ từng ký tự
        typingInterval = setInterval(() => {
            if (i < text.length) {
                screenText.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(typingInterval); // Dừng khi gõ xong
            }
        }, speed);
    }

    /* =========================================
       4. GÁN SỰ KIỆN CHO CÁC NÚT
       ========================================= */
    featureItems.forEach(item => {
        // Lấy text của tính năng (ví dụ: "Application Control")
        const featureName = item.querySelector('.feature-text').innerText;

        // Sự kiện: Khi chuột RÊ VÀO (Hover)
        item.addEventListener('mouseenter', () => {
            typeEffect(featureName); // Gõ tên tính năng
        });

        // Sự kiện: Khi chuột RỜI RA (Leave)
        item.addEventListener('mouseleave', () => {
            typeEffect(defaultText); // Quay về "What to do?"
        });

        // Sự kiện: Khi CLICK chuột
        item.addEventListener('click', () => {
            // Tìm link trong bảng urlMap, nếu không có thì mặc định là '#'
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