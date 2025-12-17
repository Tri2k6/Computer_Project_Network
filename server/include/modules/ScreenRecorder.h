#pragma once
#include "FeatureLibrary.h" // Đã trỏ vào thư mục utils
#include "base64.h"         // Đã trỏ vào thư mục utils

class ScreenRecorder {
public:
    ScreenRecorder();

    // Quay màn hình và trả về dữ liệu binary (Raw bytes của file MP4)
    std::string recordRawData(int durationSeconds);

    // Quay và trả về chuỗi Base64 (Sử dụng hàm từ utils/base64.h)
    std::string recordBase64(int durationSeconds);
};