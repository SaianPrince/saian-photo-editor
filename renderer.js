const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// DOM Elements
const btnImport = document.getElementById('btn-import');
const btnExport = document.getElementById('btn-export');
const btnReset = document.getElementById('btn-reset');
const filePicker = document.getElementById('file-picker');
const dropZone = document.getElementById('drop-zone');
const imageViewer = document.getElementById('image-viewer');
const imgPreview = document.getElementById('img-preview');
const fileNameSpan = document.getElementById('file-name');
const statusText = document.getElementById('status-text');
const statusDot = document.querySelector('.status-dot');

// Basic Tone Sliders & Displays
const sliderBrightness = document.getElementById('slider-brightness');
const valBrightness = document.getElementById('val-brightness');

const sliderContrast = document.getElementById('slider-contrast');
const valContrast = document.getElementById('val-contrast');

const sliderExposure = document.getElementById('slider-exposure');
const valExposure = document.getElementById('val-exposure');

const sliderGamma = document.getElementById('slider-gamma');
const valGamma = document.getElementById('val-gamma');

const sliderHighlights = document.getElementById('slider-highlights');
const valHighlights = document.getElementById('val-highlights');

const sliderShadows = document.getElementById('slider-shadows');
const valShadows = document.getElementById('val-shadows');

// Color & Details Sliders & Displays
const sliderSaturation = document.getElementById('slider-saturation');
const valSaturation = document.getElementById('val-saturation');

const sliderHue = document.getElementById('slider-hue');
const valHue = document.getElementById('val-hue');

const sliderTemp = document.getElementById('slider-temp');
const valTemp = document.getElementById('val-temp');

const sliderSharpness = document.getElementById('slider-sharpness');
const valSharpness = document.getElementById('val-sharpness');

const sliderNoise = document.getElementById('slider-noise');
const valNoise = document.getElementById('val-noise');

const sliderBlur = document.getElementById('slider-blur');
const valBlur = document.getElementById('val-blur');

// Creative FX Sliders & Buttons
const sliderVignette = document.getElementById('slider-vignette');
const valVignette = document.getElementById('val-vignette');

const btnSepia = document.getElementById('btn-sepia');
const btnGrayscale = document.getElementById('btn-grayscale');
const btnInvert = document.getElementById('btn-invert');
const btnSketch = document.getElementById('btn-sketch');

// Geometry Actions & Crop
const btnRotCw = document.getElementById('btn-rot-cw');
const btnFlipH = document.getElementById('btn-flip-h');
const btnFlipV = document.getElementById('btn-flip-v');
const btnFreeCrop = document.getElementById('btn-free-crop');
const btnResetCrop = document.getElementById('btn-reset-crop');

// Crop Overlay Elements
const cropOverlay = document.getElementById('crop-overlay');
const cropBox = document.getElementById('crop-box');
const btnCropCancel = document.getElementById('btn-crop-cancel');
const btnCropApply = document.getElementById('btn-crop-apply');

// Application States
let originalPath = "";
let tempPreviewPath = "";
let isProcessing = false;
let pendingRequest = null;

// Toggle Filter Flags
let isSepia = false;
let isGrayscale = false;
let isInverted = false;
let isSketch = false;

// Geometry Flags
let rotateAngle = 0; // 0, 90, 180, 270
let isFlippedH = false;
let isFlippedV = false;

// Crop State
let cropX = 0.0;
let cropY = 0.0;
let cropW = 0.0; // 0.0 means no active crop
let cropH = 0.0;

// 1. File Handling & Drag & Drop
btnImport.addEventListener('click', (e) => {
  e.stopPropagation(); // CRITICAL FIX: Stop event bubbling to dropZone to prevent double file dialog
  filePicker.click();
});

filePicker.addEventListener('change', (e) => {
  if (e.target.files.length > 0) loadImage(e.target.files[0].path);
});

dropZone.addEventListener('click', () => filePicker.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) loadImage(e.dataTransfer.files[0].path);
});

// Change Image button — go back to drop zone
const btnChangeImage = document.getElementById('btn-change-image');
btnChangeImage.addEventListener('click', () => {
  // Hide image viewer, show drop zone
  imageViewer.classList.add('hidden');
  dropZone.classList.remove('hidden');
  btnExport.setAttribute('disabled', 'true');
  
  // Reset everything
  originalPath = "";
  tempPreviewPath = "";
  imgPreview.src = "";
  filePicker.value = "";
  resetControls();
  
  statusText.textContent = "Saian Engine Idle";
  statusDot.className = "status-dot green";
});

function loadImage(filePath) {
  originalPath = filePath;
  fileNameSpan.textContent = path.basename(filePath);
  
  const tempDir = path.join(__dirname, 'backend', 'bin');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  tempPreviewPath = path.join(tempDir, 'temp_preview.jpg');
  
  dropZone.classList.add('hidden');
  imageViewer.classList.remove('hidden');
  btnExport.removeAttribute('disabled');
  
  resetControls();
  requestProcess();
}

// 2. Real-time Sliders Change Handlers
const sliders = [
  { element: sliderBrightness, display: valBrightness, decimals: 0 },
  { element: sliderContrast, display: valContrast, decimals: 1 },
  { element: sliderExposure, display: valExposure, decimals: 2 },
  { element: sliderGamma, display: valGamma, decimals: 2 },
  { element: sliderHighlights, display: valHighlights, decimals: 2 },
  { element: sliderShadows, display: valShadows, decimals: 2 },
  { element: sliderSaturation, display: valSaturation, decimals: 2 },
  { element: sliderHue, display: valHue, decimals: 0 },
  { element: sliderTemp, display: valTemp, decimals: 0 },
  { element: sliderSharpness, display: valSharpness, decimals: 1 },
  { element: sliderNoise, display: valNoise, decimals: 0 },
  { element: sliderBlur, display: valBlur, decimals: 0 },
  { element: sliderVignette, display: valVignette, decimals: 2 }
];

sliders.forEach(slider => {
  slider.element.addEventListener('input', (e) => {
    slider.display.textContent = parseFloat(e.target.value).toFixed(slider.decimals);
    requestProcess();
  });
});

// Toggle Creative FX
btnSepia.addEventListener('click', () => {
  isSepia = !isSepia;
  btnSepia.classList.toggle('active', isSepia);
  requestProcess();
});

btnGrayscale.addEventListener('click', () => {
  isGrayscale = !isGrayscale;
  btnGrayscale.classList.toggle('active', isGrayscale);
  requestProcess();
});

btnInvert.addEventListener('click', () => {
  isInverted = !isInverted;
  btnInvert.classList.toggle('active', isInverted);
  requestProcess();
});

btnSketch.addEventListener('click', () => {
  isSketch = !isSketch;
  btnSketch.classList.toggle('active', isSketch);
  requestProcess();
});

// Geometry Actions Handlers
btnRotCw.addEventListener('click', () => {
  rotateAngle = (rotateAngle + 90) % 360;
  btnRotCw.classList.toggle('active', rotateAngle !== 0);
  requestProcess();
});

btnFlipH.addEventListener('click', () => {
  isFlippedH = !isFlippedH;
  btnFlipH.classList.toggle('active', isFlippedH);
  requestProcess();
});

btnFlipV.addEventListener('click', () => {
  isFlippedV = !isFlippedV;
  btnFlipV.classList.toggle('active', isFlippedV);
  requestProcess();
});

// ----------------------------------------------------
// 3. Draggable & Resizable Free Crop Overlay
// ----------------------------------------------------
btnFreeCrop.addEventListener('click', () => {
  if (!originalPath) return;
  
  // Show crop overlay and align it exactly to img-preview bounds
  cropOverlay.classList.remove('hidden');
  alignCropOverlay();
  
  // Initialize crop box to centered 80% box
  const w = cropOverlay.clientWidth;
  const h = cropOverlay.clientHeight;
  const size = Math.min(w, h) * 0.8;
  
  cropBox.style.width = size + 'px';
  cropBox.style.height = size + 'px';
  cropBox.style.left = (w - size) / 2 + 'px';
  cropBox.style.top = (h - size) / 2 + 'px';
});

function alignCropOverlay() {
  cropOverlay.style.left = imgPreview.offsetLeft + 'px';
  cropOverlay.style.top = imgPreview.offsetTop + 'px';
  cropOverlay.style.width = imgPreview.clientWidth + 'px';
  cropOverlay.style.height = imgPreview.clientHeight + 'px';
}

// Re-align overlay when image preview updates or window resizes
window.addEventListener('resize', () => {
  if (!cropOverlay.classList.contains('hidden')) {
    alignCropOverlay();
  }
});

let isDragging = false;
let isResizing = false;
let activeHandle = null;
let startX, startY;
let startLeft, startTop, startWidth, startHeight;

const handles = {
  tl: cropBox.querySelector('.tl'),
  tr: cropBox.querySelector('.tr'),
  bl: cropBox.querySelector('.bl'),
  br: cropBox.querySelector('.br')
};

cropBox.addEventListener('mousedown', (e) => {
  if (e.target.classList.contains('crop-handle')) return;
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  startLeft = cropBox.offsetLeft;
  startTop = cropBox.offsetTop;
  e.preventDefault();
});

Object.keys(handles).forEach(key => {
  handles[key].addEventListener('mousedown', (e) => {
    isResizing = true;
    activeHandle = key;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = cropBox.offsetLeft;
    startTop = cropBox.offsetTop;
    startWidth = cropBox.offsetWidth;
    startHeight = cropBox.offsetHeight;
    e.stopPropagation();
    e.preventDefault();
  });
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging && !isResizing) return;
  
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  const parentW = cropOverlay.clientWidth;
  const parentH = cropOverlay.clientHeight;
  
  if (isDragging) {
    let newLeft = startLeft + dx;
    let newTop = startTop + dy;
    
    newLeft = Math.max(0, Math.min(newLeft, parentW - cropBox.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, parentH - cropBox.offsetHeight));
    
    cropBox.style.left = newLeft + 'px';
    cropBox.style.top = newTop + 'px';
  } else if (isResizing) {
    let newLeft = startLeft;
    let newTop = startTop;
    let newWidth = startWidth;
    let newHeight = startHeight;
    
    if (activeHandle === 'br') {
      newWidth = Math.max(60, Math.min(startWidth + dx, parentW - startLeft));
      newHeight = Math.max(60, Math.min(startHeight + dy, parentH - startTop));
    } else if (activeHandle === 'bl') {
      const maxDx = startLeft;
      const cleanDx = Math.max(-maxDx, dx);
      newLeft = startLeft + cleanDx;
      newWidth = Math.max(60, startWidth - cleanDx);
      newHeight = Math.max(60, Math.min(startHeight + dy, parentH - startTop));
    } else if (activeHandle === 'tr') {
      newWidth = Math.max(60, Math.min(startWidth + dx, parentW - startLeft));
      const maxDy = startTop;
      const cleanDy = Math.max(-maxDy, dy);
      newTop = startTop + cleanDy;
      newHeight = Math.max(60, startHeight - cleanDy);
    } else if (activeHandle === 'tl') {
      const maxDx = startLeft;
      const cleanDx = Math.max(-maxDx, dx);
      newLeft = startLeft + cleanDx;
      newWidth = Math.max(60, startWidth - cleanDx);
      
      const maxDy = startTop;
      const cleanDy = Math.max(-maxDy, dy);
      newTop = startTop + cleanDy;
      newHeight = Math.max(60, startHeight - cleanDy);
    }
    
    cropBox.style.left = newLeft + 'px';
    cropBox.style.top = newTop + 'px';
    cropBox.style.width = newWidth + 'px';
    cropBox.style.height = newHeight + 'px';
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  isResizing = false;
  activeHandle = null;
});

// Apply Crop
btnCropApply.addEventListener('click', (e) => {
  e.stopPropagation();
  const parentW = cropOverlay.clientWidth;
  const parentH = cropOverlay.clientHeight;
  
  cropX = cropBox.offsetLeft / parentW;
  cropY = cropBox.offsetTop / parentH;
  cropW = cropBox.offsetWidth / parentW;
  cropH = cropBox.offsetHeight / parentH;
  
  cropOverlay.classList.add('hidden');
  requestProcess();
});

// Cancel Crop
btnCropCancel.addEventListener('click', (e) => {
  e.stopPropagation();
  cropOverlay.classList.add('hidden');
});

// Reset Crop
btnResetCrop.addEventListener('click', () => {
  cropX = 0.0;
  cropY = 0.0;
  cropW = 0.0;
  cropH = 0.0;
  cropOverlay.classList.add('hidden');
  requestProcess();
});


// 4. Reset All Controls
btnReset.addEventListener('click', () => {
  resetControls();
  requestProcess();
});

function resetControls() {
  // Reset basic tone
  sliderBrightness.value = 0; valBrightness.textContent = "0";
  sliderContrast.value = 1.0; valContrast.textContent = "1.0";
  sliderExposure.value = 1.0; valExposure.textContent = "1.00";
  sliderGamma.value = 1.0; valGamma.textContent = "1.00";
  sliderHighlights.value = 0.0; valHighlights.textContent = "0.00";
  sliderShadows.value = 0.0; valShadows.textContent = "0.00";
  
  // Reset color & details
  sliderSaturation.value = 1.0; valSaturation.textContent = "1.00";
  sliderHue.value = 0; valHue.textContent = "0";
  sliderTemp.value = 0; valTemp.textContent = "0";
  sliderSharpness.value = 0.0; valSharpness.textContent = "0.0";
  sliderNoise.value = 0; valNoise.textContent = "0";
  sliderBlur.value = 0; valBlur.textContent = "0";
  
  // Reset FX
  sliderVignette.value = 0.0; valVignette.textContent = "0.00";
  
  isSepia = false; btnSepia.classList.remove('active');
  isGrayscale = false; btnGrayscale.classList.remove('active');
  isInverted = false; btnInvert.classList.remove('active');
  isSketch = false; btnSketch.classList.remove('active');
  
  // Reset Geometry
  rotateAngle = 0; btnRotCw.classList.remove('active');
  isFlippedH = false; btnFlipH.classList.remove('active');
  isFlippedV = false; btnFlipV.classList.remove('active');
  
  // Reset Crop
  cropX = 0.0;
  cropY = 0.0;
  cropW = 0.0;
  cropH = 0.0;
  cropOverlay.classList.add('hidden');
}

// 5. High-Performance Zero-Lag Live Preview Queue
function requestProcess() {
  if (!originalPath) return;

  // Calculate flip code
  let flipCode = -2; // Default no flip
  if (isFlippedH && isFlippedV) flipCode = -1;
  else if (isFlippedH) flipCode = 1;
  else if (isFlippedV) flipCode = 0;

  const currentParams = {
    blur: parseInt(sliderBlur.value),
    contrast: parseFloat(sliderContrast.value),
    brightness: parseInt(sliderBrightness.value),
    invert: isInverted ? 1 : 0,
    grayscale: isGrayscale ? 1 : 0,
    
    saturation: parseFloat(sliderSaturation.value),
    hue: parseInt(sliderHue.value),
    sharpness: parseFloat(sliderSharpness.value),
    exposure: parseFloat(sliderExposure.value),
    gamma: parseFloat(sliderGamma.value),
    sepia: isSepia ? 1 : 0,
    vignette: parseFloat(sliderVignette.value),
    noise: parseInt(sliderNoise.value),
    flip: flipCode,
    rotate: rotateAngle,
    
    // New parameters
    temp: parseFloat(sliderTemp.value),
    highlights: parseFloat(sliderHighlights.value),
    shadows: parseFloat(sliderShadows.value),
    sketch: isSketch ? 1 : 0,
    crop_x: cropX,
    crop_y: cropY,
    crop_w: cropW,
    crop_h: cropH
  };

  if (isProcessing) {
    // Queue this latest update, overriding previous unsent ones
    pendingRequest = currentParams;
    return;
  }
  
  isProcessing = true;
  statusText.textContent = "Saian Engine Processing...";
  statusDot.className = "status-dot orange";
  
  ipcRenderer.send('process-image', {
    inputPath: originalPath,
    outputPath: tempPreviewPath,
    ...currentParams
  });
}

// Receive success/error from IPC Main
ipcRenderer.on('engine-response', (event, response) => {
  isProcessing = false;
  
  if (response.success) {
    imgPreview.src = tempPreviewPath + '?t=' + Date.now();
    statusText.textContent = "Saian Engine Idle";
    statusDot.className = "status-dot green";
  } else {
    statusText.textContent = "Error: Saian Engine failed";
    statusDot.className = "status-dot red";
    console.error("Saian Engine Error:", response.error);
  }
  
  // If there's a pending change, execute it now
  if (pendingRequest) {
    const nextParams = pendingRequest;
    pendingRequest = null;
    isProcessing = true;
    
    ipcRenderer.send('process-image', {
      inputPath: originalPath,
      outputPath: tempPreviewPath,
      ...nextParams
    });
  }
});

// 6. Export & Save Image File
btnExport.addEventListener('click', () => {
  if (!tempPreviewPath) return;
  ipcRenderer.send('save-image', { tempPath: tempPreviewPath });
});

// Premium Toast Notification display helper
function showToast(title, message, isError = false) {
  const toast = document.getElementById('toast-notification');
  const toastTitle = toast.querySelector('.toast-title');
  const toastDesc = document.getElementById('toast-message');
  const successIcon = toast.querySelector('.success-icon');
  const errorIcon = toast.querySelector('.error-icon');
  
  toastTitle.textContent = title;
  toastDesc.textContent = message;
  
  if (isError) {
    toast.classList.add('error');
    successIcon.classList.add('hidden');
    errorIcon.classList.remove('hidden');
  } else {
    toast.classList.remove('error');
    successIcon.classList.remove('hidden');
    errorIcon.classList.add('hidden');
  }
  
  // Show toast
  toast.classList.remove('hidden');
  
  // Micro delay to trigger CSS transition
  setTimeout(() => {
    toast.classList.add('show');
  }, 30);
  
  // Auto-hide toast after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    // Hide completely after transition finishes
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 500);
  }, 5000);
}

ipcRenderer.on('save-image-response', (event, response) => {
  if (response.success) {
    showToast('Success', `Image saved successfully to:\n${response.path}`, false);
  } else if (response.error) {
    showToast('Error', `Could not save image:\n${response.error}`, true);
  }
});
