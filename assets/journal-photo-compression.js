// Only evidence photos use this helper. Source documents and signatures stay untouched.
export async function compressJournalPhoto(blob, { maxSide = 1600, targetBytes = 300 * 1024, quality = .84 } = {}) {
  const image = await createImageBitmap(blob);
  try {
    if (Math.max(image.width, image.height) <= maxSide && blob.size <= targetBytes) return blob;
    let scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    let width = Math.max(1, Math.round(image.width * scale)), height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas'), context = canvas.getContext('2d');
    if (!context) throw new Error('사진 압축을 위한 화면을 만들지 못했습니다.');
    const encode = async () => {
      canvas.width = width; canvas.height = height;
      context.fillStyle = '#fff'; context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      return new Promise((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('사진을 압축하지 못했습니다.')), 'image/jpeg', quality));
    };
    let result = await encode();
    for (let attempt = 0; result.size > targetBytes && attempt < 3; attempt++) {
      if (quality > .74) quality = .74;
      else { scale = Math.min(.85, Math.sqrt(targetBytes / result.size)); width = Math.max(1, Math.round(width * scale)); height = Math.max(1, Math.round(height * scale)); }
      result = await encode();
    }
    return result.size < blob.size ? result : blob;
  } finally { image.close(); }
}
