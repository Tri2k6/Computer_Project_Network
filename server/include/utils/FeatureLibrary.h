#pragma once 

#ifndef FEATURE_LIBRARY_H
#define FEATURE_LIBRARY_H

#include <algorithm>
#include <array>
#include <atomic>
#include <chrono>
#include <codecvt>
#include <cctype>
#include <filesystem>
#include <fstream>
#include <functional>
#include <iostream>
#include <locale>
#include <memory>
#include <mutex>
#include <queue>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include <vector>
#include <cstdio>
#include <cstdlib>

#ifdef _WIN32
    #define OS_TYPE "Windows"

    #ifndef WIN32_LEAN_AND_MEAN
    #define WIN32_LEAN_AND_MEAN
    #endif

    #include <Winsock2.h>
    #include <Windows.h>
    #include <fcntl.h>
    #include <io.h>
    #include <shellapi.h>
    #include <shlobj.h>
    #include <shobjidl.h>
    #include <tlhelp32.h>

    #ifdef __APPLE__
        #undef __APPLE__
    #endif

    #define PAUSE_CMD "pause"
    #define POPEN _popen
    #define PCLOSE _pclose
    #define POPEN_MODE "rb"

    inline void setupConsole() {
        SetConsoleOutputCP(CP_UTF8);
        SetConsoleCP(CP_UTF8);
    }

    inline std::string getHostName() {
        char buffer[MAX_COMPUTERNAME_LENGTH + 1];
        DWORD size = MAX_COMPUTERNAME_LENGTH + 1;
        if (GetComputerNameA(buffer, &size)) {
            return std::string(buffer);
        }
        return "Unknown_Win_PC";
    }

#elif __APPLE__
    #define OS_TYPE "MacOS"
    #define PAUSE_CMD "read -n 1 -s -r -p 'Press any key to continue'"

    #include <ApplicationServices/ApplicationServices.h>
    #include <Carbon/Carbon.h>
    #include <libproc.h>
    #include <limits.h>
    #include <pwd.h>
    #include <signal.h>
    #include <spawn.h>
    #include <sys/sysctl.h>
    #include <sys/types.h>
    #include <unistd.h>

    #define POPEN popen
    #define PCLOSE pclose
    #define POPEN_MODE "r"

    inline void setupConsole() {}

    inline std::string getHostName() {
        char buffer[256];
        if (gethostname(buffer, sizeof(buffer)) == 0) {
            return std::string(buffer);
        }
        return "Unknown_Mac";
    }

#elif __linux__
    #define OS_TYPE "Linux"
    #define PAUSE_CMD "read -n 1 -s -r -p 'Press any key to continue'"

    #include <dirent.h>
    #include <limits.h>
    #include <pwd.h>
    #include <signal.h>
    #include <sys/types.h>
    #include <unistd.h>
    #include <X11/Xlib.h>
    #include <X11/keysym.h>
    #include <X11/extensions/XRecord.h>

    #define POPEN popen
    #define PCLOSE pclose
    #define POPEN_MODE "r"

    inline void setupConsole() {}

    inline std::string getHostName() {
        char buffer[256];
        if (gethostname(buffer, sizeof(buffer)) == 0) {
            return std::string(buffer);
        }
        return "Unknown_Linux";
    }

#else
    #define OS_TYPE "Unknown"
    #define PAUSE_CMD ""
    #define POPEN popen
    #define PCLOSE pclose
    #define POPEN_MODE "r"

    inline void setupConsole() {}
    inline std::string getHostName() { return "Unknown_Device"; }
#endif

#include <nlohmann/json.hpp>
#include <boost/asio.hpp>
#include <boost/beast.hpp>
#include <boost/system/error_code.hpp>
#include <boost/beast/ssl.hpp>
#include <boost/asio/ssl.hpp>

namespace fs = std::filesystem;
using json = nlohmann::json;
using namespace std;

#endif
