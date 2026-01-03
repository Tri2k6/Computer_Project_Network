#include "InputManager.hpp"

#ifdef __APPLE__

static CGKeyCode MapJsToMac(int jsKey) {
    static const std::map<int, CGKeyCode> keyMap = {
        {65, 0}, {83, 1}, {68, 2}, {70, 3}, {72, 4}, {71, 5}, {90, 6},
        {88, 7}, {67, 8}, {86, 9}, {66, 11}, {81, 12}, {87, 13}, {69, 14},
        {82, 15}, {89, 16}, {84, 17}, {49, 18}, {50, 19}, {51, 20}, {52, 21},
        {54, 22}, {53, 23}, {61, 24}, {57, 25}, {55, 26}, {45, 27}, {56, 28},
        {48, 29}, {93, 30}, {79, 31}, {85, 32}, {91, 33}, {73, 34}, {80, 35},
        {76, 37}, {74, 38}, {75, 40}, {78, 45}, {77, 46}, 
        
        {13, 36},
        {8, 51},
        {32, 49},
        {27, 53},
        {37, 123}, {39, 124}, {40, 125}, {38, 126},
        {16, 56},
        {17, 59},
        {18, 58},
        {91, 55}
    };
    
    auto it = keyMap.find(jsKey);
    return (it != keyMap.end()) ? it->second : (CGKeyCode)0;
}

InputManager::InputManager() {}
InputManager::~InputManager() {}

void InputManager::MoveMouse(int x, int y) {
    CGPoint point;
    point.x = (CGFloat)x;
    point.y = (CGFloat)y;
    CGEventRef move = CGEventCreateMouseEvent(NULL, kCGEventMouseMoved, point, kCGMouseButtonLeft);
    CGEventPost(kCGHIDEventTap, move);
    CFRelease(move);
}

void InputManager::MouseClick(bool left, bool down) {
    CGEventRef ourEvent = CGEventCreate(NULL);
    CGPoint point = CGEventGetLocation(ourEvent);
    CFRelease(ourEvent);

    CGMouseButton btn = left ? kCGMouseButtonLeft : kCGMouseButtonRight;
    CGEventType type;
    if (left) type = down ? kCGEventLeftMouseDown : kCGEventLeftMouseUp;
    else type = down ? kCGEventRightMouseDown : kCGEventRightMouseUp;

    CGEventRef click = CGEventCreateMouseEvent(NULL, type, point, btn);
    CGEventPost(kCGHIDEventTap, click);
    CFRelease(click);
}

void InputManager::MouseScroll(int delta) {
    int32_t scrollY = (delta > 0) ? 1 : -1;
    CGEventRef scroll = CGEventCreateScrollWheelEvent(NULL, kCGScrollEventUnitLine, 1, scrollY);
    CGEventPost(kCGHIDEventTap, scroll);
    CFRelease(scroll);
}

void InputManager::KeyPress(int jsKeycode) {
    CGEventRef key = CGEventCreateKeyboardEvent(NULL, MapJsToMac(jsKeycode), true);
    CGEventPost(kCGHIDEventTap, key);
    CFRelease(key);
}

void InputManager::KeyRelease(int jsKeycode) {
    CGEventRef key = CGEventCreateKeyboardEvent(NULL, MapJsToMac(jsKeycode), false);
    CGEventPost(kCGHIDEventTap, key);
    CFRelease(key);
}
#endif
