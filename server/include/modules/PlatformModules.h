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
#include "CameraCapture.h"
#include "ScreenRecorder.h"