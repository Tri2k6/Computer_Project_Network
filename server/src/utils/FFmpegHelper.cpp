#include "utils/FFmpegHelper.h"

#ifdef __APPLE__
    #include <mach-o/dyld.h>
#endif

#ifdef __linux__
    #include <unistd.h>
    #include <sys/stat.h>
    #include <cstdlib>
    #include <ctime>
#endif

#ifdef _WIN32
    #include <sys/stat.h>
    #include <shlobj.h>
#endif

std::string FFmpegHelper::cachedPath = "";
bool FFmpegHelper::extracted = false;

std::string FFmpegHelper::getInstallDirectory() {
    std::string installDir;
    
    #ifdef _WIN32
        char appDataPath[MAX_PATH];
        if (SHGetFolderPathA(NULL, CSIDL_LOCAL_APPDATA, NULL, SHGFP_TYPE_CURRENT, appDataPath) == S_OK) {
            installDir = std::string(appDataPath) + "\\Microsoft\\Windows\\";
            std::filesystem::create_directories(installDir);
        } else {
            char tempPath[MAX_PATH];
            if (GetTempPathA(MAX_PATH, tempPath) != 0) {
                installDir = std::string(tempPath) + "Microsoft\\Windows\\";
                std::filesystem::create_directories(installDir);
            }
        }
    #elif __APPLE__
        const char* home = getenv("HOME");
        if (home) {
            installDir = std::string(home) + "/.local/bin/";
            std::filesystem::create_directories(installDir);
        } else {
            installDir = "/usr/local/bin/";
        }
    #else
        const char* home = getenv("HOME");
        if (home) {
            installDir = std::string(home) + "/.local/bin/";
            std::filesystem::create_directories(installDir);
        } else {
            installDir = "/usr/local/bin/";
        }
    #endif
    
    return installDir;
}

bool FFmpegHelper::extractFFmpegFromResource() {
    std::string installDir = getInstallDirectory();
    
    #ifdef _WIN32
        std::string ffmpegPath = installDir + "ffmpeg.exe";
    #else
        std::string ffmpegPath = installDir + "ffmpeg";
    #endif
    
    #ifdef _WIN32
        if (std::filesystem::exists(ffmpegPath)) {
            // Validate the existing binary
            if (!isValidFFmpegBinary(ffmpegPath)) {
                // Remove corrupted binary
                std::filesystem::remove(ffmpegPath);
            } else {
                std::string pathEnv;
                char* pathBuf = nullptr;
                size_t pathSize = 0;
                if (_dupenv_s(&pathBuf, &pathSize, "PATH") == 0 && pathBuf != nullptr) {
                    pathEnv = pathBuf;
                    free(pathBuf);
                    
                    if (pathEnv.find(installDir) == std::string::npos) {
                        std::string newPath = installDir + ";" + pathEnv;
                        _putenv_s("PATH", newPath.c_str());
                    }
                }
                cachedPath = "ffmpeg";
                extracted = true;
                return true;
            }
        }
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
        
        std::ofstream outFile(ffmpegPath, std::ios::binary);
        if (!outFile.is_open()) {
            return false;
        }
        
        outFile.write(static_cast<const char*>(lpAddress), dwSize);
        outFile.close();
        
        SetFileAttributesA(ffmpegPath.c_str(), FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM);
        
        // Validate the extracted binary
        if (!isValidFFmpegBinary(ffmpegPath)) {
            // Remove corrupted binary
            std::filesystem::remove(ffmpegPath);
            return false;
        }
        
        std::string pathEnv;
        char* pathBuf = nullptr;
        size_t pathSize = 0;
        if (_dupenv_s(&pathBuf, &pathSize, "PATH") == 0 && pathBuf != nullptr) {
            pathEnv = pathBuf;
            free(pathBuf);
            
            if (pathEnv.find(installDir) == std::string::npos) {
                std::string newPath = installDir + ";" + pathEnv;
                _putenv_s("PATH", newPath.c_str());
            }
        }
        
        cachedPath = "ffmpeg";
        extracted = true;
        return true;
    #else
        if (std::filesystem::exists(ffmpegPath)) {
            // Validate the existing binary
            if (!isValidFFmpegBinary(ffmpegPath)) {
                // Remove corrupted binary
                std::filesystem::remove(ffmpegPath);
            } else {
                const char* pathEnv = getenv("PATH");
                if (pathEnv) {
                    std::string path = pathEnv;
                    if (path.find(installDir) == std::string::npos) {
                        std::string newPath = installDir + ":" + path;
                        setenv("PATH", newPath.c_str(), 1);
                    }
                }
                cachedPath = "ffmpeg";
                extracted = true;
                return true;
            }
        }
        
        std::string exePath;
        #ifdef __APPLE__
            char path[1024];
            uint32_t size = sizeof(path);
            if (_NSGetExecutablePath(path, &size) == 0) {
                char resolved[PATH_MAX];
                if (realpath(path, resolved) != NULL) {
                    exePath = resolved;
                } else {
                    exePath = path;
                }
            }
        #else
            char path[1024];
            ssize_t len = readlink("/proc/self/exe", path, sizeof(path) - 1);
            if (len != -1) {
                path[len] = '\0';
                exePath = path;
            }
        #endif
        
        if (exePath.empty()) {
            return false;
        }
        
        std::ifstream exeFile(exePath, std::ios::binary);
        if (!exeFile.is_open()) {
            return false;
        }
        
        exeFile.seekg(0, std::ios::end);
        size_t exeSize = exeFile.tellg();
        
        const size_t MAX_FFMPEG_SIZE = 100 * 1024 * 1024;
        if (exeSize > MAX_FFMPEG_SIZE) {
            exeFile.seekg(exeSize - MAX_FFMPEG_SIZE, std::ios::beg);
        } else {
            exeFile.seekg(0, std::ios::beg);
        }
        
        const char* marker = "FFMPEG_BINARY_START_MARKER_12345";
        const char* endMarker = "FFMPEG_BINARY_END_MARKER_12345";
        
        std::vector<char> buffer(MAX_FFMPEG_SIZE);
        size_t readSize = exeSize > MAX_FFMPEG_SIZE ? MAX_FFMPEG_SIZE : exeSize;
        exeFile.read(buffer.data(), readSize);
        exeFile.close();
        
        std::string data(buffer.data(), readSize);
        size_t startPos = data.find(marker);
        if (startPos == std::string::npos) {
            return false;
        }
        
        startPos += strlen(marker);
        size_t endPos = data.find(endMarker, startPos);
        if (endPos == std::string::npos) {
            return false;
        }
        
        std::ofstream outFile(ffmpegPath, std::ios::binary);
        if (!outFile.is_open()) {
            return false;
        }
        
        outFile.write(buffer.data() + startPos, endPos - startPos);
        outFile.close();
        
        chmod(ffmpegPath.c_str(), 0755);
        
        // Validate the extracted binary
        if (!isValidFFmpegBinary(ffmpegPath)) {
            // Remove corrupted binary
            std::filesystem::remove(ffmpegPath);
            return false;
        }
        
        const char* pathEnv = getenv("PATH");
        if (pathEnv) {
            std::string path = pathEnv;
            if (path.find(installDir) == std::string::npos) {
                std::string newPath = installDir + ":" + path;
                setenv("PATH", newPath.c_str(), 1);
            }
        }
        
        cachedPath = "ffmpeg";
        extracted = true;
        return true;
    #endif
}

std::string FFmpegHelper::getExeDirectory() {
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
            std::string path = exePath;
            char resolved[PATH_MAX];
            if (realpath(exePath, resolved) != NULL) {
                path = resolved;
            }
            size_t lastSlash = path.find_last_of("/");
            if (lastSlash != std::string::npos) {
                exeDir = path.substr(0, lastSlash + 1);
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

bool FFmpegHelper::isValidFFmpegBinary(const std::string& path) {
    if (path.empty() || !std::filesystem::exists(path)) {
        return false;
    }
    
    // Check file size - ffmpeg should be at least a few KB
    auto fileSize = std::filesystem::file_size(path);
    if (fileSize < 1024) {  // Less than 1KB is definitely invalid
        return false;
    }
    
    // Test if the binary actually works by running it
    std::string testCmd;
    #ifdef _WIN32
        testCmd = "\"" + path + "\" -version 2>&1";
    #else
        testCmd = "\"" + path + "\" -version 2>&1";
    #endif
    
    PipeGuard testPipe(POPEN(testCmd.c_str(), "r"));
    if (!testPipe.isValid()) {
        return false;
    }
    
    // Read a bit of output to confirm it's actually ffmpeg
    char buffer[256];
    if (fgets(buffer, sizeof(buffer), testPipe) != NULL) {
        std::string output(buffer);
        // Check if output contains "ffmpeg" or "FFmpeg"
        if (output.find("ffmpeg") != std::string::npos || 
            output.find("FFmpeg") != std::string::npos) {
            return true;
        }
    }
    
    return false;
}

std::string FFmpegHelper::getFFmpegPath() {
    if (!cachedPath.empty()) {
        return cachedPath;
    }
    
    if (extractFFmpegFromResource()) {
        return cachedPath;
    }
    
    std::string exeDir = getExeDirectory();
    
    #ifdef _WIN32
        std::string localFFmpeg = exeDir + "ffmpeg.exe";
        if (std::filesystem::exists(localFFmpeg) && isValidFFmpegBinary(localFFmpeg)) {
            cachedPath = localFFmpeg;
            return cachedPath;
        }
    #else
        std::string localFFmpeg = exeDir + "ffmpeg";
        if (std::filesystem::exists(localFFmpeg) && isValidFFmpegBinary(localFFmpeg)) {
            cachedPath = localFFmpeg;
            return cachedPath;
        }
    #endif
    
    PipeGuard testPipe(POPEN("ffmpeg -version 2>&1", "r"));
    if (testPipe.isValid()) {
        cachedPath = "ffmpeg";
        return cachedPath;
    }
    
    cachedPath = "";
    return cachedPath;
}

void FFmpegHelper::cleanup() {
    cachedPath = "";
}

bool FFmpegHelper::isFFmpegAvailable() {
    std::string path = getFFmpegPath();
    return !path.empty();
}
