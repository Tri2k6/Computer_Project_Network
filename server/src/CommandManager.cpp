#include "CommandManager.hpp"

#define UNICODE
#define _UNICODE

std::string ParseCommand(Message msg) {
    size_t cut = msg.data.find(",", 0);
    std::string cmd = msg.data.substr(0, cut);
    std::string left = msg.data.substr(cut + 1);
    
    #ifdef __APPLE__
    MacAppController ac;
    MacProcessController pc;
    #endif

    #ifdef _WIN32
    WinAppController ac;
    WinProcessController pc;
    #endif
    
    // ScreenCapture sc;
    // WebcamController wc;

    if (cmd == "LISTAPP")
    {
        return ac.listApps();
    }
    else if(cmd == "STARTAPP")
    {
        int id = -1;
        id = stoi(left);

        if (id < 0)
            return "Invalid index!\n";

        else {
            if (ac.startApp(ac.getApp(id)))
                return "Successful!\n";
            else 
                return "Failed!\n";
        }
    }
    else if(cmd == "STOPAPP")
    {
        int id = -1;
        id = stoi(left);

        if (id < 0)
            return "Invalid index!\n";

        else {
            if (ac.stopApp(ac.getApp(id)))
                return "Successful!\n";
            else 
                return "Failed!\n";
        }
    }
    else if(cmd == "LISTPROC")
    {
        return pc.listProcesses();
    }
    else if(cmd == "STARTPROC")
    {
        int id = -1;
        id = stoi(left);
        
        if (id < 0)
            return "Invalid index!\n";

        else {
            if (pc.startProcess(pc.getProcess(id)))
                return "Successful!\n";
            else 
                return "Failed!\n";
        }
    }
    else if(cmd == "STOPPROC")
    {
        int id = -1;
        id = stoi(left);
        
        if (id < 0)
            return "Invalid index!\n";

        else {
            if (pc.stopProcess(pc.getProcess(id)))
                return "Successful!\n";
            else 
                return "Failed!\n";
        }
    }
    else if(cmd == "SCRSHOT")
    {
        // sc.captureNow();
    }

    return "Unrecognized command!\n";
}