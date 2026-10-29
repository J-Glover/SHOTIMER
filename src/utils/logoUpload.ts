import { MAX_LOGO_DATA_LENGTH, safeLogoSource } from './stagePresentation';

export async function prepareStageLogo(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw Error('Choose a PNG, JPG or WebP image. PNG and WebP support transparent backgrounds.');
  if (file.size > 2 * 1024 * 1024) throw Error('Choose a logo smaller than 2 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch { throw Error('This image could not be opened. Try exporting it as PNG or JPG.'); }
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 16000000) throw Error('Choose an image up to 16 megapixels.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw Error('Your browser could not prepare the logo. Try another browser.');
    let scale = Math.min(1, 640 / image.naturalWidth, 240 / image.naturalHeight);
    for (let attempt = 0; attempt < 5; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = canvas.toDataURL('image/png');
      if (png.length <= MAX_LOGO_DATA_LENGTH && safeLogoSource(png)) return png;
      const webp = canvas.toDataURL('image/webp', 0.85);
      if (safeLogoSource(webp)) return webp;
      scale *= 0.75;
    }
    throw Error('This logo is too detailed for live sync. Try a simpler image.');
  } finally { URL.revokeObjectURL(url); }
}
