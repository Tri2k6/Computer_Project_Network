#pragma once

// Windows define sẵn ERROR rồi nên define như dưới sẽ bug =))))
#ifdef ERROR
#undef ERROR
#endif

#include <string>
#include <unordered_set>

namespace Protocol {
    static const std::string VERSION = "1.0";

    namespace CMD {
        static const std::string PING = "ping";
        static const std::string PONG = "pong"; 

        static const std::string AUTH = "auth";
        static const std::string HEARTBEAT = "heartbeat";

        static const std::string RUN_TASK = "run_task";
        static const std::string TASK_RESULT = "task_result";
        
        static const std::string BROADCAST = "broadcast";
        static const std::string DIRECT = "direct";

        static const std::string ERROR = "error";
    }

    inline const std::unordered_set<std::string>& validCommands() {
        static std::unordered_set<std::string> cmds = {
            CMD::PING,
            CMD::PONG,
            CMD::AUTH,
            CMD::HEARTBEAT,
            CMD::RUN_TASK,
            CMD::TASK_RESULT,
            CMD::BROADCAST,
            CMD::DIRECT,
            CMD::ERROR  
        };
        
        return cmds;
    }

    inline bool isValidCommand(const std::string& cmd) {
        return validCommands().count(cmd) > 0;
    }

    namespace ERROR {
        static const std::string INVALID_CMD = "invalid_command";
        static const std::string BAD_FORMAT = "bad_format";
        static const std::string UNAUTHORIZED = "unauthorized";
        static const std::string UNKNOWN_ERROR = "unkown_error";
    }
}