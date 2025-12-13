#pragma once 

#ifndef FEATURE_LIBRARY_H
#define FEATURE_LIBRARY_H

// Các thư viện chuẩn C++ dùng chung cho toàn bộ dự án
#include <iostream>
#include <string>
#include <vector>
#include <memory>
#include <thread>
#include <chrono>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <functional>
#include <array>
#include <stdexcept>
#include <cstdio>
#include <cstdlib>      // Cho hàm system()
#include <filesystem>   // Cho việc xử lý file/folder (C++17)
#include <locale> // for std::string::wstring_convert
#include <codecvt> // for std::codecvt_utf8
#include <queue>

// OS detection
#ifdef _WIN32
    #define OS_TYPE "Windows"

    #ifdef WIN32_LEAN_AND_MEAN
    #define WIN32_LEAN_AND_MEAN
    #endif

    #include <Winsock2.h>
    #include <Windows.h>
    #include <io.h>
    #include <fcntl.h>
    #include <shellapi.h>

    #ifdef __APPLE__
        #undef __APPLE__
    #endif

    #define PAUSE_CMD "pause"
    #define POPEN _popen
    #define PCLOSE _pclose
    #define POPEN_MODE "rb" //pipe vid, pic

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
        return "Unkown_Win_PC";
    }
#elif __APPLE__
    #define OS_TYPE "MacOS"
    #define PAUSE_CMD "read -n 1 -s -r -p 'Press any key to continue'"

    #include <unistd.h>
    #include <limits.h>
    #include <sys/sysctl.h>
    #include <ApplicationServices/ApplicationServices.h>
    #include <Carbon/Carbon.h>

    #define POPEN popen
    #define PCLOSE pclose
    #define POPEN_MODE "r"

    inline void setupConsole() {}

    inline std::string getHostName() {
        char buffer[256];
        if (gethostname(buffer, sizeof(buffer)) == 0) {
            return std::string(buffer);
        }

        return "Unkown_Mac";
    }

#elif __linux__
    #define OS_TYPE "Linux"
    #define PAUSE_CMD "read -n 1 -s -r -p 'Press any key to continue'"

    #include <unistd.h>
    #include <limits.h>
    
    #define POPEN popen
    #define PCLOSE pclose
    #define POPEN_MODE "r"

    inline void setupConsole() {}

    inline std::string getHostName() {
        char buffer[256];
        if (getHostname(buffer, sizeof(buffer)) == 0) {
            return std::string(buffer);
        }

        return "Unkown_Linux";
    }

#else
    #define OS_TYPE "Unknown"
    #define POPEN popen
    #define PCLOSE pclose
    #define POPEN_MODE "r"
    #define PAUSE_CMD ""
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