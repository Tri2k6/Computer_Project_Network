#pragma once

// library.h
#ifndef LIBRARY_H
#define LIBRARY_H

// Các thư viện chuẩn C++ dùng chung cho toàn bộ dự án
#include <iostream>
#include <string>
#include <vector>
#include <cstdlib>      // Cho hàm system()
#include <filesystem>   // Cho việc xử lý file/folder (C++17)
#include <chrono>       // Cho xử lý thời gian (nếu cần)
#include <thread>       // Cho đa luồng (nếu cần)
#include <fstream>
#include <nlohmann/json.hpp>

#include "Router.hpp"
#include "Message.hpp"
#include "Protocol.hpp"
#include "Session.hpp"
#include "WSServer.hpp"
#include "base64.hpp"

// Nhận diện Hệ điều hành (OS Detection)
#ifdef _WIN32
    #define OS_TYPE "Windows"
    // Trên Windows, lệnh 'pause' giúp dừng màn hình console
    #define PAUSE_CMD "pause"
    #include <Windows.h>
    #include <iostream>
    #include <io.h>
    #include <fcntl.h>
#elif __APPLE__
    #define OS_TYPE "MacOS"
    #define PAUSE_CMD "read -n 1 -s -r -p 'Press any key to continue'"
#elif __linux__
    #define OS_TYPE "Linux"
    #define PAUSE_CMD "read -n 1 -s -r -p 'Press any key to continue'"
#else
    #define OS_TYPE "Unknown"
    #define PAUSE_CMD ""
#endif

// app & process control
#if defined(_WIN32)
    #include "AppControl_WIN.h"
    #include "ProcessControl_WIN.h"
#elif defined(__APPLE__)
    #include "AppControl_MAC.h"
    #include "ProcessControl_MAC.h"
#endif

// #include "CaptureScreen.h"

// Khai báo namespace dùng chung
using namespace std;
namespace fs = std::filesystem;

#endif // LIBRARY_H