#pragma once

#include <string>
#include <unordered_set>

// Windows define sẵn ERROR rồi nên define như dưới sẽ bug =))))
#ifdef ERROR
#undef ERROR
#endif

namespace Protocol {
    static const std::string VERSION = "1.0";

    namespace TYPE {
        static const std::string PING = "ping";
        static const std::string PONG = "pong"; 
        static const std::string AUTH = "auth";
        static const std::string STATUS = "status";
        static const std::string HEARTBEAT = "heartbeat";
        static const std::string ERROR = "error";
        static const std::string BROADCAST = "broadcast";
        
        // app
        static const std::string APP_LIST = "LISTAPP";
        static const std::string APP_START = "STARTAPP";
        static const std::string APP_KILL = "STOPAPP";

        // process
        static const std::string PROC_LIST = "LISTPROC";
        static const std::string PROC_START = "STARTPROC";
        static const std::string PROC_KILL = "STOPPROC";

        static const std::string CAM_RECORD = "cam_record";
        static const std::string SCREENSHOT = "SCRSHOT";
        static const std::string START_KEYLOG = "STARTKLOG";
        static const std::string STOP_KEYLOG = "STOPKLOG";

        // power
        static const std::string SHUTDOWN = "shutdown";
        static const std::string RESTART = "restart";
    }

    inline const std::unordered_set<std::string>& validCommands() {
        static std::unordered_set<std::string> types = {
            TYPE::PING,
            TYPE::PONG,
            TYPE::AUTH,
            TYPE::STATUS,
            TYPE::HEARTBEAT,
            TYPE::ERROR,
            TYPE::BROADCAST,

            TYPE::APP_LIST,
            TYPE::APP_START,
            TYPE::APP_KILL,

            TYPE::PROC_LIST,
            TYPE::PROC_START,
            TYPE::PROC_KILL,
            TYPE::CAM_RECORD,
            TYPE::SCREENSHOT,
            TYPE::START_KEYLOG,
            TYPE::STOP_KEYLOG
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