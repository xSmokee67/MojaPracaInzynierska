// Zmniejszanie zdjęcia w przeglądarce przed wysłaniem do API.
// Dłuższy bok jest ograniczany do MAX_DIMENSION, a obraz zapisywany ponownie przez <canvas> - taki zapis nie zawiera
// metadanych EXIF (np. lokalizacji GPS z telefonu). Orientacja z aparatu jest uwzględniana przy odczycie.
// PNG zostaje PNG (przezroczystość), pozostałe formaty są zapisywane jako JPEG.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export async function resizeImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file; // przeglądarka nie odczytała obrazu - plik oceni API (i odrzuci, jeśli to nie jest obraz)
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const isPng = file.type === 'image/png';
  const type = isPng ? 'image/png' : 'image/jpeg';
  const blob = await new Promise(resolve => canvas.toBlob(resolve, type, JPEG_QUALITY));
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.${isPng ? 'png' : 'jpg'}`, { type });
}
