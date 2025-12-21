#include "FeatureLibrary.h"
#include "Agent.hpp"
#include "../../config/Config.hpp"
#include "PlatformModules.h"
#include "utils/FFmpegHelper.h"
#include <ctime>

#ifdef _WIN32
// Windows: Hide console window (WIN32 subsystem already hides it, but this ensures it's hidden)
void hideConsole() {
    // With WIN32 subsystem, console is already hidden, but we can ensure it stays hidden
    // If console was allocated, hide it
    HWND hwnd = GetConsoleWindow();
    if (hwnd != NULL) {
        ShowWindow(hwnd, SW_HIDE);
    }
}
#elif defined(__APPLE__) || defined(__linux__)
// macOS/Linux: Không fork, chỉ redirect output (để có thể debug)
void hideConsole() {
    // Không fork để giữ process trong terminal, chỉ redirect output nếu cần
    // Nếu muốn daemonize, comment lại và uncomment phần fork ở dưới
    // freopen("/dev/null", "r", stdin);
    // freopen("/dev/null", "w", stdout);
    // freopen("/dev/null", "w", stderr);
}
#else
void hideConsole() {}
#endif

int main(int argc, char** argv) {
    // #region debug log
    FILE* logFile = fopen("/Users/admin/Documents/MMT/Computer_Project_Network-1/.cursor/debug.log", "a");
    if (logFile) {
        fprintf(logFile, "{\"timestamp\":%ld,\"location\":\"main.cpp:47\",\"message\":\"main() started\",\"data\":{\"argc\":%d},\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"A\"}\n", time(NULL), argc);
        fclose(logFile);
    }
    // #endregion
    
    hideConsole(); // Hide console on all platforms
    
    // #region debug log
    logFile = fopen("/Users/admin/Documents/MMT/Computer_Project_Network-1/.cursor/debug.log", "a");
    if (logFile) {
        fprintf(logFile, "{\"timestamp\":%ld,\"location\":\"main.cpp:50\",\"message\":\"after hideConsole()\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"A\"}\n", time(NULL));
        fclose(logFile);
    }
    // #endregion
    
    setupConsole();
    
    // #region debug log
    logFile = fopen("/Users/admin/Documents/MMT/Computer_Project_Network-1/.cursor/debug.log", "a");
    if (logFile) {
        fprintf(logFile, "{\"timestamp\":%ld,\"location\":\"main.cpp:54\",\"message\":\"after setupConsole()\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"B\"}\n", time(NULL));
        fclose(logFile);
    }
    // #endregion

#ifdef _WIN32
    autoSetupTask();
    // Extract ffmpeg.exe từ resource vào cùng thư mục với exe (nếu có)
    // Hoạt động với cả build static và dynamic
    FFmpegUtil::initialize();
#endif

    std::cout << "[Main] Loading configuration...\n";
    
    // #region debug log
    logFile = fopen("/Users/admin/Documents/MMT/Computer_Project_Network-1/.cursor/debug.log", "a");
    if (logFile) {
        fprintf(logFile, "{\"timestamp\":%ld,\"location\":\"main.cpp:60\",\"message\":\"before Config::loadConfig\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"C\"}\n", time(NULL));
        fclose(logFile);
    }
    // #endregion
    
    Config::loadConfig(argc, argv);
    
    // #region debug log
    logFile = fopen("/Users/admin/Documents/MMT/Computer_Project_Network-1/.cursor/debug.log", "a");
    if (logFile) {
        fprintf(logFile, "{\"timestamp\":%ld,\"location\":\"main.cpp:68\",\"message\":\"after Config::loadConfig\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"C\"}\n", time(NULL));
        fclose(logFile);
    }
    // #endregion
    
    std::cout << "[Main] Configuration loaded successfully.\n";
    std::cout << "[Main] Agent will discover Gateway via UDP Discovery\n";
    try {
        // #region debug log
        logFile = fopen("/Users/admin/Documents/MMT/Computer_Project_Network-1/.cursor/debug.log", "a");
        if (logFile) {
            fprintf(logFile, "{\"timestamp\":%ld,\"location\":\"main.cpp:76\",\"message\":\"creating io_context\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"D\"}\n", time(NULL));
            fclose(logFile);
        }
        // #endregion
        
        boost::asio::io_context io;

        boost::asio::signal_set signals(io, SIGINT, SIGTERM);
        signals.async_wait([&io](const boost::system::error_code&, int) {
            std::cout << "\n[Main] Signal received. Stopping Agent...\n";
            io.stop();
        });

        // #region debug log
        logFile = fopen("/Users/admin/Documents/MMT/Computer_Project_Network-1/.cursor/debug.log", "a");
        if (logFile) {
            fprintf(logFile, "{\"timestamp\":%ld,\"location\":\"main.cpp:88\",\"message\":\"before creating Agent\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"E\"}\n", time(NULL));
            fclose(logFile);
        }
        // #endregion
        
        auto agent = std::make_shared<Agent>(io);
        
        // #region debug log
        logFile = fopen("/Users/admin/Documents/MMT/Computer_Project_Network-1/.cursor/debug.log", "a");
        if (logFile) {
            fprintf(logFile, "{\"timestamp\":%ld,\"location\":\"main.cpp:96\",\"message\":\"before agent->run()\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"E\"}\n", time(NULL));
            fclose(logFile);
        }
        // #endregion
        
        agent->run();

        // #region debug log
        logFile = fopen("/Users/admin/Documents/MMT/Computer_Project_Network-1/.cursor/debug.log", "a");
        if (logFile) {
            fprintf(logFile, "{\"timestamp\":%ld,\"location\":\"main.cpp:104\",\"message\":\"before io.run()\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"F\"}\n", time(NULL));
            fclose(logFile);
        }
        // #endregion

        std::cout << "===========================================\n";
        std::cout << "   AGENT CLIENT STARTED - RUNNING...       \n";
        std::cout << "===========================================\n" << std::flush;

        io.run();
        
        // #region debug log
        logFile = fopen("/Users/admin/Documents/MMT/Computer_Project_Network-1/.cursor/debug.log", "a");
        if (logFile) {
            fprintf(logFile, "{\"timestamp\":%ld,\"location\":\"main.cpp:115\",\"message\":\"after io.run() - agent stopped\",\"data\":{},\"sessionId\":\"debug-session\",\"runId\":\"run1\",\"hypothesisId\":\"F\"}\n", time(NULL));
            fclose(logFile);
        }
        // #endregion

    } catch (const std::exception& e) {
        std::cerr << "\n[FATAL ERROR] " << e.what() << "\n";
        #ifndef _WIN32
        // On non-Windows, we can't use system("pause") when console is hidden
        #else
        // On Windows with WIN32 subsystem, system("pause") won't work
        #endif
        return 1;
    } catch (...) {
        std::cerr << "\n[CRITICAL] Unknown Crash!\n";
        #ifndef _WIN32
        // On non-Windows, we can't use system("pause") when console is hidden
        #else
        // On Windows with WIN32 subsystem, system("pause") won't work
        #endif
        return 1;
    }

    return 0;
}