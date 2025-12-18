/**
 * Path: assets/js/keylog.js
 * Nhiệm vụ: Giả lập Keylogger chạy offline với chuỗi string có sẵn (Simulation Mode).
 */

// --- CẤU HÌNH DỮ LIỆU GIẢ LẬP ---
// Bạn có thể thay đổi nội dung này. Sử dụng \n cho Enter, \t cho Tab.
const MOCK_DATA_STRING = `Hello world!\nToi la sinh vien.\nDang nhap tai khoan:\nUser: admin@gmail.com\nPass: matkhau123456\n`;

class KeyloggerSimulation {
    constructor() {
        // State
        this.isLogging = false;
        this.logBuffer = ""; // Biến lưu nội dung để save file
        
        // Simulation State
        this.mockIndex = 0; // Vị trí con trỏ đang đọc trong chuỗi MOCK_DATA
        this.typingTimer = null; // Timer để quản lý tốc độ gõ

        // DOM Elements
        this.displayInput = document.querySelector('.key-display');
        this.btnStart = document.querySelector('.action-buttons button:nth-child(1)');
        this.btnStop = document.querySelector('.action-buttons button:nth-child(2)');
        this.btnSave = document.querySelector('.action-buttons button:nth-child(3)');
        this.keys = document.querySelectorAll('.key');

        this.init();
    }

    init() {
        // Gán sự kiện
        this.btnStart.onclick = () => this.startSimulation();
        this.btnStop.onclick = () => this.stopSimulation();
        this.btnSave.onclick = () => this.saveToDevice();

        // Inject CSS cho hiệu ứng phím sáng
        this.injectActiveStyle();
        
        this.logSystem("Simulation Mode Ready. Server connection disabled.");
    }

    // --- Simulation Logic ---

    startSimulation() {
        if (this.isLogging) return;

        this.isLogging = true;
        this.btnStart.style.backgroundColor = "#22c55e"; 
        this.btnStart.innerText = "Simulating...";
        
        this.logSystem(">>> Started Replaying Mock Data...");

        // Nếu đã chạy hết chuỗi thì reset lại từ đầu
        if (this.mockIndex >= MOCK_DATA_STRING.length) {
            this.mockIndex = 0;
            this.displayInput.value = "";
            this.logBuffer = "";
        }

        this.processNextChar();
    }

    stopSimulation() {
        this.isLogging = false;
        clearTimeout(this.typingTimer);
        
        this.btnStart.style.backgroundColor = ""; 
        this.btnStart.innerText = "Start keylog";
        this.logSystem(">>> Simulation Paused.");
    }

    /**
     * Hàm đệ quy giả lập việc gõ từng ký tự với tốc độ ngẫu nhiên
     */
    processNextChar() {
        if (!this.isLogging) return;

        if (this.mockIndex >= MOCK_DATA_STRING.length) {
            this.logSystem("End of simulation string.");
            this.stopSimulation();
            return;
        }

        // Lấy ký tự tiếp theo trong chuỗi mẫu
        const char = MOCK_DATA_STRING[this.mockIndex];
        this.mockIndex++;

        // Xử lý hiển thị (Visuals & Buffer)
        this.handleIncomingKey(char);

        // Tạo độ trễ ngẫu nhiên (50ms - 200ms) để giống người gõ thật
        const randomDelay = Math.floor(Math.random() * 150) + 50;
        
        this.typingTimer = setTimeout(() => {
            this.processNextChar();
        }, randomDelay);
    }

    // --- Visual Processing (Giữ nguyên logic cũ) ---

    handleIncomingKey(char) {
        // 1. Lưu vào buffer
        this.logBuffer += char;

        // 2. Cập nhật thanh input xám
        this.updateDisplay(char);

        // 3. Hiệu ứng sáng phím trên màn hình
        this.visualizeKey(char);
    }

    updateDisplay(char) {
        if (char === '\n' || char === '\r') {
            this.displayInput.value += "[ENTER] "; // Ký hiệu xuống dòng
        } else if (char === '\t') {
            this.displayInput.value += " [TAB] ";
        } else {
            this.displayInput.value += char;
        }
        // Auto scroll
        this.displayInput.scrollLeft = this.displayInput.scrollWidth;
    }

    visualizeKey(char) {
        let targetKey = null;
        const lowerChar = char.toLowerCase();

        // Mapping ký tự đặc biệt
        const specialMap = {
            '\n': 'enter',
            '\r': 'enter',
            ' ': 'space', 
            '\t': 'tab',
            '\b': 'backspace',
        };

        // Tìm phím trên giao diện
        for (let key of this.keys) {
            let keyText = key.innerText.toLowerCase().trim();
            
            // Xử lý phím Space (trong HTML là div rỗng class k-6-25)
            if (char === ' ' && keyText === '' && key.classList.contains('k-6-25')) {
                targetKey = key;
                break;
            }

            // So sánh ký tự
            if (keyText === lowerChar || keyText === specialMap[lowerChar]) {
                targetKey = key;
                break;
            }
        }

        // Kích hoạt hiệu ứng
        if (targetKey) {
            targetKey.classList.add('active-simulation');
            setTimeout(() => {
                targetKey.classList.remove('active-simulation');
            }, 150); 
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
    }

    // --- Helpers ---

    logSystem(msg) {
        console.log(`[Sim] ${msg}`);
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

// Start App
document.addEventListener('DOMContentLoaded', () => {
    window.keylogSim = new KeyloggerSimulation();
});