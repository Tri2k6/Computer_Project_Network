#include "modules/FastCapture.h"
#include <vector>
#include <iostream>

// --- LINUX IMPLEMENTATION DETAILS ---
#ifdef __linux__
    #define STB_IMAGE_WRITE_IMPLEMENTATION
    #include "utils/stb_image_write.h"
#endif

// =======================================================================================
// WINDOWS IMPLEMENTATION (Giữ nguyên)
// =======================================================================================
#ifdef _WIN32
#include <gdiplus.h>

int GetEncoderClsid(const WCHAR* format, CLSID* pClsid) {
    UINT num = 0, size = 0;
    Gdiplus::GetImageEncodersSize(&num, &size);
    if(size == 0) return -1;
    Gdiplus::ImageCodecInfo* pImageCodecInfo = (Gdiplus::ImageCodecInfo*)(malloc(size));
    if(pImageCodecInfo == NULL) return -1;
    Gdiplus::GetImageEncoders(num, size, pImageCodecInfo);
    for(UINT j = 0; j < num; ++j) {
        if(wcscmp(pImageCodecInfo[j].MimeType, format) == 0) {
            *pClsid = pImageCodecInfo[j].Clsid;
            free(pImageCodecInfo);
            return j;
        }
    }
    free(pImageCodecInfo);
    return -1;
}

FastCapture::FastCapture() {
    Gdiplus::GdiplusStartupInput gdiplusStartupInput;
    Gdiplus::GdiplusStartup(&gdiplusToken, &gdiplusStartupInput, NULL);
}

FastCapture::~FastCapture() {
    Gdiplus::GdiplusShutdown(gdiplusToken);
}

std::vector<unsigned char> FastCapture::captureFrameRaw() {
    int w = GetSystemMetrics(SM_CXSCREEN);
    int h = GetSystemMetrics(SM_CYSCREEN);
    HDC hdcScreen = GetDC(NULL);
    HDC hdcMem = CreateCompatibleDC(hdcScreen);
    HBITMAP hBitmap = CreateCompatibleBitmap(hdcScreen, w, h);
    SelectObject(hdcMem, hBitmap);
    BitBlt(hdcMem, 0, 0, w, h, hdcScreen, 0, 0, SRCCOPY);

    IStream* pStream = NULL;
    CreateStreamOnHGlobal(NULL, TRUE, &pStream);
    Gdiplus::Bitmap bitmap(hBitmap, NULL);
    CLSID clsid;
    GetEncoderClsid(L"image/jpeg", &clsid);
    Gdiplus::EncoderParameters encoderParameters;
    encoderParameters.Count = 1;
    encoderParameters.Parameter[0].Guid = Gdiplus::EncoderQuality;
    encoderParameters.Parameter[0].Type = Gdiplus::EncoderParameterValueTypeLong;
    ULONG quality = 60; 
    encoderParameters.Parameter[0].NumberOfValues = 1;
    encoderParameters.Parameter[0].Value = &quality;
    bitmap.Save(pStream, &clsid, &encoderParameters);

    STATSTG stat;
    pStream->Stat(&stat, STATFLAG_NONAME);
    std::vector<unsigned char> buffer(stat.cbSize.LowPart);
    LARGE_INTEGER liZero = { 0 };
    pStream->Seek(liZero, STREAM_SEEK_SET, NULL);
    ULONG bytesRead;
    pStream->Read(buffer.data(), buffer.size(), &bytesRead);

    pStream->Release();
    DeleteObject(hBitmap);
    DeleteDC(hdcMem);
    ReleaseDC(NULL, hdcScreen);
    return buffer;
}

// =======================================================================================
// MACOS IMPLEMENTATION (Fix cho macOS 15+ dùng ScreenCaptureKit)
// =======================================================================================
#elif __APPLE__

#include <CoreFoundation/CoreFoundation.h>
#include <CoreGraphics/CoreGraphics.h>
#include <ImageIO/ImageIO.h>
// Import ScreenCaptureKit framework
#import <ScreenCaptureKit/ScreenCaptureKit.h>
#import <Foundation/Foundation.h>

FastCapture::FastCapture() {}
FastCapture::~FastCapture() {}

// Biến tĩnh để cache Display object (tránh việc query lại nhiều lần gây chậm)
static SCDisplay *g_cachedDisplay = nil;

std::vector<unsigned char> FastCapture::captureFrameRaw() {
    std::vector<unsigned char> buffer;

    // 1. Tìm màn hình chính (Chỉ chạy 1 lần đầu hoặc khi mất cache)
    if (g_cachedDisplay == nil) {
        dispatch_semaphore_t sema = dispatch_semaphore_create(0);
        
        [SCShareableContent getShareableContentWithCompletionHandler:^(SCShareableContent *content, NSError *error) {
            if (!error && content.displays.count > 0) {
                // Lấy màn hình đầu tiên (thường là main display)
                g_cachedDisplay = [content.displays firstObject];
            }
            dispatch_semaphore_signal(sema);
        }];
        
        // Chờ tối đa 2 giây để tìm màn hình
        dispatch_semaphore_wait(sema, dispatch_time(DISPATCH_TIME_NOW, 2 * NSEC_PER_SEC));
    }

    if (g_cachedDisplay == nil) {
        // std::cerr << "[FastCapture] No display found for ScreenCaptureKit\n";
        return buffer;
    }

    // 2. Cấu hình Filter và Stream Config
    // [FIX LỖI] Đã sửa 'exceptApplications' thành 'exceptingWindows'
    SCContentFilter *filter = [[SCContentFilter alloc] initWithDisplay:g_cachedDisplay excludingApplications:@[] exceptingWindows:@[]];
    
    SCStreamConfiguration *config = [[SCStreamConfiguration alloc] init];
    config.width = (size_t)g_cachedDisplay.width;
    config.height = (size_t)g_cachedDisplay.height;
    config.showsCursor = YES; // Hiển thị chuột

    // 3. Chụp ảnh (Snapshot)
    __block CGImageRef capturedImage = NULL;
    dispatch_semaphore_t sema = dispatch_semaphore_create(0);

    [SCScreenshotManager captureImageWithFilter:filter configuration:config completionHandler:^(CGImageRef image, NSError *error) {
        if (image) {
            capturedImage = CGImageRetain(image); // Retain để dùng bên ngoài block
        }
        dispatch_semaphore_signal(sema);
    }];

    // Chờ Capture xong (Timeout 1s)
    dispatch_semaphore_wait(sema, dispatch_time(DISPATCH_TIME_NOW, 1 * NSEC_PER_SEC));

    if (!capturedImage) return buffer;

    // 4. Nén thành JPEG (Dùng ImageIO như cũ)
    CFMutableDataRef data = CFDataCreateMutable(kCFAllocatorDefault, 0);
    CFStringRef typeId = CFSTR("public.jpeg"); // Thay kUTTypeJPEG để tránh warning

    CGImageDestinationRef destination = CGImageDestinationCreateWithData(data, typeId, 1, NULL);
    
    if (destination) {
        float compressionQuality = 0.6; // Chất lượng 60%
        CFStringRef key = kCGImageDestinationLossyCompressionQuality;
        CFNumberRef val = CFNumberCreate(NULL, kCFNumberFloatType, &compressionQuality);
        
        const void *keys[] = { key };
        const void *values[] = { val };
        CFDictionaryRef options = CFDictionaryCreate(NULL, keys, values, 1, &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);

        CGImageDestinationAddImage(destination, capturedImage, options);
        CGImageDestinationFinalize(destination);
        
        // Copy dữ liệu ra vector
        long length = CFDataGetLength(data);
        const unsigned char* bytes = CFDataGetBytePtr(data);
        buffer.assign(bytes, bytes + length);

        CFRelease(options);
        CFRelease(val);
        CFRelease(destination);
    }

    CFRelease(data);
    CGImageRelease(capturedImage);
    
    return buffer;
}

// =======================================================================================
// LINUX IMPLEMENTATION (Giữ nguyên)
// =======================================================================================
#elif __linux__

void write_to_vector_func(void *context, void *data, int size) {
    std::vector<unsigned char> *buffer = (std::vector<unsigned char> *)context;
    unsigned char* pData = (unsigned char*)data;
    buffer->insert(buffer->end(), pData, pData + size);
}

FastCapture::FastCapture() {
    display = XOpenDisplay(NULL);
    if (display) root = DefaultRootWindow(display);
}

FastCapture::~FastCapture() {
    if (display) XCloseDisplay(display);
}

std::vector<unsigned char> FastCapture::captureFrameRaw() {
    std::vector<unsigned char> buffer;
    if (!display) return buffer;

    XWindowAttributes gwa;
    XGetWindowAttributes(display, root, &gwa);
    XImage* image = XGetImage(display, root, 0, 0, gwa.width, gwa.height, AllPlanes, ZPixmap);
    if (!image) return buffer;

    stbi_write_jpg_to_func(write_to_vector_func, &buffer, gwa.width, gwa.height, 4, image->data, 60);

    XDestroyImage(image);
    return buffer;
}

#endif