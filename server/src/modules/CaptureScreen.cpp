#include "CaptureScreen.h"
#include "utils/FFmpegHelper.h"
#include <thread>
#include <chrono>

std::string CaptureScreen::buildCommand() {
    if (!FFmpegHelper::isFFmpegAvailable()) {
        return "";
    }
    
    std::string ffmpegPath = FFmpegHelper::getFFmpegPath();
    
    #ifdef __linux__
        std::string resolution = "1920x1080";
        FILE* infoPipe = popen("xdpyinfo | awk '/dimensions/ {print $2}'", "r");
        if (infoPipe) {
            char buffer[64];
            if (fgets(buffer, sizeof(buffer), infoPipe) != NULL) {
                std::string res = buffer;
                res.erase(res.find_last_not_of(" \n\r\t") + 1);
                if (!res.empty()) {
                    resolution = res;
                }
            }
            pclose(infoPipe);
        }
        return "\"" + ffmpegPath + "\" -f x11grab -s " + resolution + " -i :0.0 -vframes 1 -f image2pipe -c:v mjpeg -q:v 2 -hide_banner -loglevel error -";
    #else
        std::string cmd = OS_CMD;
        size_t pos = cmd.find("ffmpeg");
        if (pos != std::string::npos) {
            cmd.replace(pos, 6, "\"" + ffmpegPath + "\"");
        }
        return cmd;
    #endif
}

std::vector<unsigned char> CaptureScreen::captureRawBytes() {
    std::string cmd = buildCommand();
    if (cmd.empty()) {
        throw std::runtime_error("CaptureScreen: FFmpeg khong co san.");
    }
    
    std::vector<unsigned char> imageData;

    FILE* pipe = POPEN(cmd.c_str(),
        #ifdef _WIN32
            "rb"
        #else
            "r"
        #endif
    );

    if (!pipe) {
        throw std::runtime_error("CaptureScreen: Khong the mo pipe ffmpeg.");
    }

    std::array<char, 4096> buffer;
    size_t bytesRead;

    while ((bytesRead = fread(buffer.data(), 1, buffer.size(), pipe)) > 0) {
        imageData.insert(imageData.end(), buffer.begin(), buffer.begin() + bytesRead);
    }

    int result = PCLOSE(pipe);

    if (imageData.empty()) {
        throw std::runtime_error("CaptureScreen: Ffmpeg chay xong nhung khong co du lieu anh.");
    }
    

    // std::string filename = "screenshot_output.jpg";
    //     std::cout << "3. Dang luu ra file: " << filename << "..." << std::endl;

    //     std::ofstream outFile(filename, std::ios::binary);

    //     if (outFile.is_open()) {

    //         outFile.write(reinterpret_cast<const char*>(imageData.data()), imageData.size());
    //         outFile.close();
    //         std::cout << "=== THANH CONG! Hay mo file " << filename << " de xem anh. ===" << std::endl;
    //     } else {
    //         std::cerr << "Loi: Khong the tao file tren dia." << std::endl;
    //     }

    return imageData;
}

std::string CaptureScreen::captureAndEncode() {
    std::vector<unsigned char> rawData = captureRawBytes();

    return base64_encode(rawData.data(), rawData.size());
}


std::string CaptureScreen::captureRaw() {
    std::string cmd = buildCommand();
    if (cmd.empty()) {
        throw std::runtime_error("CaptureScreen: FFmpeg khong co san.");
    }
    
    std::vector<unsigned char> imageData;

    FILE* pipe = POPEN(cmd.c_str(),
        #ifdef _WIN32
            "rb"
        #else
            "r"
        #endif
    );

    if (!pipe) {
        throw std::runtime_error("CaptureScreen: Khong the mo pipe ffmpeg.");
    }

    std::array<char, 4096> buffer;
    size_t bytesRead;

    while ((bytesRead = fread(buffer.data(), 1, buffer.size(), pipe)) > 0) {
        imageData.insert(imageData.end(), buffer.begin(), buffer.begin() + bytesRead);
    }

    int result = PCLOSE(pipe);

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