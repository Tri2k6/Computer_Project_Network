#include "WebcamController.h"

string WebcamController::getCameraNameFromConfig() {
    string configFileName = "../../camera_config.txt";
    ifstream file(configFileName);
    string name = ""; // Khởi tạo rỗng
    
    if (file.is_open()) {
        if (getline(file, name)) {
            // Chỉ xử lý nếu đọc được dòng
            // Xóa ký tự xuống dòng \r (CR) nếu có (do Windows tạo ra)
            if (!name.empty() && name.back() == '\r') {
                name.pop_back();
            }
        }
        file.close();
    } else {
        // Nếu không tìm thấy file config, báo lỗi nhẹ trên màn hình để biết
        cout << "[Webcam Warning] Khong tim thay file " << configFileName << ". Dung Camera mac dinh." << endl;
    }
    
    // Kiểm tra kỹ lần cuối
    if (name.empty()) {
        return "Integrated Camera"; 
    }
    
    return name;
}

string WebcamController::recordVideo(int duration, string fileName) {
    // Tạo thư mục resource
    string resourceDir = "Resource";
    if (!fs::exists(resourceDir)) {
        fs::create_directory(resourceDir);
    }

    string filePath = resourceDir + "/" + fileName + ".mp4";
    string timeStr = to_string(duration);
    string cmd = "";

    #ifdef _WIN32
        // --- WINDOWS: TỰ ĐỘNG NHẬN DIỆN ---
        string camName = getCameraNameFromConfig();
        cout << "[Webcam Auto] Phat hien thiet bi: [" << camName << "]" << endl;
        
        // Lắp tên vào lệnh
        cmd = "ffmpeg -f dshow -i video=\"" + camName + "\" -t " + timeStr + " \"" + filePath + "\" -y -loglevel quiet";

    #elif __linux__
        // LINUX: Mặc định luôn là /dev/video0
        cout << "[Webcam Auto] Su dung /dev/video0" << endl;
        cmd = "ffmpeg -f v4l2 -i /dev/video0 -t " + timeStr + " \"" + filePath + "\" -y -loglevel quiet";

    #elif __APPLE__
        // MACOS: Mặc định là "default"
        cout << "[Webcam Auto] Su dung default device" << endl;
        cmd = "ffmpeg -f avfoundation -i \"default\" -t " + timeStr + " \"" + filePath + "\" -y -loglevel quiet";
    #endif

    // Xóa file cũ nếu tồn tại
    if (fs::exists(filePath)) fs::remove(filePath);

    cout << ">> Dang ghi hinh trong " << duration << " giay..." << endl;
    
    // Thực thi lệnh
    int result = system(cmd.c_str());

    if (result == 0) {
        return "Success: Video saved at " + filePath;
    } else {
        return "Error: FFmpeg failed. (Camera Name detected: " + 
               #ifdef _WIN32
                   getCameraNameFromConfig()
               #else
                   string("default")
               #endif
               + ")";
    }
}