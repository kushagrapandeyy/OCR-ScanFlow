/**
 * Client-Side High-Res Image Extraction
 * Grabs the raw video frame at native dimensions and tightly crops it.
 */

export function extractHighResCrop(videoElement, guideBox, downsampledScale) {
  const nativeWidth = videoElement.videoWidth;
  const nativeHeight = videoElement.videoHeight;
  
  if (!nativeWidth || !nativeHeight) return null;

  // Scale the downsampled box to native dimensions
  const scale = downsampledScale || (nativeWidth / 320); // assuming 320px width analysis

  // Determine crop box based on guide box (with 1.5% padding)
  const paddingX = (guideBox.maxX - guideBox.minX) * 0.015;
  const paddingY = (guideBox.maxY - guideBox.minY) * 0.015;

  let x = Math.floor((guideBox.minX - paddingX) * scale);
  let y = Math.floor((guideBox.minY - paddingY) * scale);
  let w = Math.ceil((guideBox.maxX - guideBox.minX + 2 * paddingX) * scale);
  let h = Math.ceil((guideBox.maxY - guideBox.minY + 2 * paddingY) * scale);

  // Bounds check
  x = Math.max(0, x);
  y = Math.max(0, y);
  if (x + w > nativeWidth) w = nativeWidth - x;
  if (y + h > nativeHeight) h = nativeHeight - y;

  // Scale down if too large (max 1600px width)
  const MAX_W = 1600;
  let drawW = w;
  let drawH = h;
  if (drawW > MAX_W) {
    drawH = Math.floor(drawH * (MAX_W / drawW));
    drawW = MAX_W;
  }

  const canvas = document.createElement('canvas');
  canvas.width = drawW;
  canvas.height = drawH;
  
  const ctx = canvas.getContext('2d');
  
  // Draw just the cropped region at high res
  ctx.drawImage(videoElement, x, y, w, h, 0, 0, drawW, drawH);

  // Return base64 JPEG at 0.95 quality for OCR
  return canvas.toDataURL('image/jpeg', 0.95);
}
