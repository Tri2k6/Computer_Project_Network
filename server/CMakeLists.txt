cmake_minimum_required(VERSION 3.14)

project(ServerApp LANGUAGES CXX)

# Standard include paths
include_directories(/usr/local/include)
include_directories(/opt/homebrew/include)

# Your project headers (Fixed Path)
include_directories(${CMAKE_SOURCE_DIR}/include)

# Find source files (Fixed Paths)
file(GLOB SERVER_SRC
    "${CMAKE_SOURCE_DIR}/src/*.cpp"
    "${CMAKE_SOURCE_DIR}/src/module/*.cpp"
)

# Debug: Print found files to check if it's working
message(STATUS "Source files found: ${SERVER_SRC}")

add_executable(server ${SERVER_SRC})

if(UNIX)
    target_link_libraries(server pthread)
endif()