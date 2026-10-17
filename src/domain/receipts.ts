import type { ReceiptAttachment, ReceiptMediaType } from './report'

export const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024

export type ReceiptValidationResult =
  | { valid: true; attachment: ReceiptAttachment }
  | { valid: false; error: string }

const supportedExtensions: Record<string, ReceiptMediaType> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export async function validateReceiptFile(
  file: File,
): Promise<ReceiptValidationResult> {
  if (file.size > MAX_RECEIPT_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Der Beleg darf höchstens 10 MiB groß sein.',
    }
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const expectedMediaType = supportedExtensions[extension]
  if (!expectedMediaType) {
    return {
      valid: false,
      error: 'Nur PDF-, JPG-, JPEG- und PNG-Belege werden unterstützt.',
    }
  }

  if (file.size === 0) {
    return { valid: false, error: 'Die ausgewählte Datei ist leer.' }
  }

  if (file.type && file.type !== expectedMediaType) {
    return {
      valid: false,
      error: 'Dateiendung und Dateityp des Belegs stimmen nicht überein.',
    }
  }

  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const detectedMediaType = detectReceiptMediaType(bytes)
  if (detectedMediaType !== expectedMediaType) {
    return {
      valid: false,
      error: 'Der Dateiinhalt entspricht keinem unterstützten Belegformat.',
    }
  }

  return {
    valid: true,
    attachment: { file, mediaType: detectedMediaType },
  }
}

function detectReceiptMediaType(bytes: Uint8Array): ReceiptMediaType | null {
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return 'application/pdf'
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }

  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (pngSignature.every((byte, index) => bytes[index] === byte)) {
    return 'image/png'
  }

  return null
}
