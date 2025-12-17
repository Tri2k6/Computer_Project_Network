#pragma once
#include "FeatureLibrary.h"
#include "base64.h"

class CameraCapture {
private:
    std::string cameraName;
    std::string detectDefaultCamera(); // Sửa lại đúng chính tả 'detect'

public:
    CameraCapture();
    
    // Chụp 1 ảnh raw (dạng binary JPEG)
    std::string captureRawData();
    
    // Chuyển đổi sang Base64
    std::string convertToBase64(const std::string& rawData);
    
    // Chụp và trả về chuỗi Base64 luôn
    std::string captureBase64();
};