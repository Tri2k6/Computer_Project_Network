#include "CommandManager.hpp"

#define UNICODE
#define _UNICODE

Message ParseCommand(Message msg) {
    std::string type = msg.type;
    std::string args = msg.getDataString();

    #ifdef __APPLE__
    MacAppController ac;
    MacProcessController pc;
    #endif

    #ifdef _WIN32
    WinAppController ac;
    WinProcessController pc;
    #endif
    
    // ScreenCapture sc;
    // WebcamController wc;

    if (type == Protocol::TYPE::APP_LIST)
    {   
        #ifdef __APPLE__
            std::vector<MacApp> apps = ac.listApps();
        #elif _WIN32
            return Message(Protocol::TYPE::APP_LIST, {{"list", ac.listApps()}});
        #endif

        #ifdef __APPLE__
            json jArray =json::array();
            int i = 0;
            for (const auto& app: apps) {
                jArray.push_back({
                    {"id", i++},
                    {"name", app.name}
                });
            }
            return Message(Protocol::TYPE::APP_LIST, jArray);
        
        #endif
        return Message(Protocol::TYPE::ERROR, {{"msg", "OS not support."}});
    }
    else if(type == "STARTAPP")
    {   
        try {
            int id = -1;
            id = stoi(args);

            if (id < 0)
                return Message(Protocol::TYPE::APP_START, {
                    {"status", "failed"},
                    {"msg", "Invalid id.\n"}
                });
            else {
                if (ac.startApp(ac.getApp(id)))
                    return Message(Protocol::TYPE::APP_START, {
                        {"status", "ok"},
                        {"msg", "Successful!\n"},
                        {"id", id}
                    });
                else 
                    return Message(Protocol::TYPE::APP_START, {
                        {"status", "failed"},
                        {"msg", "Invalid id.\n"}
                    });
            }
        } catch(...) {
            return Message(Protocol::TYPE::ERROR, {{"msg", "Invalid ID.\n"}});
        }
    }
    else if(type == "STOPAPP")
    {   
        try {
            int id = -1;
            id = stoi(args);

            if (id < 0)
                return Message(Protocol::TYPE::APP_KILL, {
                    {"status", "failed"},
                    {"msg", "Invalid id.\n"}
                });
            else {
                if (ac.stopApp(ac.getApp(id)))
                    return Message(Protocol::TYPE::APP_KILL, {
                        {"status", "ok"},
                        {"msg", "Successful!\n"},
                        {"id", id}
                    });
                else 
                    return Message(Protocol::TYPE::APP_KILL, {
                        {"status", "failed"},
                        {"msg", "Invalid id.\n"}
                    });
            }
        } catch(...) {
            return Message(Protocol::TYPE::ERROR, {{"msg", "Invalid ID.\n"}});
        }
    }
    else if(type == "LISTPROC")
    {
        #ifdef __APPLE__
            std::vector<MacProcess> apps = pc.listProcesses();
            json j = apps;
            return Message(Protocol::TYPE::PROC_LIST, j);
        #elif _WIN32
            return Message(Protocol::TYPE::PROC_LIST, {{"list", pc.listProcesses()}});
        #endif
    }
    else if(type == "STARTPROC")
    {
        try {
            int id = -1;
            id = stoi(args);
            
            if (id < 0)
                return Message(Protocol::TYPE::PROC_START, {
                        {"status", "failed"},
                        {"msg", "Invalid id.\n"}
                    });
            else {
                if (pc.startProcess(pc.getProcess(id)))
                    return Message(Protocol::TYPE::PROC_START, {
                        {"status", "ok"},
                        {"msg", "Successful!\n"},
                        {"id", id}
                    });
                else 
                    return Message(Protocol::TYPE::PROC_START, {
                        {"status", "failed"},
                        {"msg", "Invalid id.\n"}
                    });
            }
        }
        catch(...) {
            return Message(Protocol::TYPE::ERROR, {{"msg", "Invalid ID.\n"}});
        }
    }
    else if(type == "STOPPROC")
    {
        try {
            int id = -1;
            id = stoi(args);
            
            if (id < 0)
                return Message(Protocol::TYPE::PROC_KILL, {
                        {"status", "failed"},
                        {"msg", "Invalid id.\n"}
                    });
            else {
                if (pc.stopProcess(pc.getProcess(id)))
                    return Message(Protocol::TYPE::PROC_KILL, {
                        {"status", "ok"},
                        {"msg", "Successful!\n"},
                        {"id", id}
                    });
                else 
                    return Message(Protocol::TYPE::PROC_KILL, {
                        {"status", "failed"},
                        {"msg", "Invalid id.\n"}
                    });
            }
        }
        catch(...) {
            return Message(Protocol::TYPE::ERROR, {{"msg", "Invalid ID.\n"}});
        }
    }
    // else if(cmd == "SCRSHOT")
    // {
    //     // sc.captureNow();
    // }
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

    return Message(Protocol::TYPE::ERROR, {{"msg", "Unrecognized command!\n"}});
}