#pragma once

#include <string>
#include <iostream>

#include <nlohmann/json.hpp>

using json = nlohmann::json;

class Message {
public:
    std::string cmd;
    std::string data;
    std::string from;
    std::string to;

    Message() = default;
    Message(const std::string& c, const std::string& d,
            const std::string& f = "", const std::string& t = "")
            : cmd(c), data(d), from(f), to(t) {}
    
    std::string serialize() const {
        json j;
        j["cmd"] = cmd;
        j["data"] = data;
        if (!from.empty()) j["from"] = from;
        if (!to.empty()) j["to"] = to;
        return j.dump();
    }

    static Message deserialize(const std::string& str) {
        Message msg;
        try {
            auto j = json::parse(str);
            if (j.contains("cmd")) msg.cmd = j["cmd"];
            if (j.contains("data")) msg.data = j["data"];
            if (j.contains("from")) msg.from = j["from"];
            if (j.contains("to")) msg.to = j["to"];
        } catch (const std::exception& e) {
            std::cerr << "[Message] JSON parse error: " << e.what() << "\n";
        }
        
        return msg;
    }
};