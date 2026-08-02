const MAX_RECEIPT_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_RECEIPT_IMAGE_EDGE = 2000;
const JPEG_QUALITY = 0.84;

const SUPPORTED_RECEIPT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像を読み込めませんでした'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('画像を圧縮できませんでした'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

export async function prepareReceiptImage(file: File): Promise<File> {
  if (!SUPPORTED_RECEIPT_MIME_TYPES.has(file.type)) {
    throw new Error('JPEG・PNG・WebP・HEIC・HEIF形式の画像を選択してください');
  }
  if (file.size > MAX_RECEIPT_IMAGE_BYTES) {
    throw new Error('画像は10MB以下で撮影してください');
  }

  try {
    const image = await loadImage(file);
    const scale = Math.min(1, MAX_RECEIPT_IMAGE_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('画像を処理できませんでした');
    }
    context.drawImage(image, 0, 0, width, height);
    const blob = await canvasToBlob(canvas);
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'receipt';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch {
    // iOSでHEICをCanvasに展開できない場合も、Gemini自体はHEIC/HEIFを解析できる。
    return file;
  }
}

export function getReceiptFileExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default:
      return 'jpg';
  }
}

