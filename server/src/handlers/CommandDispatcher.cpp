#include "CommandDispatcher.hpp"

CommandDispatcher::CommandDispatcher() {
    registerHandlers();
}

void CommandDispatcher::dispatch(const Message& msg, ResponseCallBack cb) {
    auto it = routes_.find(msg.type);

    if (it != routes_.end()) {
        cout << "[Dispatcher] Handling command: " << msg.type << "\n";

        try {
            it->second(msg, cb);
        } 
        catch (const std::exception& e) {
            json errData = {
                {"status", "failed"},
                {"msg", std::string("Internal Error: "), e.what()}
            };

            cb(
                Message(
                Protocol::TYPE::ERROR,
                errData, 
                "", 
                msg.from
                )
            );
        }
    } else {
        if (msg.type != Protocol::TYPE::AUTH) {
            cout << "[Dispatcher] Unknown command: " << msg.type << "\n";
            cb(
                Message(
                    Protocol::TYPE::ERROR,
                    {
                        {"msg", "Command not supported"}
                    },
                    "",
                    msg.from
                )
            );
        }
    }
}

void CommandDispatcher::registerHandlers() {
    routes_[Protocol::TYPE::PING] = [](const Message& msg, ResponseCallBack cb) {
        cb( Message(
            Protocol::TYPE::PONG,
            { {"msg", "Agent Alive" }},
            "",
            msg.from
        ));
    };

    routes_[Protocol::TYPE::APP_LIST] = [](const Message& msg, ResponseCallBack cb) {
        #if defined(_WIN32) || defined(__APPLES)
            AppController ac;
            auto list = ac.listApps();
            cb(Message(
                Protocol::TYPE::APP_LIST,
                list, 
                "",
                msg.from
            ));
        #else
            cb(Message(
                Protocol::TYPE::ERROR,
                {{"msg", "OS Not Supported"}}, 
                "", 
                msg.from
            ));
        #endif 
    };

    routes_[Protocol::TYPE::APP_START] = [](const Message& msg, ResponseCallBack cb) {
        try {
            int id = -1;
            if (msg.data.is_number()) id = msg.data.get<int>();
            else if (msg.data.is_string()) id = std::stoi(msg.data.get<std::string>());

            if (id < 0) throw std::runtime_error("Invalid ID");

            AppController ac;
            auto app = ac.getApp(id);
            bool success = ac.startApp(app);

            cb(Message(
                Protocol::TYPE::APP_START, 
                {
                    {"status", success ? "ok" : "failed"},
                    {"msg", success ? "App started successfully" : "Failed to start App"},
                    {"id", id}
                }, 
                "", 
                msg.from
            ));
        } catch (...) {
            cb(Message(
                Protocol::TYPE::ERROR, 
                {{"msg", "Invalid App ID format"}}, 
                "", 
                msg.from
            ));
        }
    };

    routes_[Protocol::TYPE::APP_KILL] = [](const Message& msg, ResponseCallBack cb) {
        try {
            int id = -1;
            if (msg.data.is_number()) id = msg.data.get<int>();
            else if (msg.data.is_string()) id = std::stoi(msg.data.get<std::string>());

            if (id < 0) throw std::runtime_error("Invalid ID");

            AppController ac;
            auto app = ac.getApp(id);
            bool success = ac.stopApp(app);

            cb(Message(
                Protocol::TYPE::APP_KILL, 
                {
                    {"status", success ? "ok" : "failed"},
                    {"msg", success ? "App stopped" : "Failed to stop App"},
                    {"id", id}
                }, 
                "", 
                msg.from
            ));

        } catch (...) {
            cb(Message(
                Protocol::TYPE::ERROR, 
                {{"msg", "Invalid App ID format"}}, 
                "", 
                msg.from
            ));
        }
    };

    routes_[Protocol::TYPE::PROC_LIST] = [](const Message& msg, ResponseCallBack cb) {
        #if defined(_WIN32) || defined(__APPLE__)
            ProcessController pc;
            auto list = pc.listProcesses();
            cb(Message(
                Protocol::TYPE::PROC_LIST, 
                list, 
                "", 
                msg.from
            ));
        #else
            cb(Message(
                Protocol::TYPE::ERROR, 
                {{"msg", "OS Not Supported"}}, 
                "", 
                msg.from
            ));
        #endif
    };
    routes_[Protocol::TYPE::PROC_KILL] = [](const Message& msg, ResponseCallBack cb) {
        try {
            int id = -1;
            if (msg.data.is_number()) id = msg.data.get<int>();
            else if (msg.data.is_string()) id = std::stoi(msg.data.get<std::string>());

            ProcessController pc;
            auto proc = pc.getProcess(id); 
            bool success = pc.stopProcess(proc);

            cb(Message(Protocol::TYPE::PROC_KILL, {
                {"status", success ? "ok" : "failed"},
                {"msg", success ? "Process killed" : "Failed to kill process"},
                {"id", id}
            }, "", msg.from));
        } catch (...) {
            cb(Message(
                Protocol::TYPE::ERROR, 
                {{"msg", "Invalid Process ID"}},
                "", 
                msg.from
            ));
        }
    };

    routes_[Protocol::TYPE::SCREENSHOT] = [](const Message& msg, ResponseCallBack cb) {
        try {
            CaptureScreen sc;
            std::string b64Image = sc.captureRaw();
            if (b64Image.empty()) {
                cb(Message(
                    Protocol::TYPE::SCREENSHOT, 
                    {
                        {"status", "failed"},
                        {"msg", "Captured data is empty"}
                    },
                    "",
                    msg.from));
            } else {
                cb(Message(
                    Protocol::TYPE::SCREENSHOT, 
                    {
                        {"status", "ok"},
                        {"mime", "image/jpeg"},
                        {"data", b64Image},
                        {"msg", "Screenshot captured"}
                    }, 
                    "", 
                    msg.from
                ));
            }
        } catch (const std::exception& e) {
            cb(Message(
                Protocol::TYPE::SCREENSHOT, 
                {
                    {"status", "failed"},
                    {"msg", std::string("Screenshot error: ") + e.what()}
                }, 
                "", 
                msg.from
            ));
        }
    };


    routes_[Protocol::TYPE::CAM_RECORD] = [](const Message& msg, ResponseCallBack cb) {
        std::thread([msg, cb]() {
            try {
                int duration = 10;
                
                if (msg.data.is_object() && msg.data.contains("duration")) {
                    duration = msg.data["duration"].get<int>();
                } else if (msg.data.is_number()) {
                    duration = msg.data.get<int>();
                } else if (msg.data.is_string()) {
                    try { 
                        duration = std::stoi(msg.data.get<std::string>()); 
                    } 
                    catch(...) {}
                }

                if (duration < 1) duration = 1;
                if (duration > 15) duration = 15;

                CameraRecorder cam;
                std::string b64Video = cam.recordBase64(duration);

                if (b64Video.empty()) {
                    cb(Message(
                        Protocol::TYPE::CAM_RECORD, 
                        {
                            {"status", "failed"},
                            {"msg", "Camera busy or not found"}
                        }, 
                        "", 
                        msg.from
                    ));
                } else {
                    cb(Message(
                        Protocol::TYPE::CAM_RECORD, 
                        {
                            {"status", "ok"},
                            {"mime", "video/mp4"},
                            {"duration", duration},
                            {"data", b64Video},
                            {"msg", "Video recorded"}
                        }, 
                        "", 
                        msg.from
                    ));
                }
            } catch (const std::exception& e) {
                cb(Message(
                    Protocol::TYPE::ERROR, 
                    {
                        {"msg", std::string("Async Camera Error: ") + e.what()}
                    }, 
                    "", 
                    msg.from
                ));
            }
        }).detach();
    };
    
    routes_[Protocol::TYPE::SHUTDOWN] = [](const Message& msg, ResponseCallBack cb) {
        cb(Message(
            Protocol::TYPE::SHUTDOWN, 
            {
                {"status", "ok"},
                {"msg", "Device is shutting down in 3 seconds..."}
            }, 
            "", 
            msg.from
        ));

        std::thread([]() {
            std::this_thread::sleep_for(std::chrono::seconds(3)); // Chờ 3s

            #ifdef _WIN32
                system("shutdown /s /t 0");
            #elif __APPLE__
                system("sudo shutdown -h now");
            #elif __linux__
                system("systemctl poweroff"); 
            #endif
        }).detach();
    };

    routes_[Protocol::TYPE::RESTART] = [](const Message& msg, ResponseCallBack cb) {
        cb(Message(
            Protocol::TYPE::RESTART, 
            {
                {"status", "ok"},
                {"msg", "Device is restarting in 3 seconds..."}
            }, 
            "", 
            msg.from
        ));

        std::thread([]() {
            std::this_thread::sleep_for(std::chrono::seconds(3)); // Chờ 3s

            #ifdef _WIN32
                system("shutdown /r /t 0");
            #elif __APPLE__
                system("sudo shutdown -r now");
            #elif __linux__
                system("systemctl reboot");
            #endif
        }).detach();
    };
}