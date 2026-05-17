#include <opencv2/opencv.hpp>
#include <iostream>
#include <string>
#include <sstream>
#include <vector>
#include <cmath>
#include <fstream>
#include <windows.h>

using namespace std;
using namespace cv;

// Helper to convert UTF-8 narrow string to UTF-16 wstring on Windows
wstring utf8_to_wstring(const string& str) {
    if (str.empty()) return wstring();
    int size_needed = MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), NULL, 0);
    wstring wstrTo(size_needed, 0);
    MultiByteToWideChar(CP_UTF8, 0, &str[0], (int)str.size(), &wstrTo[0], size_needed);
    return wstrTo;
}

// Custom Unicode Image Reader to bypass Windows narrow-path imread limits
Mat load_image_unicode(const string& path) {
    wstring wpath = utf8_to_wstring(path);
    ifstream fs(wpath, ios::binary | ios::ate);
    if (!fs.is_open()) {
        return Mat();
    }
    
    streamsize size = fs.tellg();
    fs.seekg(0, ios::beg);
    
    vector<char> buffer(size);
    if (fs.read(buffer.data(), size)) {
        return imdecode(buffer, IMREAD_COLOR);
    }
    return Mat();
}

// Custom Unicode Image Writer to bypass Windows narrow-path imwrite limits
bool save_image_unicode(const string& path, const Mat& img) {
    wstring wpath = utf8_to_wstring(path);
    
    string ext = ".jpg";
    size_t dot = path.find_last_of('.');
    if (dot != string::npos) {
        ext = path.substr(dot);
    }
    
    vector<uchar> buffer;
    if (!imencode(ext, img, buffer)) {
        return false;
    }
    
    ofstream fs(wpath, ios::binary);
    if (!fs.is_open()) {
        return false;
    }
    
    fs.write(reinterpret_cast<const char*>(buffer.data()), buffer.size());
    return true;
}

void processImage(const string& input_path, const string& output_path, 
                  int blur_val, double contrast_val, int brightness_val, int invert_val, int grayscale_val,
                  double saturation_val, int hue_val, double sharpness_val, double exposure_val, 
                  double gamma_val, int sepia_val, double vignette_val, int noise_red_val, 
                  int flip_val, int rotate_val, double temp_val, double highlights_val, 
                  double shadows_val, int sketch_val, double crop_x_val, double crop_y_val, 
                  double crop_w_val, double crop_h_val) {
                  
    Mat img = load_image_unicode(input_path);
    if (img.empty()) {
        cout << "ERROR Could not read image" << endl;
        return;
    }

    // 1. Crop (ROI selection) - Executed FIRST so adjustments apply to the cropped area
    if (crop_w_val > 0.0 && crop_h_val > 0.0 && crop_w_val <= 1.0 && crop_h_val <= 1.0) {
        int x = static_cast<int>(crop_x_val * img.cols);
        int y = static_cast<int>(crop_y_val * img.rows);
        int w = static_cast<int>(crop_w_val * img.cols);
        int h = static_cast<int>(crop_h_val * img.rows);
        
        // Boundaries safety cap
        x = max(0, min(x, img.cols - 1));
        y = max(0, min(y, img.rows - 1));
        w = max(1, min(w, img.cols - x));
        h = max(1, min(h, img.rows - y));
        
        img = img(Rect(x, y, w, h));
    }

    // 2. Flip
    if (flip_val >= -1 && flip_val <= 1) {
        flip(img, img, flip_val);
    }

    // 3. Rotate
    if (rotate_val == 90) {
        rotate(img, img, ROTATE_90_CLOCKWISE);
    } else if (rotate_val == 180) {
        rotate(img, img, ROTATE_180);
    } else if (rotate_val == 270) {
        rotate(img, img, ROTATE_90_COUNTERCLOCKWISE);
    }

    // 4. Color Temperature (Warm / Cool shift)
    if (temp_val != 0.0) {
        vector<Mat> channels;
        split(img, channels); // BGR
        
        channels[0].convertTo(channels[0], CV_32F); // Blue
        channels[2].convertTo(channels[2], CV_32F); // Red
        
        if (temp_val > 0.0) { // Warmer: Add Red, subtract Blue
            channels[2] = channels[2] + temp_val * 0.4f;
            channels[0] = channels[0] - temp_val * 0.4f;
        } else { // Cooler: Add Blue, subtract Red
            channels[0] = channels[0] - temp_val * 0.4f; // temp_val is negative, so this adds blue
            channels[2] = channels[2] + temp_val * 0.4f; // temp_val is negative, so this subtracts red
        }
        
        threshold(channels[0], channels[0], 255.0, 255.0, THRESH_TRUNC);
        threshold(channels[0], channels[0], 0.0, 0.0, THRESH_TOZERO);
        threshold(channels[2], channels[2], 255.0, 255.0, THRESH_TRUNC);
        threshold(channels[2], channels[2], 0.0, 0.0, THRESH_TOZERO);
        
        channels[0].convertTo(channels[0], CV_8U);
        channels[2].convertTo(channels[2], CV_8U);
        merge(channels, img);
    }

    // 5. Highlights and Shadows
    if (highlights_val != 0.0 || shadows_val != 0.0) {
        Mat gray;
        cvtColor(img, gray, COLOR_BGR2GRAY);
        gray.convertTo(gray, CV_32F, 1.0 / 255.0); // Normalized 0.0 to 1.0
        
        vector<Mat> channels;
        split(img, channels);
        for (int i = 0; i < 3; i++) {
            channels[i].convertTo(channels[i], CV_32F);
            
            for (int r = 0; r < img.rows; r++) {
                for (int c = 0; c < img.cols; c++) {
                    float g = gray.at<float>(r, c);
                    float highlight_factor = pow(g, 2.0f); // More effect in bright areas
                    float shadow_factor = pow(1.0f - g, 2.0f); // More effect in dark areas
                    
                    float pixel = channels[i].at<float>(r, c);
                    pixel += highlight_factor * highlights_val * 35.0f;
                    pixel += shadow_factor * shadows_val * 35.0f;
                    
                    channels[i].at<float>(r, c) = max(0.0f, min(255.0f, pixel));
                }
            }
            channels[i].convertTo(channels[i], CV_8U);
        }
        merge(channels, img);
    }

    // 6. Grayscale
    if (grayscale_val > 0) {
        cvtColor(img, img, COLOR_BGR2GRAY);
        cvtColor(img, img, COLOR_GRAY2BGR);
    }

    // 7. Hue & Saturation
    if (hue_val != 0 || saturation_val != 1.0) {
        Mat hsv;
        cvtColor(img, hsv, COLOR_BGR2HSV);
        vector<Mat> channels;
        split(hsv, channels);

        if (hue_val != 0) {
            for (int r = 0; r < channels[0].rows; r++) {
                for (int c = 0; c < channels[0].cols; c++) {
                    int val = channels[0].at<uchar>(r, c) + hue_val;
                    if (val >= 180) val -= 180;
                    else if (val < 0) val += 180;
                    channels[0].at<uchar>(r, c) = static_cast<uchar>(val);
                }
            }
        }

        if (saturation_val != 1.0) {
            channels[1].convertTo(channels[1], CV_32F);
            channels[1] = channels[1] * saturation_val;
            threshold(channels[1], channels[1], 255.0, 255.0, THRESH_TRUNC);
            threshold(channels[1], channels[1], 0.0, 0.0, THRESH_TOZERO);
            channels[1].convertTo(channels[1], CV_8U);
        }

        merge(channels, hsv);
        cvtColor(hsv, img, COLOR_HSV2BGR);
    }

    // 8. Exposure
    if (exposure_val != 1.0) {
        img.convertTo(img, -1, exposure_val, 0);
    }

    // 9. Brightness and Contrast
    if (contrast_val != 1.0 || brightness_val != 0) {
        img.convertTo(img, -1, contrast_val, brightness_val);
    }

    // 10. Gamma Correction
    if (gamma_val != 1.0 && gamma_val > 0.0) {
        Mat lookUpTable(1, 256, CV_8U);
        uchar* p = lookUpTable.ptr();
        for (int i = 0; i < 256; ++i) {
            p[i] = saturate_cast<uchar>(pow(i / 255.0, gamma_val) * 255.0);
        }
        LUT(img, lookUpTable, img);
    }

    // 11. Blur
    if (blur_val > 0) {
        int ksize = blur_val;
        if (ksize % 2 == 0) ksize++;
        GaussianBlur(img, img, Size(ksize, ksize), 0);
    }

    // 12. Sharpness
    if (sharpness_val > 0.0) {
        Mat blurred;
        GaussianBlur(img, blurred, Size(0, 0), 3);
        addWeighted(img, 1.0 + sharpness_val, blurred, -sharpness_val, 0, img);
    }

    // 13. Non-Local Means Noise Reduction (much more effective than bilateral!)
    if (noise_red_val > 0) {
        Mat temp;
        // h = filter strength (higher = more denoise). Scale slider value aggressively.
        float h = noise_red_val * 2.0f;          // luminance filter strength
        float hColor = noise_red_val * 2.0f;     // color filter strength
        int templateWindowSize = 7;               // patch size (must be odd)
        int searchWindowSize = 21;                // search area (must be odd)
        fastNlMeansDenoisingColored(img, temp, h, hColor, templateWindowSize, searchWindowSize);
        img = temp;
    }

    // 14. Sepia Filter
    if (sepia_val > 0) {
        Mat kernel = (Mat_<float>(3, 3) << 
            0.272, 0.534, 0.131,
            0.349, 0.686, 0.168,
            0.393, 0.769, 0.189);
        transform(img, img, kernel);
    }

    // 15. Vignette (Supports White & Black Vignette!)
    if (vignette_val != 0.0) {
        int cols = img.cols;
        int rows = img.rows;
        Mat mask(rows, cols, CV_32F);
        int cx = cols / 2;
        int cy = rows / 2;
        float max_dist = sqrt(cx * cx + cy * cy);
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                float dist = sqrt((r - cy) * (r - cy) + (c - cx) * (c - cx));
                float factor = dist / max_dist;
                
                if (vignette_val > 0.0) { // Black vignette
                    mask.at<float>(r, c) = 1.0f - factor * vignette_val;
                } else { // White vignette (negative value)
                    mask.at<float>(r, c) = 1.0f + factor * vignette_val; 
                }
                if (mask.at<float>(r, c) < 0.0f) mask.at<float>(r, c) = 0.0f;
                if (mask.at<float>(r, c) > 1.0f) mask.at<float>(r, c) = 1.0f;
            }
        }
        vector<Mat> channels;
        split(img, channels);
        for (int i = 0; i < 3; i++) {
            Mat fchan;
            channels[i].convertTo(fchan, CV_32F);
            if (vignette_val > 0.0) {
                multiply(fchan, mask, fchan);
            } else {
                fchan = fchan + (1.0f - mask) * 255.0f; // Blend with pure white
            }
            fchan.convertTo(channels[i], CV_8U);
        }
        merge(channels, img);
    }

    // 16. Pencil Sketch Filter
    if (sketch_val > 0) {
        Mat gray, gray_inv, blurred, sketch;
        cvtColor(img, gray, COLOR_BGR2GRAY);
        bitwise_not(gray, gray_inv);
        GaussianBlur(gray_inv, blurred, Size(21, 21), 0);
        bitwise_not(blurred, blurred);
        divide(gray, blurred, sketch, 256.0);
        cvtColor(sketch, img, COLOR_GRAY2BGR);
    }

    // 17. Invert Colors
    if (invert_val > 0) {
        bitwise_not(img, img);
    }

    bool success = save_image_unicode(output_path, img);
    if (!success) {
        cout << "ERROR Could not write image" << endl;
    } else {
        cout << "SUCCESS" << endl;
    }
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string cmd;
    while (getline(cin, cmd)) {
        if (cmd == "EXIT") {
            break;
        } else if (cmd == "PROCESS") {
            string input_path, output_path, params_line;
            getline(cin, input_path);
            getline(cin, output_path);
            getline(cin, params_line);

            stringstream ss(params_line);
            
            // Standard parameters (15)
            int blur_val, brightness_val, invert_val, grayscale_val;
            double contrast_val;
            double saturation_val, sharpness_val, exposure_val, gamma_val, vignette_val;
            int hue_val, sepia_val, noise_red_val, flip_val, rotate_val;
            
            // Advanced parameters (10)
            double temp_val, highlights_val, shadows_val;
            int sketch_val;
            double crop_x_val, crop_y_val, crop_w_val, crop_h_val;
            
            ss >> blur_val >> contrast_val >> brightness_val >> invert_val >> grayscale_val
               >> saturation_val >> hue_val >> sharpness_val >> exposure_val >> gamma_val
               >> sepia_val >> vignette_val >> noise_red_val >> flip_val >> rotate_val
               >> temp_val >> highlights_val >> shadows_val >> sketch_val
               >> crop_x_val >> crop_y_val >> crop_w_val >> crop_h_val;

            processImage(input_path, output_path, 
                         blur_val, contrast_val, brightness_val, invert_val, grayscale_val,
                         saturation_val, hue_val, sharpness_val, exposure_val, gamma_val,
                         sepia_val, vignette_val, noise_red_val, flip_val, rotate_val,
                         temp_val, highlights_val, shadows_val, sketch_val,
                         crop_x_val, crop_y_val, crop_w_val, crop_h_val);
        } else {
            cout << "UNKNOWN_COMMAND" << endl;
        }
    }
    return 0;
}
