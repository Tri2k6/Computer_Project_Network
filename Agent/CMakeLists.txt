cmake_minimum_required(VERSION 3.14)

project(AgentClient LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ==============================================================================
# 1. CẤU HÌNH COMPILER VÀ MACRO CHO WINDOWS
# ==============================================================================
if(WIN32)
    # Tự động nhận diện vcpkg nếu có biến môi trường VCPKG_ROOT
    if(DEFINED ENV{VCPKG_ROOT} AND NOT DEFINED CMAKE_TOOLCHAIN_FILE)
        set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake" CACHE STRING "")
    endif()
    
    add_compile_definitions(_CRT_SECURE_NO_WARNINGS)
    add_compile_definitions(_WINSOCK_DEPRECATED_NO_WARNINGS)

    add_compile_options(/U__APPLE__)
    add_compile_options(/FI"utils/FeatureLibrary.h")
    add_compile_options(/bigobj)
    add_compile_options(/utf-8)

    add_compile_definitions(
        _WIN32_WINNT=0x0A00
        WINVER=0x0A00
        _HAS_STD_BYTE=0
        _SILENCE_CXX17_CODECVT_HEADER_DEPRECATION_WARNING
        _SILENCE_ALL_CXX17_DEPRECATION_WARNINGS
        NOMINMAX
    )
endif()

# ==============================================================================
# 2. TÌM KIẾM THƯ VIỆN (BOOST, OPENSSL, JSON)
# ==============================================================================

# Thiết lập chung cho các thư viện tĩnh (Static)
set(Boost_USE_STATIC_LIBS ON)
set(OPENSSL_USE_STATIC_LIBS ON)

if(WIN32)
    # --- LOGIC CHO WINDOWS ---
    if(CMAKE_TOOLCHAIN_FILE)
        # Trường hợp dùng VCPKG
        find_package(Boost CONFIG REQUIRED COMPONENTS system)
        find_package(OpenSSL REQUIRED)
        find_package(nlohmann_json CONFIG REQUIRED)
    else()
        # Trường hợp KHÔNG dùng VCPKG (Tìm thủ công)
        
        # BƯỚC QUAN TRỌNG: Nếu bạn đã cài Boost thủ công, hãy bỏ comment dòng dưới 
        # và sửa thành đường dẫn thực tế trên máy bạn:
        # set(BOOST_ROOT "D:/MMT/boost_1_86_0") 
        
        set(Boost_USE_MULTITHREADED ON)
        
        # Tìm kiếm Boost
        find_package(Boost REQUIRED COMPONENTS system)
        find_package(OpenSSL REQUIRED)
        find_package(nlohmann_json CONFIG QUIET)
        
        if(NOT nlohmann_json_FOUND)
            message(WARNING "nlohmann_json not found via CONFIG. Please ensure it is installed.")
        endif()
    endif()

elseif(APPLE)
    # --- LOGIC CHO MAC (GIỮ NGUYÊN) ---
    set(Boost_ROOT "/opt/homebrew/opt/boost" "/usr/local/opt/boost")
    set(BOOST_ROOT ${Boost_ROOT})
    set(BOOST_INCLUDEDIR "${Boost_ROOT}/include")
    set(BOOST_LIBRARYDIR "${Boost_ROOT}/lib")
    set(Boost_NO_BOOST_CMAKE ON)
    
    set(OPENSSL_ROOT_DIR "/opt/homebrew/opt/openssl" "/usr/local/opt/openssl")
    
    find_package(Boost REQUIRED COMPONENTS system)
    find_package(OpenSSL REQUIRED)
    
    find_package(nlohmann_json CONFIG QUIET)
    if(NOT nlohmann_json_FOUND)
        find_path(nlohmann_json_INCLUDE_DIR NAMES nlohmann/json.hpp 
                  PATHS /usr/include /usr/local/include /opt/homebrew/include)
        if(nlohmann_json_INCLUDE_DIR)
            add_library(nlohmann_json::nlohmann_json INTERFACE IMPORTED)
            set_target_properties(nlohmann_json::nlohmann_json PROPERTIES
                INTERFACE_INCLUDE_DIRECTORIES "${nlohmann_json_INCLUDE_DIR}")
            set(nlohmann_json_FOUND TRUE)
        endif()
    endif()
endif()

# ==============================================================================
# 3. QUẢN LÝ SOURCE FILES VÀ BUILD EXECUTABLE
# ==============================================================================

file(GLOB_RECURSE AGENT_SOURCES "${CMAKE_SOURCE_DIR}/src/*.cpp")

if(WIN32)
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_MAC\\.cpp$")
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_LINUX\\.cpp$")
    list(APPEND AGENT_SOURCES "${CMAKE_SOURCE_DIR}/agent.rc")
elseif(APPLE)
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_WIN\\.cpp$")
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_LINUX\\.cpp$")
endif()

add_executable(agent ${AGENT_SOURCES})

target_include_directories(agent PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/include/core
    ${CMAKE_SOURCE_DIR}/include/handlers
    ${CMAKE_SOURCE_DIR}/include/modules
    ${CMAKE_SOURCE_DIR}/include/network
    ${CMAKE_SOURCE_DIR}/include/utils
    ${CMAKE_SOURCE_DIR}/config
)

# ==============================================================================
# 4. LINK LIBRARIES
# ==============================================================================

# Link Boost
if(Boost_FOUND)
    if(TARGET Boost::headers)
        target_link_libraries(agent PRIVATE Boost::headers)
    else()
        target_include_directories(agent PRIVATE ${Boost_INCLUDE_DIRS})
    endif()
    
    if(TARGET Boost::system)
        target_link_libraries(agent PRIVATE Boost::system)
    elseif(Boost_SYSTEM_FOUND AND Boost_SYSTEM_LIBRARY)
        target_link_libraries(agent PRIVATE ${Boost_SYSTEM_LIBRARY})
    endif()
endif()

# Link OpenSSL
target_link_libraries(agent PRIVATE OpenSSL::SSL OpenSSL::Crypto)

# Link JSON
if(nlohmann_json_FOUND)
    if(TARGET nlohmann_json::nlohmann_json)
        target_link_libraries(agent PRIVATE nlohmann_json::nlohmann_json)
    else()
        target_include_directories(agent PRIVATE ${nlohmann_json_INCLUDE_DIR})
    endif()
endif()

if(WIN32)
    target_link_libraries(agent PRIVATE ws2_32 mswsock iphlpapi)
    
    # Windows Manifest cho Admin Privileges
    set(MANIFEST_FILE "${CMAKE_SOURCE_DIR}/agent.manifest")
    find_program(MT_EXECUTABLE mt.exe PATHS
        "$ENV{ProgramFiles}/Windows Kits/10/bin/x64"
        "$ENV{ProgramFiles\(x86\)}/Windows Kits/10/bin/x64"
    )
    if(MT_EXECUTABLE AND EXISTS ${MANIFEST_FILE})
        add_custom_command(TARGET agent POST_BUILD
            COMMAND ${MT_EXECUTABLE} -manifest ${MANIFEST_FILE} -outputresource:$<TARGET_FILE:agent>;\#1
            COMMENT "Embedding manifest for admin privileges"
        )
    endif()
elseif(APPLE)
    target_link_libraries(agent PRIVATE "-framework ApplicationServices" "-framework Carbon" "-framework Foundation")
endif()

# ==============================================================================
# 5. RELEASE OPTIMIZATION
# ==============================================================================
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    if(WIN32)
        set_target_properties(agent PROPERTIES LINK_FLAGS "/OPT:REF /OPT:ICF /LTCG /DEBUG:NONE")
        add_compile_options(/O2 /GL /Gy /Gw)
    elseif(APPLE)
        set_target_properties(agent PROPERTIES LINK_FLAGS "-Wl,-dead_strip")
        add_compile_options(-O3 -flto)
    endif()
endif()

# Set entry point for Windows console application
# if(WIN32)
#     target_link_options(agent PRIVATE /ENTRY:mainCRTStartup)
# endif()