import { rgb, type PDFDocument, type PDFFont, type PDFPage } from 'pdf-lib'

export const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const PAGE_SIZE: [number, number] = [PAGE_WIDTH, PAGE_HEIGHT]
export const MARGIN = 44
export const BOTTOM_MARGIN = 42
interface GridCell {
  label: string
  value: string
  emphasis?: boolean
  fullWidth?: boolean
}

export interface TableColumn {
  label: string
  width: number
}

export class ReportPdfWriter {
  page: PDFPage
  y = PAGE_HEIGHT - MARGIN
  private readonly document: PDFDocument
  readonly regular: PDFFont
  readonly bold: PDFFont

  constructor(
    document: PDFDocument,
    regular: PDFFont,
    bold: PDFFont,
  ) {
    this.document = document
    this.regular = regular
    this.bold = bold
    this.page = document.addPage(PAGE_SIZE)
  }

  startPage(): PDFPage {
    this.page = this.document.addPage(PAGE_SIZE)
    this.y = PAGE_HEIGHT - MARGIN
    return this.page
  }

  addGridSection(title: string, cells: GridCell[], columns = 2): void {
    const contentWidth = PAGE_WIDTH - MARGIN * 2
    const headerHeight = 20
    const drawHeader = () => {
      this.page.drawRectangle({
        x: MARGIN,
        y: this.y - headerHeight,
        width: contentWidth,
        height: headerHeight,
        color: rgb(0.82, 0.89, 0.95),
        borderColor: rgb(0.55, 0.64, 0.72),
        borderWidth: 0.6,
      })
      this.page.drawText(normalizePdfText(title), {
        x: MARGIN + 8,
        y: this.y - 14,
        size: 9.5,
        font: this.bold,
        color: rgb(0.12, 0.19, 0.26),
      })
    }

    if (this.y - headerHeight < BOTTOM_MARGIN) this.startPage()
    drawHeader()
    this.y -= headerHeight

    let offset = 0
    while (offset < cells.length) {
      const fullWidth = cells[offset]?.fullWidth === true
      const row = fullWidth
        ? [cells[offset]!]
        : cells.slice(offset, offset + columns).filter((cell) => !cell.fullWidth)
      const cellColumnCount = fullWidth ? 1 : columns
      const cellColumnWidth = contentWidth / cellColumnCount
      const layouts = row.map((cell) => {
        const labelLines = wrapText(cell.label, this.bold, 7.5, cellColumnWidth - 14)
        const valueLines = wrapText(cell.value, this.regular, 9, cellColumnWidth - 14)
        return {
          labelLines,
          valueLines,
          height: Math.max(
            39,
            14 + labelLines.length * 9 + valueLines.length * 11,
          ),
        }
      })
      const rowHeight = Math.max(...layouts.map((layout) => layout.height))

      if (this.y - rowHeight < BOTTOM_MARGIN) {
        this.startPage()
        drawHeader()
        this.y -= headerHeight
      }

      for (let index = 0; index < cellColumnCount; index += 1) {
        const cell = row[index]
        const layout = layouts[index]
        const x = MARGIN + index * cellColumnWidth
        this.page.drawRectangle({
          x,
          y: this.y - rowHeight,
          width: cellColumnWidth,
          height: rowHeight,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.72, 0.77, 0.82),
          borderWidth: 0.5,
        })
        if (!cell || !layout) continue

        this.drawTextLines(
          layout.labelLines,
          x + 7,
          this.y - 6,
          7.5,
          9,
          this.bold,
          rgb(0.38, 0.43, 0.48),
        )
        this.drawTextLines(
          layout.valueLines,
          x + 7,
          this.y - 8 - layout.labelLines.length * 9,
          9,
          11,
          cell.emphasis ? this.bold : this.regular,
          rgb(0.13, 0.16, 0.2),
        )
      }

      this.y -= rowHeight
      offset += row.length
    }
    this.y -= 17
  }

  addTable(columns: TableColumn[], rows: string[][], fontSize = 7.5): void {
    const drawHeader = () => {
      const headerLines = columns.map((column) =>
        wrapText(column.label, this.bold, fontSize, column.width - 8),
      )
      const headerHeight = Math.max(
        22,
        ...headerLines.map((lines) => 8 + lines.length * (fontSize + 1)),
      )
      let x = MARGIN
      columns.forEach((column, index) => {
        this.page.drawRectangle({
          x,
          y: this.y - headerHeight,
          width: column.width,
          height: headerHeight,
          color: rgb(0.82, 0.89, 0.95),
          borderColor: rgb(0.55, 0.64, 0.72),
          borderWidth: 0.5,
        })
        this.drawTextLines(
          headerLines[index] ?? [],
          x + 4,
          this.y - 4,
          fontSize,
          fontSize + 1,
          this.bold,
          rgb(0.12, 0.19, 0.26),
        )
        x += column.width
      })
      this.y -= headerHeight
    }

    drawHeader()
    rows.forEach((row, rowIndex) => {
      const cellLines = columns.map((column, index) =>
        wrapText(row[index] ?? '', this.regular, fontSize, column.width - 8),
      )
      const rowHeight = Math.max(
        18,
        ...cellLines.map((lines) => 7 + lines.length * (fontSize + 1.5)),
      )
      if (this.y - rowHeight < BOTTOM_MARGIN) {
        this.startPage()
        drawHeader()
      }

      let x = MARGIN
      columns.forEach((column, index) => {
        this.page.drawRectangle({
          x,
          y: this.y - rowHeight,
          width: column.width,
          height: rowHeight,
          color:
            rowIndex % 2 === 0
              ? rgb(1, 1, 1)
              : rgb(0.96, 0.97, 0.98),
          borderColor: rgb(0.78, 0.81, 0.84),
          borderWidth: 0.4,
        })
        this.drawTextLines(
          cellLines[index] ?? [],
          x + 4,
          this.y - 4,
          fontSize,
          fontSize + 1.5,
          this.regular,
          rgb(0.13, 0.16, 0.2),
        )
        x += column.width
      })
      this.y -= rowHeight
    })
    this.y -= 8
  }

  addText(
    text: string,
    options: {
      font?: PDFFont
      size?: number
      indent?: number
      spacingAfter?: number
      color?: ReturnType<typeof rgb>
    } = {},
  ): void {
    const font = options.font ?? this.regular
    const size = options.size ?? 9.5
    const indent = options.indent ?? 0
    const lineHeight = size + 4
    const lines = wrapText(
      text,
      font,
      size,
      PAGE_WIDTH - MARGIN * 2 - indent,
    )

    for (const line of lines) {
      if (this.y - lineHeight < BOTTOM_MARGIN) this.startPage()
      this.page.drawText(line, {
        x: MARGIN + indent,
        y: this.y - lineHeight,
        size,
        font,
        color: options.color ?? rgb(0.13, 0.16, 0.2),
      })
      this.y -= lineHeight
    }

    this.y -= options.spacingAfter ?? 2
  }

  private drawTextLines(
    lines: string[],
    x: number,
    top: number,
    size: number,
    lineHeight: number,
    font: PDFFont,
    color: ReturnType<typeof rgb>,
  ): void {
    lines.forEach((line, index) => {
      this.page.drawText(line, {
        x,
        y: top - size - index * lineHeight,
        size,
        font,
        color,
      })
    })
  }
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const normalized = normalizePdfText(text)
  if (!normalized) return ['']

  return normalized.split('\n').flatMap((paragraph) => {
    if (!paragraph) return ['']
    const lines: string[] = []
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const chunks = splitLongWord(word, font, size, maxWidth)
      for (const chunk of chunks) {
        const candidate = line ? `${line} ${chunk}` : chunk
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          line = candidate
        } else {
          if (line) lines.push(line)
          line = chunk
        }
      }
    }
    if (line) lines.push(line)
    return lines
  })
}

function splitLongWord(
  word: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word]

  const chunks: string[] = []
  let chunk = ''
  for (const character of word) {
    if (
      chunk &&
      font.widthOfTextAtSize(`${chunk}${character}`, size) > maxWidth
    ) {
      chunks.push(chunk)
      chunk = character
    } else {
      chunk += character
    }
  }
  if (chunk) chunks.push(chunk)
  return chunks
}

function normalizePdfText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/[–—]/g, '-')
    .replaceAll('€', 'EUR')
    .replaceAll('×', 'x')
    .replace(/[^\x20-\x7e\xa0-\xff\n]/g, '?')
}
