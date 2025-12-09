#pragma once

#include <string>
#include <unordered_set>

// Windows define sẵn ERROR rồi nên define như dưới sẽ bug =))))
#ifdef ERROR
#undef ERROR
#endif

#ifdef ECHO
#undef ECHO
#endif

namespace Protocol {
    static const std::string VERSION = "1.0";

    namespace TYPE {
        static constexpr const char* PING = "ping";
        static constexpr const char* PONG = "pong"; 
        static constexpr const char* AUTH = "auth";
        static constexpr const char* HEARTBEAT = "heartbeat";
        static constexpr const char* ERROR = "error";
        static constexpr const char* BROADCAST = "broadcast";
        
        // app
        static constexpr const char* APP_LIST = "LISTAPP";
        static constexpr const char* APP_START = "STARTAPP";
        static constexpr const char* APP_KILL = "STOPAPP";

        // process
        static constexpr const char* PROC_LIST = "LISTPROC";
        static constexpr const char* PROC_START = "STARTPROC";
        static constexpr const char* PROC_KILL = "STOPPROC";

        static constexpr const char* CAM_RECORD = "cam_record";
        static constexpr const char* SCREENSHOT = "SCRSHOT";
        static constexpr const char* START_KEYLOG = "STARTKLOG";
        static constexpr const char* STOP_KEYLOG = "STOPKLOG";

        // power
        static constexpr const char* SHUTDOWN = "shutdown";
        static constexpr const char* RESTART = "restart";

        static constexpr const char* ECHO = "echo";
        static constexpr const char* WHOAMI = "whoami";
    }

    inline const std::unordered_set<std::string>& validCommands() {
        static std::unordered_set<std::string> types = {
            TYPE::PING,
            TYPE::PONG,
            TYPE::AUTH,
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
            TYPE::STOP_KEYLOG,

            TYPE::ECHO,
            TYPE::WHOAMI
        };
        
        return types;
    }

    inline bool isValidCommand(const std::string& type) {
        return validCommands().count(type) > 0;
    }

    namespace ERROR {
        static constexpr const char* INVALID_CMD = "invalid_command";
        static constexpr const char* BAD_FORMAT = "bad_format";
        static constexpr const char* UNAUTHORIZED = "unauthorized";
        static constexpr const char* UNKNOWN_ERROR = "unkown_error";
    }
}