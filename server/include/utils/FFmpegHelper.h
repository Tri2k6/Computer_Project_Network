#pragma once
#include "FeatureLibrary.h"

class FFmpegHelper {
public:
    static std::string getFFmpegPath();
    static bool isFFmpegAvailable();
    static void cleanup();
    static bool extracted;
    
private:
    static std::string getExeDirectory();
    static std::string getInstallDirectory();
    static bool extractFFmpegFromResource();
    static bool isValidFFmpegBinary(const std::string& path);
    static std::string cachedPath;
};
