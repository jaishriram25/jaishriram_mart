cmake_minimum_required(VERSION 3.20)

project(jai_mart_backend)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)

FetchContent_Declare(
    httplib
    GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
    GIT_TAG v0.18.3
)

FetchContent_MakeAvailable(httplib)


# PostgreSQL
set(PostgreSQL_INCLUDE_DIR "C:/msys64/ucrt64/include")
set(PostgreSQL_LIBRARY "C:/msys64/ucrt64/lib/libpq.dll.a")

find_package(PostgreSQL REQUIRED)


add_executable(jai_mart_server
    src/main.cpp
)


target_link_libraries(jai_mart_server
    PRIVATE
    httplib::httplib
    PostgreSQL::PostgreSQL
)