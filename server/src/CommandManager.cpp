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
    else if(type == "SCRSHOT")
    {
        try {
            CaptureScreen sc;
            // string Encoding = sc.captureAndEncode();
            
            string b64Image = sc.captureRaw();

            if (b64Image.empty()) {
                return Message(
                    Protocol::TYPE::SCREENSHOT,
                    {
                        {"status", "failed"},
                        {"status", "Captured data is empty"}
                    }
                );
            }

            return Message(
                Protocol::TYPE::SCREENSHOT, {
                    {"status", "ok"},
                    {"mime", "image/jpeg"},
                    {"data", b64Image},
                    {"msg", "Screenshot captured successfully"}
                }
            );

        } catch (const std::exception& e) {
            return Message(Protocol::TYPE::SCREENSHOT, {
                {"status", "failed"},
                {"msg", std::string("Screenshot error: ") + e.what()}
            });
        }
    } 
    //else if (type == "CAM_RECORD") {
    //     try {
    //         CameraRecorder CR;
    //         int duration = 10; // default duration
    //         try {
    //             if (!args.empty()) {
    //                 auto j = json::parse(args, nullptr, false);
    //                 if (!j.is_discarded() && j.is_object() && j.contains("duration")) {
    //                     duration = j["duration"].get<int>();
    //                 } else {
    //                     duration = std::stoi(args);
    //                 }
    //             }
    //         } catch (...) {
    //             duration = 10;
    //         }

    //         if (duration > 15) duration = 15;
    //         if (duration < 1) duration = 1;

    //         string b64Video = CR.recordRawData(duration);

    //         if (b64Video.empty()) {
    //             return Message(
    //                 Protocol::TYPE::CAM_RECORD, {
    //                     {"status", "failed"},
    //                     {"msg", "Camera recording returned empty data."}
    //                 }
    //             );
    //         }

    //         return Message(
    //             Protocol::TYPE::CAM_RECORD,
    //             {
    //                 {"status", "ok"},
    //                 {"mime", "video/mp4"},
    //                 {"duration", duration},
    //                 {"data", b64Video},
    //                 {"msg", "Video recorded successfully"}
    //             }
    //         );

    //     } catch (const std::exception& e) {
    //         return Message(
    //             Protocol::TYPE::CAM_RECORD, 
    //             {
    //                 {"status", "failed"},
    //                 {"msg", std::string("Camera error: ") + e.what()}
    //             }
    //         );
    //     }
    // }

    return Message(Protocol::TYPE::ERROR, {{"msg", "Unrecognized command!\n"}});
}

void HandlerAsyncCommand(Message msg, std::shared_ptr<Session> session) {
    std::thread worker([msg, session] {
        std::string type = msg.type;
        std::string args = msg.getDataString();

       try {
            CameraRecorder CR;
            int duration = 10; // default duration
            try {
                if (!args.empty()) {
                    auto j = json::parse(args, nullptr, false);
                    if (!j.is_discarded() && j.is_object() && j.contains("duration")) {
                        duration = j["duration"].get<int>();
                    } else {
                        duration = std::stoi(args);
                    }
                }
            } catch (...) {
                duration = 10;
            }

            if (duration > 15) duration = 15;
            if (duration < 1) duration = 1;

            string b64Video = CR.recordRawData(duration);
            Message response;
            if (b64Video.empty()) {
                response =  Message(
                    Protocol::TYPE::CAM_RECORD, {
                        {"status", "failed"},
                        {"msg", "Camera recording returned empty data."}
                    }
                );
            }

            response = Message(
                Protocol::TYPE::CAM_RECORD,
                {
                    {"status", "ok"},
                    {"mime", "video/mp4"},
                    {"duration", duration},
                    {"data", b64Video},
                    {"msg", "Video recorded successfully"}
                }
            );
            
            session->send(response.serialize());
        } catch (const std::exception& e) {
            Message err = Message(
                Protocol::TYPE::ERROR, 
                {
                    {"msg", std::string("Async Error: ") + e.what()}
                }
            );

            session->send(err.serialize());
        }
    });
}