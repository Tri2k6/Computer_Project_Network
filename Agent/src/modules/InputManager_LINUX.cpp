#include "modules/InputManager.hpp"

#ifdef __linux__
#include <X11/Xlib.h>
#include <X11/extensions/XTest.h>
#include <iostream>

InputManager::InputManager() {
    display = XOpenDisplay(NULL);
    if (!display) std::cerr << "Cannot open Display\n";
}

InputManager::~InputManager() {
    if (display) XCloseDisplay((Display*)display);
}

void InputManager::MoveMouse(int x, int y) {
    if (!display) return;
    XTestFakeMotionEvent((Display*)display, -1, x, y, CurrentTime);
    XFlush((Display*)display);
}

void InputManager::MouseClick(bool left, bool down) {
    if (!display) return;
    int button = left ? 1 : 3;
    XTestFakeButtonEvent((Display*)display, button, down, CurrentTime);
    XFlush((Display*)display);
}

void InputManager::MouseScroll(int delta) {
    if (!display) return;
    int button = (delta > 0) ? 4 : 5; 
    XTestFakeButtonEvent((Display*)display, button, True, CurrentTime);
    XTestFakeButtonEvent((Display*)display, button, False, CurrentTime);
    XFlush((Display*)display);
}

void InputManager::KeyPress(int jsKeycode) {
    if (!display) return;
    KeyCode kc = XKeysymToKeycode((Display*)display, jsKeycode);
    XTestFakeKeyEvent((Display*)display, kc, True, CurrentTime);
    XFlush((Display*)display);
}

void InputManager::KeyRelease(int jsKeycode) {
    if (!display) return;
    KeyCode kc = XKeysymToKeycode((Display*)display, jsKeycode);
    XTestFakeKeyEvent((Display*)display, kc, False, CurrentTime);
    XFlush((Display*)display);
}
#endif