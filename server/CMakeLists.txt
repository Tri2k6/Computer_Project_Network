cmake_minimum_required(VERSION 3.14)

project(AgentClient LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(WIN32)
    add_compile_options(/U__APPLE__)
    add_compile_options(/FI"utils/FeatureLibrary.h")

    add_compile_definitions(
        _WIN32_WINNT=0x0A00 
        WINVER=0x0A00
        _HAS_STD_BYTE=0
        _SILENCE_CXX17_CODECVT_HEADER_DEPRECATION_WARNING
        NOMINMAX 
    )

    add_compile_definitions(_SILENCE_ALL_CXX17_DEPRECATION_WARNINGS)
    add_compile_options(/utf-8)
endif()

if(APPLE)
    set(OPENSSL_ROOT_DIR "/opt/homebrew/opt/openssl" "/usr/local/opt/openssl")
endif()

find_package(Boost REQUIRED)

find_package(nlohmann_json QUIET)
find_package(OpenSSL REQUIRED)

include_directories(
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/include/core
    ${CMAKE_SOURCE_DIR}/include/handlers
    ${CMAKE_SOURCE_DIR}/include/modules
    ${CMAKE_SOURCE_DIR}/include/network
    ${CMAKE_SOURCE_DIR}/include/utils
    ${CMAKE_SOURCE_DIR}/config
    ${OPENSSL_INCLUDE_DIR}
)

if(UNIX AND NOT APPLE)
    include_directories(/usr/local/include)
elseif(APPLE)
    include_directories(/opt/homebrew/include)
    include_directories(/usr/local/include)
endif()

if(Boost_FOUND)
    include_directories(${Boost_INCLUDE_DIRS})
endif()

file(GLOB_RECURSE AGENT_SOURCES
    "${CMAKE_SOURCE_DIR}/src/*.cpp"
)

if(WIN32)
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_MAC\\.cpp$")
elseif(APPLE)
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_WIN\\.cpp$")
endif()

message(STATUS "Found Source Files: ${AGENT_SOURCES}")

add_executable(agent ${AGENT_SOURCES})

target_link_libraries(agent PRIVATE OpenSSL::SSL OpenSSL::Crypto)

if(TARGET Boost::system)
    target_link_libraries(agent PRIVATE Boost::system Boost::thread Boost::filesystem)
else()
    target_link_libraries(agent PRIVATE ${Boost_LIBRARIES})
endif()

if(nlohmann_json_FOUND)
    target_link_libraries(agent PRIVATE nlohmann_json::nlohmann_json)
else()
    message(WARNING "nlohmann_json not found via find_package. Make sure it is in include path.")
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