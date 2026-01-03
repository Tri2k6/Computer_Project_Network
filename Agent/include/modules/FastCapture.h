#pragma once
#include "FeatureLibrary.h" 

class FastCapture {
public:
    FastCapture();
    ~FastCapture();
    std::vector<unsigned char> captureFrameRaw();

private:
#ifdef _WIN32
    ULONG_PTR gdiplusToken;
    int GetEncoderClsid(const WCHAR* format, CLSID* pClsid);
#elif __linux__
    Display* display = nullptr;
    Window root;
#endif
};