// Keep the existing white-paper conversion. Photographed grey paper needs a
// local paper estimate so that shadows do not remain as a translucent rectangle.
export function clearSignatureBackground(data, width, height) {
  const brightness = index => .299 * data[index] + .587 * data[index + 1] + .114 * data[index + 2];
  const border = [];
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 80))) {
    for (const x of [0, width - 1]) { const at = (y * width + x) * 4; if (data[at + 3] > 240) border.push(brightness(at)); }
  }
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 80))) {
    for (const y of [0, height - 1]) { const at = (y * width + x) * 4; if (data[at + 3] > 240) border.push(brightness(at)); }
  }
  border.sort((a, b) => a - b);
  const greyPaper = border.length > 10 && border[Math.floor(border.length * .75)] < 235;
  let paper, columns, rows, tile;
  if (greyPaper) {
    tile = Math.max(32, Math.min(128, Math.round(height / 6)));
    columns = Math.ceil(width / tile); rows = Math.ceil(height / tile);
    paper = new Float32Array(columns * rows);
    for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < columns; tx++) {
      const samples = [];
      for (let y = ty * tile; y < Math.min(height, (ty + 1) * tile); y += 3) for (let x = tx * tile; x < Math.min(width, (tx + 1) * tile); x += 3) {
        const at = (y * width + x) * 4;
        if (data[at + 3] > 240) samples.push(brightness(at));
      }
      samples.sort((a, b) => a - b);
      paper[ty * columns + tx] = samples[Math.floor(samples.length * .9)] || 245;
    }
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = (y * width + x) * 4, light = brightness(at);
    const threshold = greyPaper ? Math.max(1, paper[Math.floor(y / tile) * columns + Math.floor(x / tile)] - 18) : 245;
    const alpha = light >= threshold ? 0 : Math.round(255 * Math.max(0, (threshold - light) / threshold));
    data[at] = data[at + 1] = data[at + 2] = 0;
    data[at + 3] = Math.min(data[at + 3], alpha);
  }
  return data;
}
