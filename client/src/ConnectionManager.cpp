#include "ConnectionManager.hpp"

#include <iostream>

void ConnectionManager::addConnection(const WSConnectionPtr& conn) {
    connections_.push_back(conn);
}

void ConnectionManager::broadcast(const std::string& msg) {

    connections_.erase(
        std::remove_if(connections_.begin(), connections_.end(),
            [](const WSConnectionPtr& c) {
                return !c || c->isDead();
            }),
        connections_.end()
    );

    for (auto& c : connections_) {
        if (c && c->isOpen()) {
            c->send(msg);
        }
    }
}

void ConnectionManager::sendTo(size_t index, const std::string& msg) {
    if (index >= connections_.size()) {
        std::cerr << "[ConnectionManager] Invalid index: " << index << "\n";
        return;
    }

    auto& c = connections_[index];
    if (c) {
        c->send(msg);
    }
}