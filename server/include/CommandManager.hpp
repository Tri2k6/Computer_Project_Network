#pragma once
#include "feature_library.h"

Message ParseCommand(Message msg);
void HandlerAsyncCommand(Message msg, std::shared_ptr<Session> session);