cmake_minimum_required(VERSION 3.15)

# Force CMake to skip compiler validation tests.
# This prevents it from building test files that crash due to PDB encoding issues (LNK1201) in Turkish paths.
set(CMAKE_C_COMPILER_WORKS 1)
set(CMAKE_CXX_COMPILER_WORKS 1)

project(ImageEditorEngine)

set(CMAKE_CXX_STANDARD 17)

# Disable MSVC Debug Information (PDB) generation completely
set(CMAKE_MSVC_DEBUG_INFORMATION_FORMAT "")
set(CMAKE_EXE_LINKER_FLAGS_RELEASE "/DEBUG:NONE")
set(CMAKE_EXE_LINKER_FLAGS_DEBUG "/DEBUG:NONE")
set(CMAKE_EXE_LINKER_FLAGS "/DEBUG:NONE")

# Manually configure OpenCV using relative/short paths
# Using CMAKE_CURRENT_SOURCE_DIR here is fine because it's for include, but we can also use short paths.
# Let's use the short path format directly to be absolutely safe!
set(OPENCV_INCLUDE_DIR "C:/Users/MER~1/GEMINI~1/ANTIGR~1/scratch/OPENCV~1/opencv/build/include")
set(OPENCV_LIB_DIR "C:/Users/MER~1/GEMINI~1/ANTIGR~1/scratch/OPENCV~1/opencv/build/x64/vc16/lib")
set(OPENCV_LIBRARY "${OPENCV_LIB_DIR}/opencv_world490.lib")

# Include OpenCV headers
include_directories(${OPENCV_INCLUDE_DIR})

add_executable(engine main.cpp)

# Link the OpenCV static import library directly
target_link_libraries(engine "${OPENCV_LIBRARY}")

# Set output directory to bin/ relative to CMAKE_CURRENT_BINARY_DIR (which is the 8.3 short path)
# This completely prevents LNK1104 write failures caused by Turkish characters in absolute output paths!
set_target_properties(engine PROPERTIES RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/../bin")
