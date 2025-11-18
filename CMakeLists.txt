cmake_minimum_required(VERSION 3.10)
project(MyApp)

set(CMAKE_CXX_STANDARD 17)

message(STATUS "Building on: ${CMAKE_SYSTEM_NAME}")

# Windows
if (WIN32)
    message(STATUS "Configuring for Windows")

    add_executable(MyApp
        main.cpp
        AppControl_WIN.cpp
        ProcessControl_WIN.cpp
    )

    target_link_libraries(MyApp
        Shlwapi
        Shell32
    )

# macOS
elseif (APPLE)
    message(STATUS "Configuring for macOS")

    add_executable(MyApp
        main.cpp
        AppControl_MAC.cpp
        ProcessControl_MAC.cpp
    )

    target_link_libraries(MyApp
        "-framework CoreFoundation"
        "-framework Cocoa"
    )
