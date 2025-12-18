#include "ScreenRecorder.h"

ScreenRecorder::ScreenRecorder() {
    // Mặc định quay màn hình chính nên không cần detect thiết bị như Camera
}

std::string ScreenRecorder::recordRawData(int durationSeconds) {
    std::string cmd;
    
    #ifdef _WIN32
        // Windows: Dùng gdigrab quay toàn màn hình (desktop)
        // -framerate 30: 30 khung hình/giây
        // -c:v libx264: Nén H.264
        // -pix_fmt yuv420p: Đổi hệ màu để tương thích mọi trình phát
        // -movflags ...: Cấu hình MP4 để có thể stream qua pipe mà không lỗi
        cmd = "ffmpeg -loglevel quiet -f gdigrab -framerate 30 -i desktop -t " + to_string(durationSeconds) + 
              " -c:v libx264 -pix_fmt yuv420p -f mp4 -movflags frag_keyframe+empty_moov+default_base_moof -";
    #elif __APPLE__
        // macOS: Dùng avfoundation, quay màn hình số "1" (Main display)
        cmd = "ffmpeg -loglevel quiet -f avfoundation -framerate 30 -pixel_format uyvy422 -i \"1\" -t " + to_string(durationSeconds) + 
              " -pix_fmt yuv420p -f mp4 -movflags frag_keyframe+empty_moov -";
    #endif

    // Mở Pipe với chế độ đọc Binary (POPEN_MODE đã định nghĩa trong FeatureLibrary.h là "rb" hoặc "r")
    PipeGuard pipe(POPEN(cmd.c_str(), POPEN_MODE));
    if (!pipe.isValid()) {
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