#include "CameraRecorder.h"

std::string CameraRecorder::dectectDefaultCamera() {
    std::string detectedName = "";
    #ifdef _WIN32
        const char* cmd = "ffmpeg -hide_banner -list_devices true -f dshow -i dummy 2>&1";
        FILE* pipe = POPEN(cmd, "r"); // Text mode để đọc log
        if (!pipe) return "";
        char buffer[512];
        while (fgets(buffer, sizeof(buffer), pipe) != NULL) {
            std::string line = buffer;
            // Tìm dòng có "(video)" và KHÔNG có "Alternative name"
            if (line.find("(video)") != std::string::npos && line.find("Alternative name") == std::string::npos) {
                size_t firstQuote = line.find("\"");
                size_t secondQuote = line.find("\"", firstQuote + 1);
                if (firstQuote != std::string::npos && secondQuote != std::string::npos) {
                    std::string name = line.substr(firstQuote + 1, secondQuote - firstQuote - 1);
                    // Bỏ qua OBS nếu cần
                    if (name.find("OBS") != std::string::npos) continue;
                    detectedName = name;
                    break;
                }
            }
        }
        PCLOSE(pipe);
    #elif __APPLE__
        detectedName = "0"; // Mac mặc định là 0
    #endif
    return detectedName;
}

CameraRecorder::CameraRecorder() {
    cameraName = dectectDefaultCamera();
}

std::string CameraRecorder::recordRawData(int durationSeconds) {
    if (cameraName.empty()) {
        cerr << "[ERROR] Khong tim thay Camera nao!" << endl;
        return "";
    }

    std::string cmd;
    #ifdef _WIN32
        // Windows: Dùng dshow, xuất ra stdout (-)
        cmd = "ffmpeg -loglevel quiet -f dshow -i video=\"" + cameraName + "\" -t " + to_string(durationSeconds) + 
                " -f mp4 -movflags frag_keyframe+empty_moov -"; 
    #elif __APPLE__
        // macOS: Dùng avfoundation, xuất ra stdout (-)
        cmd = "ffmpeg -loglevel quiet -f avfoundation -framerate 30 -pixel_format uyvy422 -i \"" + cameraName + "\" -t " + to_string(durationSeconds) + 
                " -pix_fmt yuv420p -f mp4 -movflags frag_keyframe+empty_moov -";
    #endif

    FILE* pipe = POPEN(cmd.c_str(), POPEN_MODE);
    if (!pipe) {
        // cerr << "[ERROR] Khong the mo Pipe FFmpeg!" << endl;
        return "";
    }

    cout << "[INFO] Dang quay Webcam (" << cameraName << ") trong " << durationSeconds << "s..." << endl;

    // Đọc dữ liệu từ Pipe vào std::string
    // std::string trong C++ chứa được cả ký tự null (\0) nên dùng làm buffer nhị phân tốt
    array<char, 4096> buffer;
    std::string rawData;
    size_t bytesRead;

    while ((bytesRead = fread(buffer.data(), 1, buffer.size(), pipe)) > 0) {
        rawData.append(buffer.data(), bytesRead);
    }

    PCLOSE(pipe);
    
    if (rawData.empty()) {
        cerr << "[WARNING] Khong thu duoc du lieu video (co the Camera dang ban hoac sai ten)." << endl;
    } else {
        cout << "[SUCCESS] Da thu duoc " << rawData.size() << " bytes du lieu Raw." << endl;
    }

    return rawData;
}

std::string CameraRecorder::convertToBase64(const std::string &rawData) {
    if (rawData.empty()) return "";

    std::string out;
    int val = 0, valb = -6;
    for (unsigned char c : rawData) {
        val = (val << 8) + c;
        valb += 8;
        while (valb >= 0) {
            out.push_back(base64_chars[(val >> valb) & 0x3F]);
            valb -= 6;
        }
    }
    if (valb > -6) out.push_back(base64_chars[((val << 8) >> (valb + 8)) & 0x3F]);
    while (out.size() % 4) out.push_back('=');
    
    return out;
}

std::string CameraRecorder::recordBase64(int durationSeconds) {
    std::string res = recordRawData(durationSeconds);
    return convertToBase64(res);
}