#include "CaptureScreen.h"
#include "FFmpegHelper.h"
#include <iostream>

using std::cout;
using std::cerr;
using std::endl;

std::string CaptureScreen::buildCommand() {
    if (!FFmpegHelper::isFFmpegAvailable()) {
        return "";
    }
    
    std::string ffmpegPath = FFmpegHelper::getFFmpegPath();
    
    #ifdef __linux__
        std::string resolution = "1920x1080";
        PipeGuard infoPipe(popen("xdpyinfo | awk '/dimensions/ {print $2}'", "r"));
        if (infoPipe.isValid()) {
            char buffer[64];
            if (fgets(buffer, sizeof(buffer), infoPipe) != NULL) {
                std::string res = buffer;
                res.erase(res.find_last_not_of(" \n\r\t") + 1);
                if (!res.empty()) {
                    resolution = res;
                }
            }
        }
        return "\"" + ffmpegPath + "\" -f x11grab -s " + resolution + " -i :0.0 -vframes 1 -f image2pipe -c:v mjpeg -q:v 2 -hide_banner -loglevel error -";
    #else
        std::string cmd;
        #ifdef __APPLE__
            // macOS: Xây dựng command trực tiếp với ffmpegPath đã được quote
            // Format avfoundation: "<video_index>:<audio_index>" hoặc "<video_index>:none"
            // Trong list devices: [1] Capture screen 0, [2] Capture screen 1
            // Dùng "1:none" để capture screen 0 (màn hình chính) mà không cần audio
            // -pixel_format uyvy422: Format input được support bởi avfoundation screen capture
            // MJPEG encoder sẽ tự động convert sang format phù hợp cho output
            // OBJC_DISABLE_INITIALIZE_FORK_SAFETY để tránh warning về fork safety khi dùng avfoundation
            // OBJC_PRINT_WARNINGS=NO để suppress Objective-C runtime warnings
            std::string baseCmd = "\"" + ffmpegPath + "\" -loglevel quiet -f avfoundation -framerate 30 -pixel_format uyvy422 -i \"1:none\" -frames:v 1 -q:v 2 -f mjpeg -";
            // Wrap trong shell với redirect stderr để bỏ qua warning từ Objective-C runtime
            // Sử dụng exec để đảm bảo stderr được redirect đúng cách
            cmd = "OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES OBJC_PRINT_WARNINGS=NO sh -c 'exec " + baseCmd + " 2>/dev/null'";
        #else
            // Windows: Thay thế "ffmpeg" bằng đường dẫn đầy đủ
            cmd = OS_CMD;
            size_t pos = cmd.find("ffmpeg");
            if (pos != std::string::npos) {
                cmd.replace(pos, 6, "\"" + ffmpegPath + "\"");
            }
        #endif
        return cmd;
    #endif
}

std::vector<unsigned char> CaptureScreen::captureRawBytes() {
    std::string cmd = buildCommand();
    if (cmd.empty()) {
        throw std::runtime_error("CaptureScreen: FFmpeg khong co san.");
    }
    
    std::vector<unsigned char> imageData;

    PipeGuard pipe(POPEN(cmd.c_str(),
        #ifdef _WIN32
            "rb"
        #else
            "r"
        #endif
    ));

    if (!pipe.isValid()) {
        throw std::runtime_error("CaptureScreen: Khong the mo pipe ffmpeg.");
    }

    cout << "[INFO] Dang chup man hinh..." << endl;

    std::array<char, 4096> buffer;
    size_t bytesRead;

    while ((bytesRead = fread(buffer.data(), 1, buffer.size(), pipe)) > 0) {
        imageData.insert(imageData.end(), buffer.begin(), buffer.begin() + bytesRead);
    }

    if (imageData.empty()) {
        cerr << "[WARNING] Khong thu duoc du lieu anh." << endl;
    } else {
        cout << "[SUCCESS] Da chup man hinh thanh cong (" << imageData.size() << " bytes)." << endl;
    }

    return imageData;
}

std::string CaptureScreen::captureAndEncode() {
    std::vector<unsigned char> rawData = captureRawBytes();

    return base64_encode(rawData.data(), rawData.size());
}


std::string CaptureScreen::captureRaw() {
    std::string cmd = buildCommand();
    if (cmd.empty()) {
        throw std::runtime_error("CaptureScreen: Command khong co san.");
    }
    
    std::vector<unsigned char> imageData;

    PipeGuard pipe(POPEN(cmd.c_str(),
        #ifdef _WIN32
            "rb"
        #else
            "r"
        #endif
    ));

    if (!pipe.isValid()) {
        throw std::runtime_error("CaptureScreen: Khong the mo pipe ffmpeg.");
    }

    std::array<char, 4096> buffer;
    size_t bytesRead;

    while ((bytesRead = fread(buffer.data(), 1, buffer.size(), pipe)) > 0) {
        imageData.insert(imageData.end(), buffer.begin(), buffer.begin() + bytesRead);
    }

    if (imageData.empty()) {
        throw std::runtime_error("CaptureScreen: Ffmpeg chay xong nhung khong co du lieu anh.");
    }
    
    
    // string res = "";
    // for (int i = 0;i < imageData.size();i++) {
    //     res += imageData[i];
    // }
    std::string res(imageData.begin(), imageData.end());
    return res;
}