#include "MachineId.h"
#include <sstream>
#include <iomanip>
#include <algorithm>

#ifdef _WIN32
    #include <Windows.h>
    #include <iphlpapi.h>
    #include <comdef.h>
    #include <Wbemidl.h>
    #include <comutil.h>
    #pragma comment(lib, "iphlpapi.lib")
    #pragma comment(lib, "wbemuuid.lib")
    #pragma comment(lib, "comsuppw.lib")
#elif __APPLE__
    #include <IOKit/IOKitLib.h>
    #include <CoreFoundation/CoreFoundation.h>
    #include <sys/socket.h>
    #include <net/if.h>
    #include <net/if_dl.h>
    #include <net/if_types.h>
    #include <ifaddrs.h>
    #include <cstring>
#elif __linux__
    #include <sys/socket.h>
    #include <net/if.h>
    #include <ifaddrs.h>
    #include <unistd.h>
    #include <fstream>
#endif

namespace MachineId {

#ifdef _WIN32
    std::string getMacAddress() {
        IP_ADAPTER_INFO adapterInfo[16];
        DWORD dwBufLen = sizeof(adapterInfo);
        DWORD dwStatus = GetAdaptersInfo(adapterInfo, &dwBufLen);
        
        if (dwStatus == ERROR_SUCCESS) {
            PIP_ADAPTER_INFO pAdapterInfo = adapterInfo;
            do {
                // Skip loopback and non-physical adapters
                if (pAdapterInfo->Type == MIB_IF_TYPE_ETHERNET || 
                    pAdapterInfo->Type == IF_TYPE_IEEE80211) {
                    std::stringstream ss;
                    for (UINT i = 0; i < pAdapterInfo->AddressLength; i++) {
                        if (i > 0) ss << ":";
                        ss << std::hex << std::setw(2) << std::setfill('0') 
                           << (int)pAdapterInfo->Address[i];
                    }
                    return ss.str();
                }
                pAdapterInfo = pAdapterInfo->Next;
            } while (pAdapterInfo);
        }
        return "";
    }
    
    std::string getHardwareUUID() {
        HRESULT hres;
        
        // Initialize COM
        hres = CoInitializeEx(0, COINIT_MULTITHREADED);
        if (FAILED(hres)) return "";
        
        // Initialize security
        hres = CoInitializeSecurity(NULL, -1, NULL, NULL, RPC_C_AUTHN_LEVEL_NONE,
                                     RPC_C_IMP_LEVEL_IMPERSONATE, NULL, EOAC_NONE, NULL);
        
        // Obtain initial locator to WMI
        IWbemLocator *pLoc = NULL;
        hres = CoCreateInstance(CLSID_WbemLocator, 0, CLSCTX_INPROC_SERVER,
                                IID_IWbemLocator, (LPVOID *)&pLoc);
        
        if (FAILED(hres)) {
            CoUninitialize();
            return "";
        }
        
        // Connect to WMI
        IWbemServices *pSvc = NULL;
        BSTR namespacePath = SysAllocString(L"ROOT\\CIMV2");
        hres = pLoc->ConnectServer(namespacePath, NULL, NULL, 0, NULL, 0, 0, &pSvc);
        SysFreeString(namespacePath);
        
        if (FAILED(hres)) {
            pLoc->Release();
            CoUninitialize();
            return "";
        }
        
        // Set security levels
        hres = CoSetProxyBlanket(pSvc, RPC_C_AUTHN_WINNT, RPC_C_AUTHZ_NONE, NULL,
                                 RPC_C_AUTHN_LEVEL_CALL, RPC_C_IMP_LEVEL_IMPERSONATE, NULL, EOAC_NONE);
        
        if (FAILED(hres)) {
            pSvc->Release();
            pLoc->Release();
            CoUninitialize();
            return "";
        }
        
        // Query for UUID
        IEnumWbemClassObject* pEnumerator = NULL;
        BSTR wql = SysAllocString(L"WQL");
        BSTR query = SysAllocString(L"SELECT UUID FROM Win32_ComputerSystemProduct");
        
        hres = pSvc->ExecQuery(wql, query,
                                WBEM_FLAG_FORWARD_ONLY | WBEM_FLAG_RETURN_IMMEDIATELY, NULL, &pEnumerator);
        
        SysFreeString(wql);
        SysFreeString(query);
        
        std::string uuid = "";
        if (SUCCEEDED(hres) && pEnumerator) {
            IWbemClassObject *pclsObj = NULL;
            ULONG uReturn = 0;
            
            while (pEnumerator->Next(WBEM_INFINITE, 1, &pclsObj, &uReturn) == WBEM_S_NO_ERROR) {
                VARIANT vtProp;
                VariantInit(&vtProp);
                
                BSTR propName = SysAllocString(L"UUID");
                hres = pclsObj->Get(propName, 0, &vtProp, 0, 0);
                SysFreeString(propName);
                
                if (SUCCEEDED(hres) && vtProp.vt == VT_BSTR) {
                    // Convert BSTR to std::string
                    int len = WideCharToMultiByte(CP_UTF8, 0, vtProp.bstrVal, -1, NULL, 0, NULL, NULL);
                    if (len > 0) {
                        char* buffer = new char[len];
                        WideCharToMultiByte(CP_UTF8, 0, vtProp.bstrVal, -1, buffer, len, NULL, NULL);
                        uuid = std::string(buffer);
                        delete[] buffer;
                    }
                    VariantClear(&vtProp);
                    pclsObj->Release();
                    break;
                }
                VariantClear(&vtProp);
                pclsObj->Release();
            }
            pEnumerator->Release();
        }
        
        if (pSvc) pSvc->Release();
        if (pLoc) pLoc->Release();
        CoUninitialize();
        
        return uuid;
    }

#elif __APPLE__
    std::string getMacAddress() {
        struct ifaddrs *ifap, *ifa;
        struct sockaddr_dl *sdl;
        char mac[18];
        
        if (getifaddrs(&ifap) == 0) {
            for (ifa = ifap; ifa; ifa = ifa->ifa_next) {
                if (ifa->ifa_addr && ifa->ifa_addr->sa_family == AF_LINK) {
                    sdl = (struct sockaddr_dl *)ifa->ifa_addr;
                    // Check for Ethernet or WiFi interface types
                    // IFT_ETHER = 6, IFT_IEEE80211 = 71 (if defined)
                    if (sdl->sdl_type == 6 || sdl->sdl_type == 71) {
                        // Skip loopback
                        if (strcmp(ifa->ifa_name, "lo0") != 0 && sdl->sdl_alen == 6) {
                            unsigned char *ptr = (unsigned char *)LLADDR(sdl);
                            snprintf(mac, sizeof(mac), "%02x:%02x:%02x:%02x:%02x:%02x",
                                    ptr[0], ptr[1], ptr[2], ptr[3], ptr[4], ptr[5]);
                            freeifaddrs(ifap);
                            return std::string(mac);
                        }
                    }
                }
            }
            freeifaddrs(ifap);
        }
        return "";
    }
    
    std::string getHardwareUUID() {
        // Use kIOMainPortDefault for macOS 12+, fallback to kIOMasterPortDefault for older versions
        #ifdef kIOMainPortDefault
            io_registry_entry_t ioRegistryRoot = IORegistryEntryFromPath(kIOMainPortDefault, "IOService:/");
        #else
            io_registry_entry_t ioRegistryRoot = IORegistryEntryFromPath(kIOMasterPortDefault, "IOService:/");
        #endif
        
        CFStringRef uuidCf = (CFStringRef) IORegistryEntryCreateCFProperty(ioRegistryRoot,
                                                                           CFSTR(kIOPlatformUUIDKey),
                                                                           kCFAllocatorDefault, 0);
        IOObjectRelease(ioRegistryRoot);
        
        if (uuidCf) {
            char uuid[128];
            Boolean result = CFStringGetCString(uuidCf, uuid, sizeof(uuid), kCFStringEncodingUTF8);
            CFRelease(uuidCf);
            
            if (result) {
                return std::string(uuid);
            }
        }
        return "";
    }

#elif __linux__
    std::string getMacAddress() {
        struct ifaddrs *ifap, *ifa;
        struct sockaddr *sa;
        char mac[18];
        
        if (getifaddrs(&ifap) == 0) {
            for (ifa = ifap; ifa; ifa = ifa->ifa_next) {
                if (ifa->ifa_addr && ifa->ifa_addr->sa_family == AF_PACKET) {
                    // Skip loopback
                    if (strcmp(ifa->ifa_name, "lo") != 0) {
                        sa = ifa->ifa_addr;
                        unsigned char *ptr = (unsigned char *)sa->sa_data;
                        ptr += 10; // MAC address offset in sockaddr
                        snprintf(mac, sizeof(mac), "%02x:%02x:%02x:%02x:%02x:%02x",
                                ptr[0], ptr[1], ptr[2], ptr[3], ptr[4], ptr[5]);
                        freeifaddrs(ifap);
                        return std::string(mac);
                    }
                }
            }
            freeifaddrs(ifap);
        }
        return "";
    }
    
    std::string getHardwareUUID() {
        // Try to read machine-id from /etc/machine-id (systemd)
        std::ifstream file("/etc/machine-id");
        if (file.is_open()) {
            std::string uuid;
            std::getline(file, uuid);
            file.close();
            if (!uuid.empty()) {
                return uuid;
            }
        }
        
        // Fallback to /var/lib/dbus/machine-id
        file.open("/var/lib/dbus/machine-id");
        if (file.is_open()) {
            std::string uuid;
            std::getline(file, uuid);
            file.close();
            if (!uuid.empty()) {
                return uuid;
            }
        }
        
        return "";
    }
#endif

    std::string getUniqueMachineId() {
        // Try Hardware UUID first (most reliable)
        std::string uuid = getHardwareUUID();
        if (!uuid.empty()) {
            // Clean UUID: remove dashes and convert to uppercase
            uuid.erase(std::remove(uuid.begin(), uuid.end(), '-'), uuid.end());
            std::transform(uuid.begin(), uuid.end(), uuid.begin(), ::toupper);
            return "MACHINE-" + uuid;
        }
        
        // Fallback to MAC address
        std::string mac = getMacAddress();
        if (!mac.empty()) {
            // Remove colons and convert to uppercase
            mac.erase(std::remove(mac.begin(), mac.end(), ':'), mac.end());
            std::transform(mac.begin(), mac.end(), mac.begin(), ::toupper);
            return "MAC-" + mac;
        }
        
        // Last resort: return empty (will be handled by caller)
        return "";
    }
}
