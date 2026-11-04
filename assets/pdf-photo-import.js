export function pdfPhotoImportSize(width, height, signature = false) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || !Number.isSafeInteger(width * height)) return null;
  const scale = signature ? 1 : Math.min(1, 2000 / Math.max(width, height));
  return {width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale))};
}

export async function pdfImageToBlob(image, signature = false) {
  const size = pdfPhotoImportSize(image.width, image.height, signature);
  if (!size) throw new Error('사진의 가로·세로 정보를 읽지 못했습니다.');
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('PDF 사진을 처리할 수 없습니다.');
  try {
    if (image.bitmap) context.drawImage(image.bitmap, 0, 0, canvas.width, canvas.height);
    else if (image.data && (image.kind === 2 || image.kind === 3)) {
      // Sample directly into the small destination: no full-resolution RGBA
      // canvas/copy, even for very large photos decoded by PDF.js.
      const pixels = context.createImageData(canvas.width, canvas.height);
      const channels = image.kind === 3 ? 4 : 3;
      const scaleX = image.width / canvas.width, scaleY = image.height / canvas.height;
      for (let y = 0; y < canvas.height; y++) {
        const sy = Math.max(0, (y + .5) * scaleY - .5), y0 = Math.floor(sy), y1 = Math.min(image.height - 1, y0 + 1), wy = sy - y0;
        for (let x = 0; x < canvas.width; x++) {
          const sx = Math.max(0, (x + .5) * scaleX - .5), x0 = Math.floor(sx), x1 = Math.min(image.width - 1, x0 + 1), wx = sx - x0;
          const a = (y0 * image.width + x0) * channels, b = (y0 * image.width + x1) * channels;
          const c = (y1 * image.width + x0) * channels, d = (y1 * image.width + x1) * channels, out = (y * canvas.width + x) * 4;
          for (let channel = 0; channel < channels; channel++) pixels.data[out + channel] =
            (image.data[a + channel] * (1 - wx) + image.data[b + channel] * wx) * (1 - wy) +
            (image.data[c + channel] * (1 - wx) + image.data[d + channel] * wx) * wy;
          if (channels === 3) pixels.data[out + 3] = 255;
        }
      }
      context.putImageData(pixels, 0, 0);
    } else return null;
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  } finally {
    canvas.width = canvas.height = 0;
  }
}
