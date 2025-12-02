#pragma once

#include <string>
#include <iostream>

#include <nlohmann/json.hpp>

using json = nlohmann::json;

class Message {
public:
    std::string type;
    json data;
    std::string to;
    std::string from;

    Message() = default;
    Message(const std::string& c, const json& d,
            const std::string& f = "", const std::string& t = "")
            : type(c), data(d), from(f), to(t) {}
    
    std::string serialize() const {
        json j;
        j["type"] = type;
        j["data"] = data;
        // both valid for string or object
        if (!from.empty()) j["from"] = from;
        if (!to.empty()) j["to"] = to;
        j.dump(-1, ' ', false, json::error_handler_t::replace);
        // try not to crash when meet invalid char
        // picture should be base64
        return j.dump();
    }

    static Message deserialize(const std::string& str) {
        Message msg;
        try {
            auto j = json::parse(str);
            msg.type = j.value("type", "unknown");
            if (j.contains("data")) msg.data = j["data"];
            msg.from = j.value("from", "");
            msg.to = j.value("to", "");
        } catch (const std::exception& e) {
            std::cerr << "[Message] JSON parse error: " << e.what() << "\n";
        }
        
        return msg;
    }

    std::string getDataString() const {
        if (data.is_string()) return data.get<std::string>();
        return data.dump(); //from object to string
    }
};