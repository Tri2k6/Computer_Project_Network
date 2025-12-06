#pragma once

#ifdef __APPLE__

#include <sys/sysctl.h>
#include <libproc.h>
#include <spawn.h>
#include <signal.h>
#include "feature_library.h"

extern char **environ;

struct MacProcess {
    int pid;
    std::string name;
};

class MacProcessController {
private:
    std::vector<MacProcess> procList;
public:
    std::wstring listProcesses();
    MacProcess getProcess(int i);
    bool startProcess(const MacProcess& proc);
    bool stopProcess(const MacProcess& proc);
};

#endif