cmake_minimum_required(VERSION 3.14)

project(AgentClient LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---------------- Windows flags ----------------
if(WIN32)
    add_compile_options(/U__APPLE__)
    add_compile_options(/FI"utils/FeatureLibrary.h")

    add_compile_options(/bigobj)

    add_compile_definitions(
        _WIN32_WINNT=0x0A00
        WINVER=0x0A00
        _HAS_STD_BYTE=0
        _SILENCE_CXX17_CODECVT_HEADER_DEPRECATION_WARNING
        _SILENCE_ALL_CXX17_DEPRECATION_WARNINGS
        NOMINMAX
    )

    add_compile_options(/utf-8)
endif()

# ---------------- Apple OpenSSL ----------------
if(APPLE)
    set(OPENSSL_ROOT_DIR
        "/opt/homebrew/opt/openssl"
        "/usr/local/opt/openssl"
    )
endif()

# ================= Packages ====================

# 🔥 vcpkg-style
find_package(Boost CONFIG REQUIRED COMPONENTS
    system
    asio
    beast
)

find_package(OpenSSL REQUIRED)
find_package(nlohmann_json CONFIG QUIET)

# ================= Sources =====================

file(GLOB_RECURSE AGENT_SOURCES
    "${CMAKE_SOURCE_DIR}/src/*.cpp"
)

if(WIN32)
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_MAC\\.cpp$")
elseif(APPLE)
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_WIN\\.cpp$")
endif()

add_executable(agent ${AGENT_SOURCES})

# ================= Includes ====================

target_include_directories(agent PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/include/core
    ${CMAKE_SOURCE_DIR}/include/handlers
    ${CMAKE_SOURCE_DIR}/include/modules
    ${CMAKE_SOURCE_DIR}/include/network
    ${CMAKE_SOURCE_DIR}/include/utils
    ${CMAKE_SOURCE_DIR}/config
)

# ================= Link ========================

target_link_libraries(agent PRIVATE
    OpenSSL::SSL
    OpenSSL::Crypto

    Boost::boost      # headers
    Boost::system
    Boost::asio
    Boost::beast
)

if(nlohmann_json_FOUND)
    target_link_libraries(agent PRIVATE nlohmann_json::nlohmann_json)
endif()

if(WIN32)
    target_link_libraries(agent PRIVATE ws2_32 mswsock iphlpapi)
elseif(APPLE)
    target_link_libraries(agent PRIVATE
        "-framework ApplicationServices"
        "-framework Carbon"
        "-framework Foundation"
    )
elseif(UNIX)
    target_link_libraries(agent PRIVATE pthread)
endif()
