#include "FFmpegHelper.h"
#include <filesystem>
#include <fstream>

#ifdef _WIN32
    #include <windows.h>
#endif

namespace FFmpegUtil {
    std::string getExeDirectory() {
        std::string exeDir;
        
        #ifdef _WIN32
            char exePath[MAX_PATH];
            if (GetModuleFileNameA(NULL, exePath, MAX_PATH) != 0) {
                std::string path = exePath;
                size_t lastSlash = path.find_last_of("\\/");
                if (lastSlash != std::string::npos) {
                    exeDir = path.substr(0, lastSlash + 1);
                }
            }
        #elif __APPLE__
            char exePath[1024];
            uint32_t size = sizeof(exePath);
            if (_NSGetExecutablePath(exePath, &size) == 0) {
                char resolved[PATH_MAX];
                if (realpath(exePath, resolved) != NULL) {
                    std::string path = resolved;
                    size_t lastSlash = path.find_last_of("/");
                    if (lastSlash != std::string::npos) {
                        exeDir = path.substr(0, lastSlash + 1);
                    }
                }
            }
        #elif __linux__
            char exePath[1024];
            ssize_t len = readlink("/proc/self/exe", exePath, sizeof(exePath) - 1);
            if (len != -1) {
                exePath[len] = '\0';
                std::string path = exePath;
                size_t lastSlash = path.find_last_of("/");
                if (lastSlash != std::string::npos) {
                    exeDir = path.substr(0, lastSlash + 1);
                }
            }
        #endif
        
        return exeDir;
    }
    
    #ifdef _WIN32
    // Extract ffmpeg.exe từ resource vào cùng thư mục với exe
    bool extractFFmpegFromResource() {
        std::string exeDir = getExeDirectory();
        std::string ffmpegPath = exeDir + "ffmpeg.exe";
        
        // Nếu đã có sẵn, không cần extract lại
        if (std::filesystem::exists(ffmpegPath)) {
            return true;
        }
        
        // Thử extract từ resource
        HRSRC hResource = FindResourceA(NULL, MAKEINTRESOURCEA(101), "BINARY");
        if (!hResource) {
            return false;
        }
        
        HGLOBAL hMemory = LoadResource(NULL, hResource);
        if (!hMemory) {
            return false;
        }
        
        DWORD dwSize = SizeofResource(NULL, hResource);
        LPVOID lpAddress = LockResource(hMemory);
        
        if (!lpAddress || dwSize == 0) {
            return false;
        }
        
        // Extract vào cùng thư mục với exe
        std::ofstream outFile(ffmpegPath, std::ios::binary);
        if (!outFile.is_open()) {
            return false;
        }
        
        outFile.write(static_cast<const char*>(lpAddress), dwSize);
        outFile.close();
        
        return std::filesystem::exists(ffmpegPath);
    }
    #endif
    
    std::string getFFmpegPath() {
        std::string exeDir = getExeDirectory();
        
        #ifdef _WIN32
            std::string localFFmpeg = exeDir + "ffmpeg.exe";
            
            // Ưu tiên 1: Nếu đã có trong cùng thư mục
            if (std::filesystem::exists(localFFmpeg)) {
                return localFFmpeg;
            }
            
            // Ưu tiên 2: Thử extract từ resource (khi build static với embed)
            if (extractFFmpegFromResource()) {
                return localFFmpeg;
            }
        #else
            std::string localFFmpeg = exeDir + "ffmpeg";
            if (std::filesystem::exists(localFFmpeg)) {
                return localFFmpeg;
            }
        #endif
        
        // Fallback: tìm trong PATH
        return "ffmpeg";
    }
    
    // Khởi tạo: Extract ffmpeg từ resource (chỉ cần gọi 1 lần khi khởi động)
    void initialize() {
        #ifdef _WIN32
            extractFFmpegFromResource();
        #endif
    }
    
    bool isFFmpegAvailable() {
        std::string path = getFFmpegPath();
        if (path == "ffmpeg") {
            // Đã là PATH, kiểm tra bằng cách chạy command
            #ifdef _WIN32
                return system("ffmpeg -version >nul 2>&1") == 0;
            #else
                return system("ffmpeg -version >/dev/null 2>&1") == 0;
            #endif
        }
        return std::filesystem::exists(path);
    }
}