#pragma once
#ifdef __APPLE__

#include <sys/sysctl.h>
#include <libproc.h>
#include <spawn.h>
#include <vector>
#include <iostream>
#include <cstring>
#include <signal.h>

extern char **environ;

struct MacProcess {
    int pid;
    std::string name;
};

class MacProcessController {
private:
    std::vector<MacProcess> procList;
public:
    void listProcesses();
    MacProcess getProcess(int i);
    bool startProcess(const MacProcess& proc);
    bool stopProcess(const MacProcess& proc);
};

#endif