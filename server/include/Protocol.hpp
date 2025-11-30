#pragma once

// Windows define sẵn ERROR rồi nên define như dưới sẽ bug =))))
#ifdef ERROR
#undef ERROR
#endif

#include <string>
#include <unordered_set>

namespace Protocol {
    static const std::string VERSION = "1.0";

    namespace TYPE {
        static const std::string PING = "ping";
        static const std::string PONG = "pong"; 
        static const std::string AUTH = "auth";
        static const std::string HEARTBEAT = "heartbeat";
        static const std::string ERROR = "error";
        static const std::string BROADCAST = "broadcast";
        static const std::string DIRECT = "direct";   
        
        // app
        static const std::string APP_LIST = "app_list";
        static const std::string APP_START = "app_start";
        static const std::string APP_KILL = "app_kill";

        // process
        static const std::string PROC_LIST = "proc_list";
        static const std::string PROC_START = "proc_start";
        static const std::string PROC_KILL = "proc_kill";

        static const std::string CAM_RECORD = "cam_record";
        static const std::string SCREENSHOT = "screenshot";
        static const std::string KEYLOG = "keylog";

        // power
        static const std::string SHUTDOWN = "shutdown";
        static const std::string RESTART = "restart";
    }

    inline const std::unordered_set<std::string>& validCommands() {
        static std::unordered_set<std::string> types = {
            TYPE::PING,
            TYPE::PONG,
            TYPE::AUTH,
            TYPE::HEARTBEAT,
            TYPE::HEARTBEAT,
            TYPE::ERROR,

            TYPE::APP_LIST,
            TYPE::APP_START,
            TYPE::APP_KILL,

            TYPE::PROC_LIST,
            TYPE::PROC_START,
            TYPE::PROC_KILL,
            TYPE::CAM_RECORD,
            TYPE::SCREENSHOT,
            TYPE::KEYLOG,
        };
        
        return types;
    }

    inline bool isValidCommand(const std::string& type) {
        return validCommands().count(type) > 0;
    }

    namespace ERROR {
        static const std::string INVALID_CMD = "invalid_command";
        static const std::string BAD_FORMAT = "bad_format";
        static const std::string UNAUTHORIZED = "unauthorized";
        static const std::string UNKNOWN_ERROR = "unkown_error";
    }
}