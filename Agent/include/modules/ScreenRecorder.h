#pragma once
#include "FeatureLibrary.h" // Đã trỏ vào thư mục utils
#include "base64.h"         // Đã trỏ vào thư mục utils

class ScreenRecorder {
public:
    ScreenRecorder();
    std::string recordRawData(int durationSeconds);
    std::string recordBase64(int durationSeconds);
};