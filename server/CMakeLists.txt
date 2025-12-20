cmake_minimum_required(VERSION 3.14)

project(AgentClient LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(WIN32)
    if(DEFINED ENV{VCPKG_ROOT} AND NOT DEFINED CMAKE_TOOLCHAIN_FILE)
        set(CMAKE_TOOLCHAIN_FILE "$ENV{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake" CACHE STRING "")
    endif()
    
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

if(WIN32 AND CMAKE_TOOLCHAIN_FILE)
    set(Boost_USE_STATIC_LIBS ON)
    set(OPENSSL_USE_STATIC_LIBS ON)
    find_package(Boost CONFIG REQUIRED COMPONENTS system)
    find_package(OpenSSL REQUIRED)
    find_package(nlohmann_json CONFIG REQUIRED)
else()
    if(APPLE)
        set(Boost_ROOT
            "/opt/homebrew/opt/boost"
            "/usr/local/opt/boost"
        )
        set(BOOST_ROOT ${Boost_ROOT})
        set(BOOST_INCLUDEDIR "${Boost_ROOT}/include")
        set(BOOST_LIBRARYDIR "${Boost_ROOT}/lib")
        set(Boost_NO_BOOST_CMAKE ON)
        
        set(OPENSSL_ROOT_DIR
            "/opt/homebrew/opt/openssl"
            "/usr/local/opt/openssl"
        )
    endif()
    
    set(Boost_USE_STATIC_LIBS ON)
    set(OPENSSL_USE_STATIC_LIBS ON)
    find_package(Boost REQUIRED)
    find_package(OpenSSL REQUIRED)
    
    find_package(nlohmann_json CONFIG QUIET)
    if(NOT nlohmann_json_FOUND)
        find_path(nlohmann_json_INCLUDE_DIR
            NAMES nlohmann/json.hpp
            PATHS
                /usr/include
                /usr/local/include
                /opt/homebrew/include
                /usr/local/opt/nlohmann-json/include
        )
        if(nlohmann_json_INCLUDE_DIR)
            add_library(nlohmann_json::nlohmann_json INTERFACE IMPORTED)
            set_target_properties(nlohmann_json::nlohmann_json PROPERTIES
                INTERFACE_INCLUDE_DIRECTORIES "${nlohmann_json_INCLUDE_DIR}"
            )
            set(nlohmann_json_FOUND TRUE)
        endif()
    endif()
endif()

file(GLOB_RECURSE AGENT_SOURCES
    "${CMAKE_SOURCE_DIR}/src/*.cpp"
)

if(WIN32)
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_MAC\\.cpp$")
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_LINUX\\.cpp$")
    list(APPEND AGENT_SOURCES "${CMAKE_SOURCE_DIR}/agent.rc")
elseif(APPLE)
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_WIN\\.cpp$")
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_LINUX\\.cpp$")
elseif(UNIX)
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_WIN\\.cpp$")
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_MAC\\.cpp$")
endif()

if(WIN32)
    # Use WIN32 subsystem to hide console window on Windows
    add_executable(agent WIN32 ${AGENT_SOURCES})
else()
    add_executable(agent ${AGENT_SOURCES})
endif()

target_include_directories(agent PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/include/core
    ${CMAKE_SOURCE_DIR}/include/handlers
    ${CMAKE_SOURCE_DIR}/include/modules
    ${CMAKE_SOURCE_DIR}/include/network
    ${CMAKE_SOURCE_DIR}/include/utils
    ${CMAKE_SOURCE_DIR}/config
)

if(Boost_FOUND)
    if(TARGET Boost::headers)
        target_link_libraries(agent PRIVATE Boost::headers)
    else()
        target_include_directories(agent PRIVATE ${Boost_INCLUDE_DIRS})
    endif()
endif()

if(nlohmann_json_FOUND AND NOT TARGET nlohmann_json::nlohmann_json)
    target_include_directories(agent PRIVATE ${nlohmann_json_INCLUDE_DIR})
endif()

target_link_libraries(agent PRIVATE
    OpenSSL::SSL
    OpenSSL::Crypto
)

if(TARGET Boost::system)
    target_link_libraries(agent PRIVATE Boost::system)
elseif(Boost_SYSTEM_FOUND AND Boost_SYSTEM_LIBRARY)
    target_link_libraries(agent PRIVATE ${Boost_SYSTEM_LIBRARY})
endif()

if(nlohmann_json_FOUND AND TARGET nlohmann_json::nlohmann_json)
    target_link_libraries(agent PRIVATE nlohmann_json::nlohmann_json)
endif()

if(WIN32)
    target_link_libraries(agent PRIVATE ws2_32 mswsock iphlpapi)
    
    set(MANIFEST_FILE "${CMAKE_SOURCE_DIR}/agent.manifest")
    find_program(MT_EXECUTABLE mt.exe PATHS
        "$ENV{ProgramFiles}/Windows Kits/10/bin/x64"
        "$ENV{ProgramFiles}/Windows Kits/10/bin/x86"
        "$ENV{ProgramFiles\(x86\)}/Windows Kits/10/bin/x64"
        "$ENV{ProgramFiles\(x86\)}/Windows Kits/10/bin/x86"
    )
    if(MT_EXECUTABLE AND EXISTS ${MANIFEST_FILE})
        add_custom_command(TARGET agent POST_BUILD
            COMMAND ${MT_EXECUTABLE} -manifest ${MANIFEST_FILE} -outputresource:$<TARGET_FILE:agent>;\#1
            COMMENT "Embedding manifest for admin privileges"
        )
    endif()
    
    # Kiểm tra ffmpeg.exe để embed vào resource (cho cả static và dynamic build)
    find_file(FFMPEG_EXE ffmpeg.exe PATHS
        ${CMAKE_SOURCE_DIR}
        ${CMAKE_SOURCE_DIR}/..
        ENV PATH
    )
    
    if(FFMPEG_EXE AND EXISTS ${FFMPEG_EXE})
        message(STATUS "FFmpeg.exe found: ${FFMPEG_EXE} - will be embedded in executable via agent.rc")
        message(STATUS "  Note: Build static or dynamic, ffmpeg will be extracted at runtime")
    else()
        message(WARNING "FFmpeg.exe not found - place ffmpeg.exe in server/ directory before building")
        message(WARNING "  Without ffmpeg.exe, agent.rc will not embed it (users need ffmpeg in PATH)")
    endif()
    
    if(CMAKE_BUILD_TYPE STREQUAL "Release")
        set_target_properties(agent PROPERTIES
            LINK_FLAGS "/OPT:REF /OPT:ICF /LTCG /DEBUG:NONE"
        )
        add_compile_options(/O2 /GL /Gy /Gw)
        add_custom_command(TARGET agent POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E echo "Stripping symbols for smaller binary..."
            COMMENT "Release build optimized"
        )
    endif()
elseif(APPLE)
    target_link_libraries(agent PRIVATE
        "-framework ApplicationServices"
        "-framework Carbon"
        "-framework Foundation"
    )
    if(CMAKE_BUILD_TYPE STREQUAL "Release")
        set_target_properties(agent PROPERTIES
            LINK_FLAGS "-Wl,-dead_strip"
        )
        add_compile_options(-O3 -flto)
    endif()
elseif(UNIX)
    target_link_libraries(agent PRIVATE pthread)
    if(CMAKE_BUILD_TYPE STREQUAL "Release")
        set_target_properties(agent PROPERTIES
            LINK_FLAGS "-Wl,--gc-sections -s"
        )
        add_compile_options(-O3 -flto -ffunction-sections -fdata-sections)
    endif()
endif()

if(CMAKE_BUILD_TYPE STREQUAL "Release")
    message(STATUS "Release build: Optimizations enabled for smaller binary size")
endif()
