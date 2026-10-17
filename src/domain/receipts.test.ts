import { describe, expect, it } from 'vitest'
import {
  MAX_RECEIPT_SIZE_BYTES,
  validateReceiptFile,
} from './receipts'

describe('validateReceiptFile', () => {
  it('accepts supported file signatures and types', async () => {
    const pdf = new File(['%PDF-1.7'], 'receipt.pdf', {
      type: 'application/pdf',
    })
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ])
    const png = new File([pngBytes.buffer], 'receipt.png', {
      type: 'image/png',
    })

    await expect(validateReceiptFile(pdf)).resolves.toMatchObject({
      valid: true,
      attachment: { mediaType: 'application/pdf' },
    })
    await expect(validateReceiptFile(png)).resolves.toMatchObject({
      valid: true,
      attachment: { mediaType: 'image/png' },
    })
  })

  it('rejects unsupported types, mismatched MIME types, and oversized files', async () => {
    const unsupported = new File(['text'], 'receipt.txt', { type: 'text/plain' })
    const mismatched = new File(['%PDF-1.7'], 'receipt.pdf', {
      type: 'image/png',
    })
    const oversized = new File(
      [new ArrayBuffer(MAX_RECEIPT_SIZE_BYTES + 1)],
      'receipt.pdf',
      { type: 'application/pdf' },
    )

    await expect(validateReceiptFile(unsupported)).resolves.toMatchObject({
      valid: false,
      error: expect.stringContaining('Nur PDF'),
    })
    await expect(validateReceiptFile(mismatched)).resolves.toMatchObject({
      valid: false,
      error: expect.stringContaining('Dateiendung'),
    })
    await expect(validateReceiptFile(oversized)).resolves.toMatchObject({
      valid: false,
      error: expect.stringContaining('10 MiB'),
    })
  })

  it('rejects content that does not match its supported extension', async () => {
    const invalidPdf = new File(['not a PDF'], 'receipt.pdf', {
      type: 'application/pdf',
    })

    await expect(validateReceiptFile(invalidPdf)).resolves.toMatchObject({
      valid: false,
      error: expect.stringContaining('Dateiinhalt'),
    })
  })
})
