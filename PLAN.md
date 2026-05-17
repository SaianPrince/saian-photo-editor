# C++ OpenCV & Electron Image Editor (Görüntü Düzenleme Programı)

*English version below / Türkçe versiyonu aşağıdadır.*

---

## 🇬🇧 English

This project is a high-performance desktop image editor that combines the power of C++ and OpenCV with a modern, user-friendly frontend.

### 🏗️ Architecture

The project consists of two main components:

1. **Image Processing Engine (Backend - C++)**: 
   - Developed with C++ using the OpenCV library.
   - Runs in the background. It receives image processing parameters (contrast, blur, brightness, invert colors, etc.) from the frontend, processes the image, and returns the result.
   - Communication is handled via standard I/O using base64 encoding or a local websocket server for maximum speed.

2. **User Interface (Frontend - Electron.js)**:
   - Designed with a modern, elegant, and dynamic interface (Dark theme, modern sliders, glassmorphism).
   - Users can see their changes in real-time.
   - Using Electron.js, both the frontend and the backend C++ engine are bundled into a single, executable `.exe` file.

### 🚀 Development Steps

1. **C++ and OpenCV Setup**:
   - Integration of the OpenCV library.
   - Writing core C++ functions to apply image filters (Blur, Brightness, Contrast, Invert, Grayscale, etc.).
2. **Frontend (UI) Development**:
   - Modern UI design using HTML/CSS and Vanilla JS / React.
   - Image upload area, trackbars (sliders), and export (save) operations.
3. **Integration**:
   - Spawning the C++ executable as a child process from within the Electron application and establishing communication.
4. **Build & Package**:
   - Packaging the application as a single `.exe` file suitable for end-users using `electron-builder`.

---

## 🇹🇷 Türkçe

Bu proje, C++ ve OpenCV'nin gücünü kullanarak yüksek performanslı görüntü işleme yapabilen, aynı zamanda modern ve kullanıcı dostu bir arayüze sahip bir masaüstü uygulamasıdır.

### 🏗️ Mimari Yaklaşım

Proje iki ana bileşenden oluşur:

1. **Görüntü İşleme Motoru (Backend - C++)**: 
   - OpenCV kütüphanesi kullanılarak C++ ile geliştirilmiştir.
   - Arka planda çalışır. Frontend'den gelen görüntü işleme parametrelerini (kontrast, blur, parlaklık, renk tersine çevirme vs.) alıp fotoğrafı işler ve sonucu geri döndürür.
   - İletişim, hızlı olması açısından standart I/O üzerinden base64 kodlaması kullanılarak veya lokal bir websocket sunucusu ile sağlanır.

2. **Kullanıcı Arayüzü (Frontend - Electron.js)**:
   - Modern, şık ve dinamik bir arayüz ile (Karanlık tema, modern slider'lar, cam efekti) tasarlanmıştır.
   - Kullanıcı arayüzde yaptığı değişiklikleri anında görebilir.
   - Electron.js sayesinde hem frontend hem de arka plandaki C++ motoru paketlenip, tek tıkla çalışan bir `.exe` haline getirilir.

### 🚀 Geliştirme Adımları

1. **C++ ve OpenCV Altyapısının Hazırlanması**:
   - OpenCV kütüphanesi entegrasyonu.
   - Görüntü filtrelerini uygulayacak temel C++ fonksiyonlarının yazılması (Blur, Brightness, Contrast, Invert, Grayscale vs.).
2. **Frontend (UI) Geliştirme**:
   - HTML/CSS ve Vanilla JS / React kullanarak modern arayüz tasarımı.
   - Fotoğraf yükleme alanı, trackbar'lar (slider'lar) ve dışa aktarma (kaydetme) işlemleri.
3. **Entegrasyon**:
   - Electron uygulaması içerisinden C++ kodunun arka plan işlemi (child process) olarak başlatılması ve haberleştirilmesi.
4. **Paketleme (Build)**:
   - Uygulamanın `electron-builder` ile son kullanıcıya uygun tek bir `.exe` dosyası olarak paketlenmesi.

