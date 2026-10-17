import { PDFDocument, PDFPage, StandardFonts } from 'pdf-lib'
import { describe, expect, it, vi } from 'vitest'
import { ReportPdfWriter } from './reportPdfWriter'

async function createWriter() {
  const document = await PDFDocument.create()
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  return { document, writer: new ReportPdfWriter(document, regular, bold) }
}

describe('ReportPdfWriter', () => {
  it('wraps long words and preserves normalized text over multiple pages', async () => {
    const { document, writer } = await createWriter()
    const drawText = vi.spyOn(PDFPage.prototype, 'drawText')
    try {
      writer.addText('Kosten € × – 😀')
      writer.addText('VeryLongUnbrokenWord'.repeat(400))
      expect(document.getPageCount()).toBeGreaterThan(1)
      expect(drawText.mock.calls[0]?.[0]).toBe('Kosten EUR x - ??')
      const longLines = drawText.mock.calls.slice(1)
      expect(longLines.length).toBeGreaterThan(50)
      expect(longLines.every(([text]) => writer.regular.widthOfTextAtSize(text, 9.5) <= 507.28)).toBe(true)
      const result = await PDFDocument.load(await document.save())
      expect(result.getPageCount()).toBe(document.getPageCount())
    } finally {
      drawText.mockRestore()
    }
  })

  it('repeats table headers on page breaks without changing row order', async () => {
    const { document, writer } = await createWriter()
    const drawText = vi.spyOn(PDFPage.prototype, 'drawText')
    try {
      const rows = Array.from({ length: 100 }, (_, index) => [`row-${index}`])
      writer.addTable([{ label: 'Reference', width: 507 }], rows)
      const text = drawText.mock.calls.map(([value]) => value)
      expect(document.getPageCount()).toBeGreaterThan(1)
      expect(text.filter((value) => value === 'Reference')).toHaveLength(document.getPageCount())
      expect(text.filter((value) => value.startsWith('row-'))).toEqual(rows.flat())
    } finally {
      drawText.mockRestore()
    }
  })

  it('keeps grid sections paginated and repeats their headings', async () => {
    const { document, writer } = await createWriter()
    const drawText = vi.spyOn(PDFPage.prototype, 'drawText')
    try {
      writer.addGridSection('Grid heading', Array.from({ length: 60 }, (_, index) => ({
        label: `Label ${index}`,
        value: `Value ${index}`,
        fullWidth: true,
      })))
      const text = drawText.mock.calls.map(([value]) => value)
      expect(document.getPageCount()).toBeGreaterThan(1)
      expect(text.filter((value) => value === 'Grid heading')).toHaveLength(document.getPageCount())
      expect(text.filter((value) => value.startsWith('Value '))).toHaveLength(60)
    } finally {
      drawText.mockRestore()
    }
  })
})
