#pragma once

#ifdef __APPLE__

#include <sys/sysctl.h>
#include <libproc.h>
#include <spawn.h>
#include <signal.h>
#include "utils/FeatureLibrary.h"

extern char **environ;

struct MacProcess {
    int pid;
    std::string name;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(MacProcess, name, pid)

class MacProcessController {
private:
    std::vector<MacProcess> procList;
public:
    std::vector<MacProcess> listProcesses();
    json listProcessesJson(); // Returns JSON array for website
    MacProcess getProcess(int i);
    bool startProcess(const MacProcess& proc);
    bool stopProcess(const MacProcess& proc);
};

#endif