#ifndef INPUT_MANAGER_HPP
#define INPUT_MANAGER_HPP

#include "FeatureLibrary.h"

class InputManager {
public:
    InputManager();
    ~InputManager();

    void MoveMouse(int x, int y);
    void MouseClick(bool left, bool down);
    void MouseScroll(int delta);
    void KeyPress(int jsKeycode);
    void KeyRelease(int jsKeycode);

private:
    void* display = nullptr; 
};

#endif
