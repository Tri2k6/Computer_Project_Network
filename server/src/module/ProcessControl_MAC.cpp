#ifdef __APPLE__

#include "ProcessControl_MAC.h"


void MacProcessController::listProcesses() {
    procList.clear();

    int mib[4] = { CTL_KERN, KERN_PROC, KERN_PROC_ALL, 0 };
    size_t size;

    sysctl(mib, 4, NULL, &size, NULL, 0);
    std::vector<kinfo_proc> processes(size / sizeof(kinfo_proc));
    sysctl(mib, 4, processes.data(), &size, NULL, 0);

    int count = size / sizeof(kinfo_proc);

    for (int i = 0; i < count; i++) {
        auto &p = processes[i];
        int pid = p.kp_proc.p_pid;
        std::string name = p.kp_proc.p_comm;

        procList.push_back({ pid, name });

        std::cout << i << ". PID: " << pid
                    << " | Name: " << name << "\n";
    }
}


MacProcess MacProcessController::getProcess(int i) {
    if (i < 0 || i >= procList.size()) return {};
    return procList[i];
}


bool MacProcessController::startProcess(const MacProcess& proc) {
    pid_t pid;
    const char* path = proc.name.c_str();
    char* argv[] = { (char*)path, NULL };

    int status = posix_spawn(&pid, path, NULL, NULL, argv, environ);
    return (status == 0);
}


bool MacProcessController::stopProcess(const MacProcess& proc) {
    if (kill(proc.pid, SIGTERM) == 0) return true;
    if (kill(proc.pid, SIGKILL) == 0) return true;
    return false;
}

#endif