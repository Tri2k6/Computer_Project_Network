#pragma once

#include "FeatureLibrary.h"
#include "Message.hpp"
#include "Protocol.hpp"
#include "PlatformModules.h"

#include <iostream>
#include <thread>
#include <vector>
#include <functional>
#include <unordered_map>
#include <string>

using ResponseCallBack = std::function<void(Message)>;
using std::cout;

class CommandDispatcher {
public: 
    CommandDispatcher();
    void dispatch(const Message& msg, ResponseCallBack cb);
private:
    void registerHandlers();

    using HandlerFunc = std::function<void(const Message&, ResponseCallBack)>;
    std::unordered_map<std::string, HandlerFunc> routes_;
};