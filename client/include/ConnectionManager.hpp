#pragma once

#include "WSConnection.hpp"

#include <algorithm>
#include <vector>
#include <memory>
#include <string>

class ConnectionManager {
public:
    using WSConnectionPtr = std::shared_ptr<WSConnection>;

    void addConnection(const WSConnectionPtr& conn);
    void broadcast(const std::string& msg);
    void sendTo(size_t index, const Message& msg);
    size_t size() const {
        return connections_.size();
    }
private:
    std::vector<WSConnectionPtr> connections_;
};