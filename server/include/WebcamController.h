#pragma once

#include "feature_library.h"

class WebcamController {
public:
    string getCameraNameFromConfig();
    string recordVideo(int duration, string fileName);
};