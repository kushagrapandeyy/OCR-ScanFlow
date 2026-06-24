/**
 * Client-Side Frame Analysis
 * High-performance computer vision heuristics to guarantee OCR image quality.
 */

export function analyzeFrame(imageData, prevGrays) {
  const { width, height, data } = imageData;
  const n = width * height;
  
  // Buffers
  const grays = new Uint8ClampedArray(n);
  const edges = new Uint8Array(n);
  
  let brightnessSum = 0;
  let skinPixelCount = 0;

  // 1. Grayscale, Brightness, and Skin-tone detection
  for (let i = 0; i < n; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    
    // Luminance-weighted Grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    grays[i] = gray;
    brightnessSum += gray;

    // Simple Skin-tone heuristic: R > G > B, R > 95, G > 40, B > 20, max-min > 15, abs(R-G) > 15
    if (r > 95 && g > 40 && b > 20 && Math.max(r, g, b) - Math.min(r, g, b) > 15 && Math.abs(r - g) > 15 && r > g && r > b) {
      skinPixelCount++;
    }
  }

  const avgBrightness = brightnessSum / n;
  if (avgBrightness < 50 || avgBrightness > 220) {
    return { ok: false, reason: avgBrightness < 50 ? 'dark' : 'bright', grays };
  }

  // Reject if more than 15% of the frame is skin (hand/face obstructing)
  if (skinPixelCount / n > 0.15) {
    return { ok: false, reason: 'obstructed', grays };
  }

  // 2. Edge Detection (Sobel magnitude) & Bounding Box
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let edgeCount = 0;
  let laplacianVariance = 0;
  let laplacianSum = 0;
  let laplacianSqSum = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // Sobel edges
      const gx = -grays[idx - width - 1] + grays[idx - width + 1]
                 -2 * grays[idx - 1] + 2 * grays[idx + 1]
                 -grays[idx + width - 1] + grays[idx + width + 1];
      
      const gy = -grays[idx - width - 1] - 2 * grays[idx - width] - grays[idx - width + 1]
                 +grays[idx + width - 1] + 2 * grays[idx + width] + grays[idx + width + 1];
                 
      const mag = Math.sqrt(gx * gx + gy * gy);
      
      if (mag > 80) { // Edge threshold
        edges[idx] = 255;
        edgeCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

      // Laplacian for focus/sharpness
      const lap = 4 * grays[idx] - grays[idx - 1] - grays[idx + 1] - grays[idx - width] - grays[idx + width];
      laplacianSum += lap;
      laplacianSqSum += lap * lap;
    }
  }

  // 3. Focus Check
  const validPixels = (width - 2) * (height - 2);
  const lapMean = laplacianSum / validPixels;
  laplacianVariance = (laplacianSqSum / validPixels) - (lapMean * lapMean);

  if (laplacianVariance < 250) {
    return { ok: false, reason: 'blurry', grays };
  }

  if (edgeCount < (n * 0.02)) {
    return { ok: false, reason: 'no_card', grays };
  }

  // 4. Rectangle Validation
  const rectW = maxX - minX;
  const rectH = maxY - minY;
  
  if (rectW < width * 0.4 || rectH < height * 0.4) {
    return { ok: false, reason: 'no_card', grays };
  }

  const aspect = rectW / rectH;
  // Card aspect ratio is usually around 1.5 - 1.8. Allow 1.3 to 2.3.
  if (aspect < 1.3 || aspect > 2.3) {
    return { ok: false, reason: 'no_card', grays };
  }

  // Quadrant distribution (ensure edges aren't just clumped in one corner)
  const cx = minX + rectW / 2;
  const cy = minY + rectH / 2;
  let q1 = 0, q2 = 0, q3 = 0, q4 = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (edges[y * width + x]) {
        if (x < cx && y < cy) q1++;
        else if (x >= cx && y < cy) q2++;
        else if (x < cx && y >= cy) q3++;
        else q4++;
      }
    }
  }
  
  const minQ = Math.min(q1, q2, q3, q4);
  if (minQ / edgeCount < 0.05) {
    return { ok: false, reason: 'no_card', grays }; // Must have edges in all quadrants
  }

  // 5. Stability Check
  let avgDiff = 0;
  if (prevGrays && prevGrays.length === n) {
    let diffSum = 0;
    for (let i = 0; i < n; i++) {
      diffSum += Math.abs(grays[i] - prevGrays[i]);
    }
    avgDiff = diffSum / n;
    if (avgDiff > 3.0) {
      return { ok: false, reason: 'unstable', grays };
    }
  }

  return { ok: true, reason: 'detected', grays, box: { minX, minY, maxX, maxY } };
}
