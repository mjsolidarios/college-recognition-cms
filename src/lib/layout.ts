import type {
  AcademicEntry,
  CmsPage,
  CmsSettings,
  CoreSection,
  NonAcademicEntry,
  ProgramRow,
  RenderTextBlock,
  RenderedPage,
} from '@/types/cms'
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/types/cms'

const TITLE_GAP = 28
const SECTION_GAP = 18
const PARAGRAPH_GAP = 10
const ITEM_GAP = 3
const FONT_FAMILY = 'Georgia, "Times New Roman", serif'

type LayoutContext = {
  renderedPages: RenderedPage[]
  logicalPage: CmsPage
  settings: CmsSettings
  columnWidth: number
  maxContentY: number
  currentPageIndex: number
  currentColumn: 0 | 1
  currentY: [number, number]
}

type TextOptions = {
  idPrefix: string
  text: string
  fontSize: number
  width?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  align?: 'left' | 'center' | 'right'
  uppercase?: boolean
  fullWidth?: boolean
  allowSplit?: boolean
  spacingAfter?: number
  letterSpacing?: number
}

let measuringCanvas: HTMLCanvasElement | null = null

function getScale(settings: CmsSettings) {
  return settings.globalScale
}

function getColumnWidth(settings: CmsSettings) {
  return (PAGE_WIDTH - settings.pagePaddingX * 2 - settings.columnGap) / 2
}

function getColumnX(settings: CmsSettings, column: 0 | 1) {
  const columnWidth = getColumnWidth(settings)
  return settings.pagePaddingX + column * (columnWidth + settings.columnGap)
}

function getPageTitleBlocks(page: CmsPage, settings: CmsSettings, pageNumber: number): RenderTextBlock[] {
  const scale = getScale(settings)
  const titleWidth = PAGE_WIDTH - settings.pagePaddingX * 2
  const titleFontSize = (page.type === 'program' ? settings.titleSize * 1.95 : settings.titleSize) * scale
  const titleLineHeight = (page.type === 'program' ? settings.titleSize * 2.2 : settings.titleSize * 1.2) * scale

  // Wrap each heading line so the layout engine uses the true rendered line count,
  // preventing subsequent content blocks from overlapping the title.
  const wrappedTitleLines = page.content.heading
    .split('\n')
    .flatMap((line) => wrapParagraph(line || ' ', titleWidth, titleFontSize, 'bold'))

  const blocks: RenderTextBlock[] = [
    {
      id: `${page.id}-title-${pageNumber}`,
      x: settings.pagePaddingX,
      y: settings.pagePaddingTop,
      width: titleWidth,
      lines: wrappedTitleLines,
      fontSize: titleFontSize,
      lineHeight: titleLineHeight,
      fontWeight: 'bold',
      fontStyle: 'normal',
      align: 'center',
      uppercase: page.type !== 'core',
      letterSpacing: page.type === 'program' ? 1.8 : 0.6,
    },
  ]

  if (page.type === 'core' && page.content.subheading) {
    blocks.push({
      id: `${page.id}-subtitle-${pageNumber}`,
      x: settings.pagePaddingX,
      y:
        settings.pagePaddingTop +
        blocks[0].lines.length * titleLineHeight +
        Math.round(8 * scale),
      width: titleWidth,
      lines: [page.content.subheading],
      fontSize: settings.subtitleSize * scale,
      lineHeight: settings.subtitleSize * 1.25 * scale,
      fontWeight: 'normal',
      fontStyle: 'normal',
      align: 'center',
    })
  }

  return blocks
}

function createMeasureContext(fontSize: number, fontWeight: 'normal' | 'bold') {
  if (typeof document === 'undefined') {
    return null
  }

  measuringCanvas ??= document.createElement('canvas')
  const context = measuringCanvas.getContext('2d')

  if (!context) {
    return null
  }

  context.font = `${fontWeight} ${fontSize}px ${FONT_FAMILY}`
  return context
}

function measureWidth(text: string, fontSize: number, fontWeight: 'normal' | 'bold') {
  const context = createMeasureContext(fontSize, fontWeight)

  if (!context) {
    return text.length * fontSize * 0.52
  }

  return context.measureText(text).width
}

function wrapParagraph(
  paragraph: string,
  width: number,
  fontSize: number,
  fontWeight: 'normal' | 'bold',
) {
  if (!paragraph.trim()) {
    return ['']
  }

  const words = paragraph.trim().split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (measureWidth(candidate, fontSize, fontWeight) <= width || !currentLine) {
      currentLine = candidate
      continue
    }

    lines.push(currentLine)
    currentLine = word
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

function wrapText(
  text: string,
  width: number,
  fontSize: number,
  fontWeight: 'normal' | 'bold',
) {
  const paragraphs = text.split('\n')
  const lines: string[] = []

  paragraphs.forEach((paragraph, index) => {
    lines.push(...wrapParagraph(paragraph, width, fontSize, fontWeight))
    if (index < paragraphs.length - 1) {
      lines.push('')
    }
  })

  while (lines.at(-1) === '') {
    lines.pop()
  }

  return lines
}

function createRenderedPage(page: CmsPage, settings: CmsSettings, pageNumber: number): RenderedPage {
  return {
    id: `${page.id}-${pageNumber}`,
    sourcePageId: page.id,
    sourcePageType: page.type,
    pageNumber,
    blocks: getPageTitleBlocks(page, settings, pageNumber),
  }
}

function getContentTop(page: CmsPage, settings: CmsSettings) {
  const titleBlocks = getPageTitleBlocks(page, settings, 1)
  const lastBlock = titleBlocks.at(-1)
  if (!lastBlock) {
    return settings.pagePaddingTop
  }

  return lastBlock.y + lastBlock.lines.length * lastBlock.lineHeight + TITLE_GAP * getScale(settings)
}

function createLayoutContext(page: CmsPage, settings: CmsSettings, pageNumber: number): LayoutContext {
  const contentTop = getContentTop(page, settings)
  const firstPage = createRenderedPage(page, settings, pageNumber)
  return {
    renderedPages: [firstPage],
    logicalPage: page,
    settings,
    columnWidth: getColumnWidth(settings),
    maxContentY: PAGE_HEIGHT - settings.pagePaddingBottom,
    currentPageIndex: 0,
    currentColumn: 0,
    currentY: [contentTop, contentTop],
  }
}

function advanceFlow(context: LayoutContext) {
  if (context.currentColumn === 0) {
    context.currentColumn = 1
    return
  }

  const nextPageNumber = context.renderedPages.at(-1)!.pageNumber + 1
  context.renderedPages.push(createRenderedPage(context.logicalPage, context.settings, nextPageNumber))
  context.currentPageIndex += 1
  context.currentColumn = 0
  const contentTop = getContentTop(context.logicalPage, context.settings)
  context.currentY = [contentTop, contentTop]
}

function addLinesToFlow(context: LayoutContext, options: TextOptions) {
  const fontWeight = options.fontWeight ?? 'normal'
  const fontStyle = options.fontStyle ?? 'normal'
  const align = options.align ?? 'left'
  const scale = getScale(context.settings)
  const fontSize = options.fontSize * scale
  const width = options.fullWidth
    ? PAGE_WIDTH - context.settings.pagePaddingX * 2
    : (options.width ?? context.columnWidth)
  const lines = wrapText(options.text, width, fontSize, fontWeight)
  const lineHeight = fontSize * context.settings.lineHeight
  const blockSpacing = (options.spacingAfter ?? PARAGRAPH_GAP) * scale
  const x = options.fullWidth
    ? context.settings.pagePaddingX
    : getColumnX(context.settings, context.currentColumn)

  if (!lines.length) {
    return
  }

  if (options.allowSplit === false) {
    const height = lines.length * lineHeight
    if (context.currentY[context.currentColumn] + height > context.maxContentY) {
      advanceFlow(context)
    }

    context.renderedPages[context.currentPageIndex].blocks.push({
      id: `${options.idPrefix}-${context.currentPageIndex}-${context.currentColumn}`,
      x,
      y: context.currentY[context.currentColumn],
      width,
      lines,
      fontSize,
      lineHeight,
      fontWeight,
      fontStyle,
      align,
      uppercase: options.uppercase,
      letterSpacing: options.letterSpacing,
    })
    context.currentY[context.currentColumn] += height + blockSpacing
    return
  }

  let remainingLines = [...lines]
  let blockIndex = 0

  while (remainingLines.length > 0) {
    const availableHeight = context.maxContentY - context.currentY[context.currentColumn]
    const availableLines = Math.floor(availableHeight / lineHeight)

    if (availableLines <= 0) {
      advanceFlow(context)
      continue
    }

    const visibleLines = remainingLines.slice(0, availableLines)

    context.renderedPages[context.currentPageIndex].blocks.push({
      id: `${options.idPrefix}-${context.currentPageIndex}-${context.currentColumn}-${blockIndex}`,
      x,
      y: context.currentY[context.currentColumn],
      width,
      lines: visibleLines,
      fontSize,
      lineHeight,
      fontWeight,
      fontStyle,
      align,
      uppercase: options.uppercase,
      letterSpacing: options.letterSpacing,
    })

    context.currentY[context.currentColumn] += visibleLines.length * lineHeight + blockSpacing
    remainingLines = remainingLines.slice(visibleLines.length)
    blockIndex += 1

    if (remainingLines.length > 0) {
      advanceFlow(context)
    }
  }
}

function addSectionHeading(context: LayoutContext, text: string, index: number) {
  addLinesToFlow(context, {
    idPrefix: `section-heading-${index}`,
    text,
    fontSize: context.settings.headingSize,
    fontWeight: 'bold',
    spacingAfter: ITEM_GAP,
    allowSplit: false,
  })
}

function renderCoreSection(context: LayoutContext, section: CoreSection, index: number) {
  addSectionHeading(context, section.title, index)
  addLinesToFlow(context, {
    idPrefix: `section-body-${index}`,
    text: section.body,
    fontSize: context.settings.bodySize,
    spacingAfter: SECTION_GAP,
  })
}

function groupAcademicEntries(entries: AcademicEntry[]) {
  const grouped = new Map<string, Map<string, Map<string, string[]>>>()

  for (const entry of entries) {
    if (!grouped.has(entry.gradeLevel)) {
      grouped.set(entry.gradeLevel, new Map())
    }
    const categories = grouped.get(entry.gradeLevel)!
    if (!categories.has(entry.category)) {
      categories.set(entry.category, new Map())
    }
    const awards = categories.get(entry.category)!
    if (!awards.has(entry.award)) {
      awards.set(entry.award, [])
    }
    awards.get(entry.award)!.push(entry.name)
  }

  return grouped
}

function renderAcademicPage(context: LayoutContext, entries: AcademicEntry[]) {
  let gradeIndex = 0
  for (const [gradeLevel, categories] of groupAcademicEntries(entries).entries()) {
    addLinesToFlow(context, {
      idPrefix: `academic-grade-${gradeIndex}`,
      text: gradeLevel,
      fontSize: context.settings.subtitleSize,
      fontWeight: 'bold',
      spacingAfter: 8,
      allowSplit: false,
    })

    let categoryIndex = 0
    for (const [category, awards] of categories.entries()) {
      addLinesToFlow(context, {
        idPrefix: `academic-category-${gradeIndex}-${categoryIndex}`,
        text: category,
        fontSize: context.settings.headingSize,
        fontWeight: 'bold',
        spacingAfter: 8,
        allowSplit: false,
      })

      let awardIndex = 0
      for (const [award, names] of awards.entries()) {
        addLinesToFlow(context, {
          idPrefix: `academic-award-${gradeIndex}-${categoryIndex}-${awardIndex}`,
          text: award,
          fontSize: context.settings.bodySize,
          fontWeight: 'bold',
          spacingAfter: ITEM_GAP,
          allowSplit: false,
        })
        addLinesToFlow(context, {
          idPrefix: `academic-names-${gradeIndex}-${categoryIndex}-${awardIndex}`,
          text: names.map((name) => `    ${name}`).join('\n'),
          fontSize: context.settings.bodySize,
          spacingAfter: 10,
        })
        awardIndex += 1
      }

      categoryIndex += 1
    }

    gradeIndex += 1
  }
}

function groupNonAcademicEntries(entries: NonAcademicEntry[]) {
  const grouped = new Map<string, NonAcademicEntry[]>()
  for (const entry of entries) {
    if (!grouped.has(entry.category)) {
      grouped.set(entry.category, [])
    }
    grouped.get(entry.category)!.push(entry)
  }
  return grouped
}

function renderNonAcademicPage(context: LayoutContext, entries: NonAcademicEntry[]) {
  let categoryIndex = 0
  for (const [category, groupedEntries] of groupNonAcademicEntries(entries).entries()) {
    addLinesToFlow(context, {
      idPrefix: `nonacademic-category-${categoryIndex}`,
      text: category,
      fontSize: context.settings.headingSize,
      fontWeight: 'bold',
      spacingAfter: 10,
      allowSplit: false,
    })

    groupedEntries.forEach((entry, entryIndex) => {
      addLinesToFlow(context, {
        idPrefix: `nonacademic-name-${categoryIndex}-${entryIndex}`,
        text: entry.name,
        fontSize: context.settings.bodySize,
        fontWeight: 'bold',
        spacingAfter: ITEM_GAP,
        allowSplit: false,
      })
      addLinesToFlow(context, {
        idPrefix: `nonacademic-award-${categoryIndex}-${entryIndex}`,
        text: entry.award,
        fontSize: context.settings.bodySize,
        spacingAfter: 12,
      })
    })

    categoryIndex += 1
  }
}

function renderProgramPage(context: LayoutContext, rows: ProgramRow[]) {
  rows.forEach((row, index) => {
    addLinesToFlow(context, {
      idPrefix: `program-left-title-${index}`,
      text: row.leftTitle,
      fontSize: context.settings.bodySize,
      fontWeight: 'bold',
      spacingAfter: ITEM_GAP,
      allowSplit: false,
    })
    addLinesToFlow(context, {
      idPrefix: `program-left-body-${index}`,
      text: row.leftBody,
      fontSize: context.settings.bodySize,
      spacingAfter: 14,
    })
    addLinesToFlow(context, {
      idPrefix: `program-right-title-${index}`,
      text: row.rightTitle ?? '',
      fontSize: context.settings.bodySize,
      fontWeight: 'bold',
      spacingAfter: ITEM_GAP,
      allowSplit: false,
    })
    addLinesToFlow(context, {
      idPrefix: `program-right-body-${index}`,
      text: row.rightBody ?? '',
      fontSize: context.settings.bodySize,
      spacingAfter: 18,
    })
  })
}

function appendPageNumbers(renderedPages: RenderedPage[], settings: CmsSettings) {
  if (!settings.showPageNumbers) {
    return renderedPages
  }

  const scale = getScale(settings)
  return renderedPages.map((page, index): RenderedPage => {
    const pageNumberBlock: RenderTextBlock = {
      id: `${page.id}-page-number`,
      x: settings.pagePaddingX,
      y: PAGE_HEIGHT - settings.pagePaddingBottom + 6 * scale,
      width: PAGE_WIDTH - settings.pagePaddingX * 2,
      lines: [String(index + 1)],
      fontSize: settings.pageNumberSize * scale,
      lineHeight: settings.pageNumberSize * 1.1 * scale,
      fontWeight: 'normal',
      fontStyle: 'normal',
      align: 'center',
    }

    return {
      ...page,
      pageNumber: index + 1,
      blocks: [...page.blocks, pageNumberBlock],
    }
  })
}

export function renderDocument(pages: CmsPage[], settings: CmsSettings) {
  const renderedPages: RenderedPage[] = []
  let pageNumber = 1

  for (const page of [...pages].sort((left, right) => left.order - right.order)) {
    const context = createLayoutContext(page, settings, pageNumber)

    switch (page.type) {
      case 'core':
        page.content.sections.forEach((section, index) => renderCoreSection(context, section, index))
        break
      case 'program':
        renderProgramPage(context, page.content.rows)
        break
      case 'academic':
        renderAcademicPage(context, page.content.entries)
        break
      case 'non-academic':
        renderNonAcademicPage(context, page.content.entries)
        break
    }

    renderedPages.push(...context.renderedPages)
    pageNumber = renderedPages.length + 1
  }

  return appendPageNumbers(renderedPages, settings)
}
