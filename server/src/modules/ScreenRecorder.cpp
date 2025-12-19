#include "ScreenRecorder.h"
#include <cstdlib>

ScreenRecorder::ScreenRecorder() {
}

std::string ScreenRecorder::recordRawData(int durationSeconds) {
    #ifdef __APPLE__
        // macOS: Set environment variables to suppress Objective-C warnings
        setenv("OBJC_DISABLE_INITIALIZE_FORK_SAFETY", "YES", 1);
        setenv("OBJC_PRINT_WARNINGS", "NO", 1);
    #endif
    
    std::string cmd;
    
    #ifdef _WIN32
        // Windows: gdigrab, H.264, 30fps, pipe-compatible MP4
        cmd = "ffmpeg -loglevel quiet -f gdigrab -framerate 30 -i desktop -t " + to_string(durationSeconds) + 
              " -c:v libx264 -pix_fmt yuv420p -f mp4 -movflags frag_keyframe+empty_moov+default_base_moof -";
    #elif __APPLE__
        // macOS: avfoundation, main display, pipe-compatible MP4
        cmd = "ffmpeg -loglevel quiet -f avfoundation -framerate 30 -pixel_format uyvy422 -i \"1:none\" -t " + to_string(durationSeconds) + 
              " -pix_fmt yuv420p -f mp4 -movflags frag_keyframe+empty_moov -";
    #endif

    // Mở Pipe với chế độ đọc Binary (POPEN_MODE đã định nghĩa trong FeatureLibrary.h là "rb" hoặc "r")
    FILE* pipe = POPEN(cmd.c_str(), POPEN_MODE);
    if (!pipe) {
        // cerr << "[ERROR] Khong the mo Pipe FFmpeg Screen Recorder!" << endl;
        return "";
    }

    cout << "[INFO] Dang quay man hinh Desktop trong " << durationSeconds << "s..." << endl;

    array<char, 4096> buffer;
    std::string rawData;
    size_t bytesRead;

    // Đọc dữ liệu từ pipe
    while ((bytesRead = fread(buffer.data(), 1, buffer.size(), pipe)) > 0) {
        rawData.append(buffer.data(), bytesRead);
    }

    PCLOSE(pipe);
    
    if (rawData.empty()) {
        cerr << "[WARNING] Khong thu duoc du lieu man hinh." << endl;
    } else {
        cout << "[SUCCESS] Da thu duoc " << rawData.size() << " bytes du lieu man hinh." << endl;
    }

    return rawData;
}

std::string ScreenRecorder::recordBase64(int durationSeconds) {
    // 1. Lấy dữ liệu thô
    std::string rawData = recordRawData(durationSeconds);
    
    if (rawData.empty()) {
        return "";
    }

    // 2. Sử dụng hàm base64_encode từ utils/base64.h
    // Cần ép kiểu từ char* (của std::string) sang unsigned char*
    return base64_encode(reinterpret_cast<const unsigned char*>(rawData.c_str()), rawData.length());
}