export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  canvas.width = image.width;
  canvas.height = image.height;

  // Draw original image
  ctx.drawImage(image, 0, 0);

  // Extract the cropped area and optimize for web
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    return null;
  }

  // Max dimension for profile pictures
  const MAX_SIZE = 512;
  let finalWidth = pixelCrop.width;
  let finalHeight = pixelCrop.height;

  // Scale down if crop is larger than MAX_SIZE
  if (finalWidth > MAX_SIZE || finalHeight > MAX_SIZE) {
    const ratio = Math.min(MAX_SIZE / finalWidth, MAX_SIZE / finalHeight);
    finalWidth = Math.round(finalWidth * ratio);
    finalHeight = Math.round(finalHeight * ratio);
  }

  croppedCanvas.width = finalWidth;
  croppedCanvas.height = finalHeight;

  // Draw the cropped portion scaled down onto the new canvas
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    finalWidth,
    finalHeight
  );

  return new Promise((resolve) => {
    // Convert to highly optimized JPEG with 80% quality
    croppedCanvas.toBlob((file) => {
      resolve(file);
    }, 'image/jpeg', 0.8);
  });
}
