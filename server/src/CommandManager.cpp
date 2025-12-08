#include "CommandManager.hpp"

#define UNICODE
#define _UNICODE

std::string ParseCommand(Message msg) {
    size_t cut = msg.data.find(",", 0);
    std::string cmd = msg.data.substr(0, cut);
    std::string left = msg.data.substr(cut + 1);
    
    #ifdef __APPLE__
    MacAppController ac;
    MacProcessController pc;
    #endif

    #ifdef _WIN32
    WinAppController ac;
    WinProcessController pc;
    #endif

    if (cmd == "LISTAPP")
    {
        cerr << "Toi bi ngu";
        return ac.listApps();
    }
    else if(cmd == "STARTAPP")
    {
        int id = -1;
        id = stoi(left);

        if (id < 0)
            return "Invalid index!\n";

        else {
            if (ac.startApp(ac.getApp(id)))
                return "Successful!\n";
            else 
                return "Failed!\n";
        }
    }
    else if(cmd == "STOPAPP")
    {
        int id = -1;
        id = stoi(left);

        if (id < 0)
            return "Invalid index!\n";

        else {
            if (ac.stopApp(ac.getApp(id)))
                return "Successful!\n";
            else 
                return "Failed!\n";
        }
    }
    else if(cmd == "LISTPROC")
    {
        return pc.listProcesses();
    }
    else if(cmd == "STARTPROC")
    {
        int id = -1;
        id = stoi(left);
        
        if (id < 0)
            return "Invalid index!\n";

        else {
            if (pc.startProcess(pc.getProcess(id)))
                return "Successful!\n";
            else 
                return "Failed!\n";
        }
    }
    else if(cmd == "STOPPROC")
    {
        int id = -1;
        id = stoi(left);
        
        if (id < 0)
            return "Invalid index!\n";

        else {
            if (pc.stopProcess(pc.getProcess(id)))
                return "Successful!\n";
            else 
                return "Failed!\n";
        }
    }
    else if(cmd == "SCRSHOT")
    {
        CaptureScreen sc;
        // string Encoding = sc.captureAndEncode();
        
        string imageBuffer = sc.captureRaw();

        std::string filename = "screenshot_output.jpg";
        std::cout << "3. Dang luu ra file: " << filename << "..." << std::endl;

        // Mở file output với cờ std::ios::binary (Bắt buộc cho ảnh)
        std::ofstream outFile(filename, std::ios::binary);
        
        if (outFile.is_open()) {
            // Ép kiểu dữ liệu từ unsigned char* sang char* để hàm write hiểu
            outFile.write(reinterpret_cast<const char*>(imageBuffer.data()), imageBuffer.size());
            outFile.close();
            std::cout << "=== THANH CONG! Hay mo file " << filename << " de xem anh. ===" << std::endl;
        } else {
            std::cerr << "Loi: Khong the tao file tren dia." << std::endl;
        }
    } else if (cmd == "CAM_RECORD") {
        CameraRecorder CR;

        string imageBuffer = CR.recordRawData(10);

        std::string filename = "screenshot_output.mp4";
        std::cout << "3. Dang luu ra file: " << filename << "..." << std::endl;

        // Mở file output với cờ std::ios::binary (Bắt buộc cho ảnh)
        std::ofstream outFile(filename, std::ios::binary);
        
        if (outFile.is_open()) {
            // Ép kiểu dữ liệu từ unsigned char* sang char* để hàm write hiểu
            outFile.write(reinterpret_cast<const char*>(imageBuffer.data()), imageBuffer.size());
            outFile.close();
            std::cout << "=== THANH CONG! Hay mo file " << filename << " de xem anh. ===" << std::endl;
        } else {
            std::cerr << "Loi: Khong the tao file tren dia." << std::endl;
        }
    }

    return "Unrecognized command!\n";
}