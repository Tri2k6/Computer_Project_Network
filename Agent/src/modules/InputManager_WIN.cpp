#include "InputManager.hpp"

#ifdef _WIN32

InputManager::InputManager() {}
InputManager::~InputManager() {}

void InputManager::MoveMouse(int x, int y) {
    int width = GetSystemMetrics(SM_CXSCREEN);
    int height = GetSystemMetrics(SM_CYSCREEN);
    
    double fx = x * (65535.0f / width);
    double fy = y * (65535.0f / height);

    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE;
    input.mi.dx = (LONG)fx;
    input.mi.dy = (LONG)fy;
    ::SendInput(1, &input, sizeof(INPUT));
}

void InputManager::MouseClick(bool left, bool down) {
    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    if (left) 
        input.mi.dwFlags = down ? MOUSEEVENTF_LEFTDOWN : MOUSEEVENTF_LEFTUP;
    else 
        input.mi.dwFlags = down ? MOUSEEVENTF_RIGHTDOWN : MOUSEEVENTF_RIGHTUP;
    ::SendInput(1, &input, sizeof(INPUT));
}

void InputManager::MouseScroll(int delta) {
    INPUT input = { 0 };
    input.type = INPUT_MOUSE;
    input.mi.dwFlags = MOUSEEVENTF_WHEEL;
    input.mi.mouseData = (DWORD)delta;
    ::SendInput(1, &input, sizeof(INPUT));
}

void InputManager::KeyPress(int jsKeycode) {
    INPUT input = { 0 };
    input.type = INPUT_KEYBOARD;
    input.ki.wVk = (WORD)jsKeycode;
    ::SendInput(1, &input, sizeof(INPUT));
}

void InputManager::KeyRelease(int jsKeycode) {
    INPUT input = { 0 };
    input.type = INPUT_KEYBOARD;
    input.ki.wVk = (WORD)jsKeycode;
    input.ki.dwFlags = KEYEVENTF_KEYUP;
    ::SendInput(1, &input, sizeof(INPUT));
}
#endif
