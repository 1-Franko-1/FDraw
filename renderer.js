// === Custom Window Controls ===
const minBtn = document.getElementById('min-btn');
const maxBtn = document.getElementById('max-btn');
const closeBtn = document.getElementById('close-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');

minBtn.addEventListener('click', () => window.electronAPI.minimize());
maxBtn.addEventListener('click', () => window.electronAPI.maximize());
closeBtn.addEventListener('click', () => window.electronAPI.close());
modalCloseBtn.addEventListener('click', () => {
  document.getElementById('ai-modal').style.display = 'none';
});

document.getElementById('ai-modal').addEventListener('click', (event) => {
  if (event.target === document.getElementById('ai-modal')) {
    document.getElementById('ai-modal').style.display = 'none';
  }
});

// === AI Image Generator ===
document.getElementById('ai-tool').addEventListener('click', () => {
  document.getElementById("ai-modal").style.display = "block";
});

document.getElementById('aigenerate').addEventListener('click', async () => {
  document.getElementById('ai-modal').style.display = 'none';
  
  const aiInput = document.getElementById('aiinput').value.trim();
  if (aiInput === '') {
    statusText.textContent = 'Please enter a prompt.';
    return;
  }

  const encodedPrompt = encodeURIComponent(aiInput);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;

  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imageUrl;

  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    statusText.textContent = "Loaded AI-generated image.";
  };

  img.onerror = () => {
    statusText.textContent = "Failed to load AI-generated image.";
  };
});

// === Global Variables & Elements ===
const fileInput    = document.getElementById('file-input');
const canvas       = document.getElementById('canvas');
const ctx          = canvas.getContext('2d');
const statusText   = document.getElementById('status-text');
const downloadLink = document.getElementById('download-link');
const fileMenu     = document.getElementById('file-menu');
const fileDropdown = document.getElementById('file-dropdown');
const toolElements = document.querySelectorAll('.tool');
const adjustmentsDiv = document.getElementById('adjustments');

// Sliders
const brightnessSlider = document.getElementById('brightness');
const contrastSlider   = document.getElementById('contrast');
const saturationSlider = document.getElementById('saturation');
const hueSlider        = document.getElementById('hue');
const sepiaSlider      = document.getElementById('sepia');
const grayscaleSlider  = document.getElementById('grayscale');
const sharpnessSlider  = document.getElementById('sharpness');

let originalImage = new Image();
let imageLoaded = false;

// === Undo/Redo Stacks & Functions ===
const undoStack = [];
const redoStack = [];

const restoreState = (state) => {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    // Keep the base image in sync.
    originalImage.src = canvas.toDataURL();
  };
  img.src = state;
};

const undo = () => {
  if (undoStack.length) {
    redoStack.push(canvas.toDataURL());
    restoreState(undoStack.pop());
    statusText.textContent = 'Undo performed';
  }
};

const redo = () => {
  if (redoStack.length) {
    undoStack.push(canvas.toDataURL());
    restoreState(redoStack.pop());
    statusText.textContent = 'Redo performed';
  }
};

// Keyboard shortcuts for Undo/Redo (Ctrl+Z / Ctrl+Y)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey) {
    if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    } else if (e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    }
  }
});


// === Canvas Initialization ===
window.addEventListener('load', () => {
  if (!canvas.width || !canvas.height) {
    canvas.width = 800;
    canvas.height = 600;
  }
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  originalImage.src = canvas.toDataURL();
  imageLoaded = true;
  statusText.textContent = 'New Blank Image Initialized';
});


// === Image Drawing with Adjustments ===
const drawImage = () => {
  // Clear canvas and fill with white.
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (originalImage.src) {
    
    if (zoomLevel === 1) {
      // No zoom: draw the entire image scaled to the canvas.
      ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    } else {
      // Zoom in: determine a source rectangle from the original image.
      const srcWidth = originalImage.width / zoomLevel;
      const srcHeight = originalImage.height / zoomLevel;
      const srcX = (originalImage.width - srcWidth) / 2;
      const srcY = (originalImage.height - srcHeight) / 2;
      ctx.drawImage(originalImage,
                    srcX, srcY, srcWidth, srcHeight, // Source rectangle.
                    0, 0, canvas.width, canvas.height  // Destination fills the canvas.
                   );
    }
    ctx.filter = 'none';
  }

};

const update_filters = () => {
  // Convert slider values to CSS filter parameters.
  const brightness = brightnessSlider.value / 100;
  const contrast   = contrastSlider.value / 100;
  const saturation = saturationSlider.value / 100;
  const hue        = hueSlider.value;
  const sepia      = sepiaSlider.value;
  const grayscale  = grayscaleSlider.value;
  const sharpness  = sharpnessSlider.value / 100;

  ctx.filter = `
    brightness(${brightness})
    contrast(${contrast})
    saturate(${saturation})
    hue-rotate(${hue}deg)
    sepia(${sepia}%)
    grayscale(${grayscale}%)
  `;

  ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

  applySharpness(ctx, canvas.width, canvas.height, sharpness);
};

const applySharpness = (ctx, width, height, sharpness) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data }  = imageData;
  const output    = ctx.createImageData(width, height);
  const outputData = output.data;

  const a = sharpness;
  const kernel = [
    -a, -a, -a,
    -a, 1 + 8 * a, -a,
    -a, -a, -a
  ];

  const rowSize = width * 4;
  const offsets = [
    -rowSize - 4, -rowSize, -rowSize + 4,
    -4,            0,        4,
     rowSize - 4,  rowSize,  rowSize + 4
  ];

  // Process interior pixels.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      const i = (y * width + x) * 4;
      for (let k = 0; k < 9; k++) {
        const idx = i + offsets[k];
        r += data[idx]     * kernel[k];
        g += data[idx + 1] * kernel[k];
        b += data[idx + 2] * kernel[k];
      }
      outputData[i]     = Math.min(Math.max(r, 0), 255);
      outputData[i + 1] = Math.min(Math.max(g, 0), 255);
      outputData[i + 2] = Math.min(Math.max(b, 0), 255);
      outputData[i + 3] = data[i + 3]; // Preserve alpha.
    }
  }

  // Copy border pixels.
  outputData.set(data.subarray(0, rowSize), 0);
  outputData.set(data.subarray((height - 1) * rowSize, height * rowSize), (height - 1) * rowSize);
  for (let y = 1; y < height - 1; y++) {
    const rowStart = y * rowSize;
    outputData.set(data.subarray(rowStart, rowStart + 4), rowStart);
    const rightIndex = rowStart + (width - 1) * 4;
    outputData.set(data.subarray(rightIndex, rightIndex + 4), rightIndex);
  }
  
  return output;
};

sharpnessSlider.addEventListener('input', update_filters);

// Update the base image from the current canvas content.
const updateOriginalImage = () => {
  originalImage.src = canvas.toDataURL();
};


// === File Menu Dropdown & File Load/Save ===
fileMenu.addEventListener('click', (event) => {
  event.stopPropagation();
  fileDropdown.style.display = fileDropdown.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('click', (event) => {
  if (!fileMenu.contains(event.target) && !fileDropdown.contains(event.target)) {
    fileDropdown.style.display = 'none';
  }
});

document.getElementById('load-file').addEventListener('click', () => {
  fileInput.click();
  fileDropdown.style.display = 'none';
});
document.getElementById('save-file').addEventListener('click', () => {
  const dataURL = canvas.toDataURL();
  downloadLink.href = dataURL;
  downloadLink.download = 'edited_image.png';
  downloadLink.click();
  fileDropdown.style.display = 'none';
});

// === Global Zoom Variables ===
let baseCanvasWidth = canvas.width;
let baseCanvasHeight = canvas.height;
let maxCanvasWidth = baseCanvasWidth;
let maxCanvasHeight = baseCanvasHeight;
let zoomLevel = 1; // 1 = no zoom

// Function to update max canvas size based on the container dimensions.
const updateMaxCanvasSize = () => {
  const container = document.getElementById('canvas-container');
  if (container) {
    const rect = container.getBoundingClientRect();
    maxCanvasWidth = rect.width;
    maxCanvasHeight = rect.height;
  }
};

// Call updateMaxCanvasSize on page load and whenever needed.
window.addEventListener('load', updateMaxCanvasSize);

// Update these values when an image is loaded.
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    originalImage = new Image();
    originalImage.onload = () => {
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      // Update base size.
      baseCanvasWidth = originalImage.width;
      baseCanvasHeight = originalImage.height;
      // Reset zoom level.
      zoomLevel = 1;
      // Update the maximum canvas size based on the container.
      updateMaxCanvasSize();
      
      imageLoaded = true;
      statusText.textContent = `Loaded: ${file.name} (${originalImage.width} x ${originalImage.height})`;
      drawImage();
    };
    originalImage.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

canvas.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault(); // Prevent the default browser zoom behavior.
    
    const delta = e.deltaY;
    
    if (delta < 0) { // Zoom in
      // Only increase canvas size if BOTH width and height are below the container's limits.
      if (canvas.width < maxCanvasWidth && canvas.height < maxCanvasHeight) {
        let newWidth = canvas.width * 1.1;
        let newHeight = canvas.height * 1.1;
        // Clamp to maximum allowed dimensions.
        if (newWidth > maxCanvasWidth) newWidth = maxCanvasWidth;
        if (newHeight > maxCanvasHeight) newHeight = maxCanvasHeight;
        canvas.width = newWidth;
        canvas.height = newHeight;
      } else {
        // If either dimension is at its limit, increase the zoom level.
        zoomLevel *= 1.1;
      }
    } else { // Zoom out
      if (zoomLevel > 1) {
        zoomLevel /= 1.1;
        if (zoomLevel < 1) zoomLevel = 1;
      } else if (canvas.width > baseCanvasWidth || canvas.height > baseCanvasHeight) {
        // Shrink canvas size (if possible) when zoom level is at 1.
        let newWidth = canvas.width / 1.1;
        let newHeight = canvas.height / 1.1;
        if (newWidth < baseCanvasWidth) newWidth = baseCanvasWidth;
        if (newHeight < baseCanvasHeight) newHeight = baseCanvasHeight;
        canvas.width = newWidth;
        canvas.height = newHeight;
      }
    }
    drawImage();
  }
});

// Attach adjustment events for all filter sliders.
[brightnessSlider, contrastSlider, saturationSlider, hueSlider, sepiaSlider, grayscaleSlider].forEach(slider => {
  slider.addEventListener('input', update_filters);
});

// === Pencil & Eraser Thickness Variables ===
let pencilThickness = 2; // Default pencil thickness
let eraserThickness = 10; // Default eraser thickness

// === Pencil Thickness Slider (for drawing tool) ===
const showPencilThicknessSlider = () => {
  adjustmentsDiv.innerHTML = `
    <label for="pencil-thickness">Pencil Thickness:</label>
    <input type="range" id="pencil-thickness" min="1" max="50" value="${pencilThickness}">
  `;
  document.getElementById('pencil-thickness').addEventListener('input', (e) => {
    pencilThickness = e.target.value;
    statusText.textContent = `Pencil Thickness: ${pencilThickness}`;
  });
};

const showEraserThicknessSlider = () => {
  adjustmentsDiv.innerHTML = `
    <label for="eraser-thickness">Eraser Thickness:</label>
    <input type="range" id="eraser-thickness" min="1" max="50" value="${eraserThickness}">
  `;
  document.getElementById('eraser-thickness').addEventListener('input', (e) => {
    eraserThickness = e.target.value;
    statusText.textContent = `Eraser Thickness: ${eraserThickness}`;
  });
};

const hideThicknessSlider = () => {
  adjustmentsDiv.innerHTML = '';
};

// === Tool Selection & Canvas Drawing ===
let currentTool = null;  // "draw" or "erase"
let isDrawing = false;
let isErasing = false;
let lastX = 0, lastY = 0;

toolElements.forEach(tool => {
  tool.addEventListener('click', () => {
    // Update selected tool visuals.
    toolElements.forEach(t => t.classList.remove('selected'));
    tool.classList.add('selected');
    currentTool = tool.title; // Expected values: "draw" or "erase"
    statusText.textContent = `Tool Selected: ${currentTool}`;
    
    // Show the corresponding thickness slider.
    if (currentTool === 'draw') {
      showPencilThicknessSlider();
    } else if (currentTool === 'erase') {
      showEraserThicknessSlider();
    } else {
      hideThicknessSlider();
    }
  });
});

// Convert mouse coordinates to canvas coordinates.
const getCanvasCoordinates = (e) => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top)  * (canvas.height / rect.height)
  };
};

canvas.addEventListener('mousedown', (e) => {
  const { x, y } = getCanvasCoordinates(e);
  // Save state before starting a stroke.
  if (currentTool === 'draw' || currentTool === 'erase') {
    undoStack.push(canvas.toDataURL());
    redoStack.length = 0;
  }
  if (currentTool === 'draw') {
    isDrawing = true;
    lastX = x;
    lastY = y;
  } else if (currentTool === 'erase') {
    isErasing = true;
    lastX = x;
    lastY = y;
    ctx.globalCompositeOperation = 'destination-out';
  }
});

canvas.addEventListener('mousemove', (e) => {
  const { x, y } = getCanvasCoordinates(e);
  if (currentTool === 'draw' && isDrawing) {
    ctx.strokeStyle = 'black';
    ctx.lineWidth = pencilThickness;
    ctx.lineCap   = 'round';
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  } else if (currentTool === 'erase' && isErasing) {
    ctx.lineWidth = eraserThickness;
    ctx.lineCap   = 'round';
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  }
});

const endDrawing = () => {
  if (isDrawing || isErasing) {
    isDrawing = false;
    isErasing = false;
    ctx.globalCompositeOperation = 'source-over';
    updateOriginalImage();
  }
};

canvas.addEventListener('mouseup', endDrawing);
canvas.addEventListener('mouseout', endDrawing);

// === Auto-Adjust Tool for Saturation & Sharpness ===
let autoSaturationApplied = false;
let autoSharpnessApplied = false;
let originalSaturationValue = null;
let originalSharpnessValue   = null;

document.getElementById('AJT-tool').addEventListener('click', () => {
  if (autoSaturationApplied || autoSharpnessApplied) {
    // Revert to original values.
    if (originalSaturationValue !== null) {
      saturationSlider.value = originalSaturationValue;
      saturationSlider.dispatchEvent(new Event('input'));
    }
    if (originalSharpnessValue !== null) {
      sharpnessSlider.value = originalSharpnessValue;
      sharpnessSlider.dispatchEvent(new Event('input'));
    }
    autoSaturationApplied = false;
    autoSharpnessApplied  = false;
    statusText.textContent = 'Reverted automatical set of settings.';
    return;
  }
  
  // Save current values.
  originalSaturationValue = parseFloat(saturationSlider.value) || 0;
  originalSharpnessValue  = parseFloat(sharpnessSlider.value)  || 0;
  
  // Analyze image on an off-screen canvas.
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCtx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
  
  const { data } = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
  let totalSaturation = 0;
  let totalSharpness  = 0;
  const pixelCount = canvas.width * canvas.height;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const maxVal = Math.max(rn, gn, bn);
    const minVal = Math.min(rn, gn, bn);
    const l = (maxVal + minVal) / 2;
    
    let sHSL = 0;
    if (maxVal !== minVal) {
      sHSL = (maxVal - minVal) / (1 - Math.abs(2 * l - 1));
    }
    let sHSV = maxVal > 0 ? (maxVal - minVal) / maxVal : 0;
    const combinedSaturation = ((sHSL + sHSV) / 2) * maxVal;
    totalSaturation += combinedSaturation * 100;
    
    if (i > 0) {
      const prevR = data[i - 4], prevG = data[i - 3], prevB = data[i - 2];
      totalSharpness += Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
    }
  }
  
  const avgSaturation = totalSaturation / pixelCount;
  const avgSharpness  = totalSharpness  / (pixelCount - 1);
  
  let newSaturation = Math.min(Math.max(originalSaturationValue + avgSaturation, 0), 200);
  let newSharpness  = Math.min(Math.max(originalSharpnessValue + (avgSharpness / 100), 0), 4);
  
  saturationSlider.value = newSaturation;
  sharpnessSlider.value  = newSharpness;
  
  saturationSlider.dispatchEvent(new Event('input'));
  sharpnessSlider.dispatchEvent(new Event('input'));
  
  autoSaturationApplied = true;
  autoSharpnessApplied  = true;
  statusText.textContent = 'Automatically adjusted settings. Click again to revert.';
});
