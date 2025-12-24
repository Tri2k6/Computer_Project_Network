cmake_minimum_required(VERSION 3.14)
add_definitions(-DBOOST_ASIO_DISABLE_IOCP)
project(AgentClient LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# --- 1. CẤU HÌNH COMPILER (GIỮ NGUYÊN) ---
if(WIN32)
    if(DEFINED ENV{VCPKG_ROOT} AND NOT DEFINED CMAKE_TOOLCHAIN_FILE)
        set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake" CACHE STRING "")
    endif()
    add_compile_definitions(_CRT_SECURE_NO_WARNINGS _WINSOCK_DEPRECATED_NO_WARNINGS)
    add_compile_options(/U__APPLE__ /FI"utils/FeatureLibrary.h" /bigobj /utf-8)
    add_compile_definitions(_WIN32_WINNT=0x0A00 WINVER=0x0A00 _HAS_STD_BYTE=0 NOMINMAX)
endif()

set(Boost_USE_STATIC_LIBS ON)
set(OPENSSL_USE_STATIC_LIBS ON)

# --- 2. TÌM THƯ VIỆN (CHUNG) ---
if(WIN32)
    find_package(Boost CONFIG REQUIRED COMPONENTS system)
    find_package(OpenSSL REQUIRED)
    find_package(nlohmann_json CONFIG REQUIRED)
else()
    find_package(Boost REQUIRED COMPONENTS system)
    find_package(OpenSSL REQUIRED)
    find_package(nlohmann_json CONFIG QUIET)
    if(NOT nlohmann_json_FOUND)
        find_path(nlohmann_json_INCLUDE_DIR NAMES nlohmann/json.hpp PATHS /usr/include /usr/local/include /opt/homebrew/include)
    endif()
endif()

# --- 3. TÌM THƯ VIỆN (LINUX RIÊNG) ---
if(NOT WIN32 AND NOT APPLE)
    find_package(X11 REQUIRED)
    find_package(PkgConfig REQUIRED)
    pkg_check_modules(XTST REQUIRED xtst)
endif()

# --- 4. SOURCES ---
file(GLOB_RECURSE AGENT_SOURCES "${CMAKE_SOURCE_DIR}/src/*.cpp")
if(WIN32)
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_MAC\\.cpp$")
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_LINUX\\.cpp$")
    list(APPEND AGENT_SOURCES "${CMAKE_SOURCE_DIR}/agent.rc")
elseif(APPLE)
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_WIN\\.cpp$")
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_LINUX\\.cpp$")
else()
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_WIN\\.cpp$")
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_MAC\\.cpp$")
endif()

# --- 5. TẠO TARGET (QUAN TRỌNG: PHẢI CÓ CÁI NÀY TRƯỚC) ---
add_executable(agent ${AGENT_SOURCES})

# --- 6. INCLUDE PATHS (DÁN VÀO TARGET) ---
target_include_directories(agent PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/include/core
    ${CMAKE_SOURCE_DIR}/include/handlers
    ${CMAKE_SOURCE_DIR}/include/modules
    ${CMAKE_SOURCE_DIR}/include/network
    ${CMAKE_SOURCE_DIR}/include/utils
    ${CMAKE_SOURCE_DIR}/config
)

# Thêm include cho Linux
if(NOT WIN32 AND NOT APPLE)
    target_include_directories(agent PRIVATE ${X11_INCLUDE_DIR} ${XTST_INCLUDE_DIRS})
endif()

# --- 7. LINK LIBRARIES (DÁN VÀO TARGET) ---
target_link_libraries(agent PRIVATE OpenSSL::SSL OpenSSL::Crypto)

if(TARGET Boost::system)
    target_link_libraries(agent PRIVATE Boost::system)
endif()

if(nlohmann_json_FOUND OR TARGET nlohmann_json::nlohmann_json)
    target_link_libraries(agent PRIVATE nlohmann_json::nlohmann_json)
endif()

if(WIN32)
    target_link_libraries(agent PRIVATE ws2_32 mswsock iphlpapi crypt32 gdi32 advapi32 user32)
elseif(APPLE)
    target_link_libraries(agent PRIVATE "-framework ApplicationServices" "-framework Carbon" "-framework Foundation")
else()
   target_link_libraries(agent PRIVATE pthread)
    
    if(CMAKE_BUILD_TYPE STREQUAL "Release")
        set_target_properties(agent PROPERTIES
            LINK_FLAGS "-Wl,--gc-sections -s"
        )
        add_compile_options(-O3 -flto -ffunction-sections -fdata-sections)
    endif()
endif()