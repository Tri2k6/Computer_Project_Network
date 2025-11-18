// library.h
#ifndef LIBRARY_H
#define LIBRARY_H

// 1. Các thư viện chuẩn C++ dùng chung cho toàn bộ dự án
#include <iostream>
#include <string>
#include <vector>
#include <cstdlib>      // Cho hàm system()
#include <filesystem>   // Cho việc xử lý file/folder (C++17)
#include <chrono>       // Cho xử lý thời gian (nếu cần)
#include <thread>       // Cho đa luồng (nếu cần)
#include <fstream>
#include <Windows.h>

// 2. Macro phát hiện Hệ điều hành (OS Detection)
#ifdef _WIN32
    #define OS_TYPE "Windows"
    // Trên Windows, lệnh 'pause' giúp dừng màn hình console
    #define PAUSE_CMD "pause"
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

// 3. Khai báo namespace dùng chung (để code gọn hơn)
// Lưu ý: Trong dự án lớn, hạn chế dùng 'using namespace' trong file .h
// Nhưng với dự án học tập này thì hoàn toàn ổn.
using namespace std;
namespace fs = std::filesystem;

#endif // LIBRARY_H