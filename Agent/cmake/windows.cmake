macro(apply_platform_config)
    add_compile_definitions(_CRT_SECURE_NO_WARNINGS _WINSOCK_DEPRECATED_NO_WARNINGS)
    add_compile_definitions(_WIN32_WINNT=0x0A00 WINVER=0x0A00 NOMINMAX)
    add_compile_options(/utf-8 /bigobj)

    # Filter source
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_MAC\\.cpp$")
    list(FILTER AGENT_SOURCES EXCLUDE REGEX "_LINUX\\.cpp$")
    list(APPEND AGENT_SOURCES "${CMAKE_SOURCE_DIR}/agent.rc") #

    find_package(Boost CONFIG REQUIRED COMPONENTS system)
    find_package(OpenSSL REQUIRED)
    find_package(nlohmann_json CONFIG REQUIRED)

    target_link_libraries(agent PRIVATE 
        Boost::system 
        OpenSSL::SSL OpenSSL::Crypto
        nlohmann_json::nlohmann_json
        ws2_32 mswsock iphlpapi crypt32 gdi32 advapi32 user32 #
    )
endmacro()