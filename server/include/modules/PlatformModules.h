#pragma once

#if defined(_WIN32)
    #include "AppControl_WIN.h"
    #include "ProcessControl_WIN.h"
    using AppController = WinAppController;
    using ProcessController = WinProcessController;

#elif defined(__APPLE__)
    #include "AppControl_MAC.h"
    #include "ProcessControl_MAC.h"
    using AppController = MacAppController;
    using ProcessController = MacProcessController;
#endif

#include "CaptureScreen.h"
#include "CameraRecorder.h"
#include "KeyboardController.h"

// Helper functions to get JSON lists
inline json getAppListJson() {
    AppController ac;
    #ifdef _WIN32
        return ac.listAppsJson();
    #elif __APPLE__
        return ac.listAppsJson();
    #endif
}

inline json getProcessListJson() {
    ProcessController pc;
    #ifdef _WIN32
        return pc.listProcessesJson();
    #elif __APPLE__
        return pc.listProcessesJson();
    #endif
}