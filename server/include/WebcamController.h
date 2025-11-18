#include "library.h"

class WebcamController {
public:
    string getCameraNameFromConfig();
    string recordVideo(int duration, string fileName);
};