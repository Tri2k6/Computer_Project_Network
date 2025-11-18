#include "CaptureScreen.h"

string ScreenCapture::captureNow(string fileName) {
    string resourceDir = "Resource";

    if (!fs::exists(resourceDir)) {
        fs::create_directory(resourceDir);
    }

    string filePath = resourceDir + "/" + fileName + ".jpg";\
    string cmd = "";
    
    #ifdef _WIN32
        cmd = "ffmpeg -f gdigrab -framerate 1 -i desktop -vframes 1 \"" + filePath + "\" -y -loglevel quiet";
    #elif __linux__
        cmd = "ffmpeg -f x11grab -framerate 1 -i :0.0 -vframes 1 \"" + filePath + "\" -y -loglevel quiet";
    #elif __APPLE__
        cmd = "ffmpeg -f avfoundation -i \"1\" -vframes 1 \"" + filePath + "\" -y -loglevel quiet";
    #endif

    cout << "[Screen] Dang chup man hinh tren " << OS_TYPE << "..." << endl;
    int result = system(cmd.c_str());

    if (result == 0) {
        return "Success: Image saved at " + filePath;
    } else {
        return "Error: Failed to capture screen. Check FFmpeg installation.";
    }    
}
