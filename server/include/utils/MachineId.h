#pragma once

#include <string>

namespace MachineId {
    /**
     * Get unique machine identifier based on MAC address or Hardware UUID
     * This ensures each machine has a unique ID that persists across reboots
     */
    std::string getUniqueMachineId();
    
    /**
     * Get primary MAC address of the machine
     */
    std::string getMacAddress();
    
    /**
     * Get Hardware UUID (platform-specific)
     */
    std::string getHardwareUUID();
}
