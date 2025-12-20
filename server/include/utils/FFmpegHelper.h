#pragma once
#include "FeatureLibrary.h"

namespace FFmpegUtil {
    // Khởi tạo: Extract ffmpeg từ resource (chỉ cần gọi 1 lần khi khởi động)
    void initialize();
    
    std::string getExeDirectory();
    std::string getFFmpegPath();
    bool isFFmpegAvailable();
}