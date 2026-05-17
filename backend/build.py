import os
import subprocess
import shutil
import glob

def run_build():
    # Use 8.3 short paths everywhere to prevent MSVC from resolving the long physical path
    short_backend_dir = r"C:\Users\MER~1\GEMINI~1\ANTIGR~1\scratch\OPENCV~1\backend"
    short_bin_dir = os.path.join(short_backend_dir, "bin")
    
    # Kill any running engine.exe instance to prevent LNK1104 "file locked" errors
    print("Checking for active engine.exe processes...")
    try:
        subprocess.run("taskkill /f /im engine.exe", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

    # Create target bin directory
    print("Creating target bin directory...")
    os.makedirs(short_bin_dir, exist_ok=True)
        
    vcvars_bat = r"C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat"
    
    # Direct compilation using cl.exe (Bypasses CMake completely to avoid absolute path expansion!)
    # We compile main.cpp directly using relative paths for our files and 8.3 short paths for OpenCV.
    # This is 100% immune to Windows path encoding / Turkish character bugs!
    cmd = (
        f'chcp 65001 && '
        f'call "{vcvars_bat}" && '
        f'cl.exe /EHsc /O2 main.cpp '
        f'/I "C:\\Users\\MER~1\\GEMINI~1\\ANTIGR~1\\scratch\\OPENCV~1\\opencv\\build\\include" '
        f'/link '
        f'/LIBPATH:"C:\\Users\\MER~1\\GEMINI~1\\ANTIGR~1\\scratch\\OPENCV~1\\opencv\\build\\x64\\vc16\\lib" '
        f'opencv_world490.lib '
        f'/OUT:bin\\engine.exe '
        f'/DEBUG:NONE'
    )
    
    print("Compiling C++ backend directly with cl.exe (Zero-CMake Strategy)...")
    
    process = subprocess.Popen(
        cmd,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding='utf-8',
        errors='replace',
        cwd=short_backend_dir
    )
    
    for line in process.stdout:
        print(line, end="")
        
    process.wait()
    if process.returncode == 0:
        print("\nBuild Successful!")
        
        # Copy OpenCV DLLs to the bin directory using the short path
        print("Copying OpenCV DLLs to bin directory...")
        
        # Search in the short path of opencv directory
        short_opencv_x64_dir = r"C:\Users\MER~1\GEMINI~1\ANTIGR~1\scratch\OPENCV~1\opencv\build\x64"
        dll_pattern = os.path.join(short_opencv_x64_dir, "vc*", "bin", "opencv_world*.dll")
        dlls = glob.glob(dll_pattern)
        
        if dlls:
            for dll in dlls:
                if not dll.endswith("d.dll"):
                    shutil.copy(dll, short_bin_dir)
                    print(f"Copied: {os.path.basename(dll)}")
            print("DLL copy finished successfully!")
            print("You are ready to start the application!")
        else:
            print("Warning: OpenCV DLLs not found. Make sure the path is correct.")
    else:
        print(f"\nBuild Failed with exit code {process.returncode}")

if __name__ == "__main__":
    run_build()
