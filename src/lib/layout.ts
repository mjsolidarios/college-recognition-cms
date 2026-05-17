import type {
  AcademicEntry,
  AcademicPage,
  CmsPage,
  CmsSettings,
  CorePage,
  CoreSection,
  NonAcademicPage,
  ProgramPage,
  ProgramRow,
  FontPreset,
  NonAcademicEntry,
  RenderTextBlock,
  RenderedPage,
} from '@/types/cms'
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/types/cms'
import { getFontStack } from '@/lib/fonts'
import { isValidFlowPosition, snapFlowPosition } from '@/lib/flow-position'

/** Space between title block and first body column (tighter to match print brochure). */
const TITLE_GAP = 16
/** Tighter gutter under the program page heading — more rows fit above the fold. */
const TITLE_GAP_PROGRAM = 6
const SECTION_GAP = 11
const PARAGRAPH_GAP = 6
const ITEM_GAP = 2
/** Pixels inset for faculty name lists under “Permanent Faculty:” / “Part-time Lecturers:”. */
const CORE_LIST_INDENT = 14
/** Shrink wrap width slightly so layout reserves at least as many lines as the canvas / PDF renderer. */
const WRAP_WIDTH_INSET = 10

type LayoutContext = {
  renderedPages: RenderedPage[]
  logicalPage: CmsPage
  settings: CmsSettings
  columnWidth: number
  contentTop: number
  maxContentY: number
  currentPageIndex: number
  currentColumn: 0 | 1
  currentY: [number, number]
}

type TextOptions = {
  idPrefix: string
  text: string
  fontSize: number
  textRole?: 'heading' | 'body'
  width?: number
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  align?: 'left' | 'center' | 'right'
  uppercase?: boolean
  fullWidth?: boolean
  allowSplit?: boolean
  spacingAfter?: number
  letterSpacing?: number
  /** When set, stay in this column; overflow continues on the next page (never the sibling column). Used for program two-column rows. */
  pinColumn?: 0 | 1
  /** Narrower wrap width + shifted x (document px); used for indented faculty lists on core pages. */
  indent?: number
  /** Reserve document-space height after the first placed fragment to keep related content together. */
  reserveHeight?: number
  /** Minimum number of lines to place in non-final split fragments. */
  minFragmentLines?: number
  sectionId?: string
}

type MeasureOptions = {
  fontFamily: FontPreset
  fontSize: number
  fontWeight: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  letterSpacing?: number
  uppercase?: boolean
}

type ResolvedTextLayout = {
  fontFamily: FontPreset
  fontSize: number
  lineHeight: number
  blockSpacing: number
  width: number
  lines: string[]
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  align: 'left' | 'center' | 'right'
  uppercase?: boolean
  letterSpacing?: number
  pinned?: 0 | 1
  xFor: (col: 0 | 1) => number
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

export { getRenderedBlockLines } from '@/lib/rendered-block-text'
import { transformLineForRender } from '@/lib/rendered-block-text'

function getPageTitleBlocks(page: CmsPage, settings: CmsSettings, pageNumber: number): RenderTextBlock[] {
  const scale = getScale(settings)
  const titleWidth = PAGE_WIDTH - settings.pagePaddingX * 2
  const titleFontSize = (page.type === 'program' ? settings.titleSize * 1.95 : settings.titleSize) * scale
  const titleLineHeight =
    (page.type === 'program'
      ? settings.titleSize * 2.2
      : page.type === 'core'
        ? settings.titleSize * 1.08
        : settings.titleSize * 1.12) * scale

  // Wrap each heading line so the layout engine uses the true rendered line count,
  // preventing subsequent content blocks from overlapping the title.
  const wrappedTitleLines = page.content.heading
    .split('\n')
    .flatMap((line) =>
      wrapParagraph(line || ' ', titleWidth, {
        fontSize: titleFontSize,
        fontFamily: settings.headingFont,
        fontWeight: 'bold',
        letterSpacing: page.type === 'program' ? 1.8 : 0.6,
        uppercase: page.type !== 'core',
      }),
    )

  const blocks: RenderTextBlock[] = [
    {
      id: `${page.id}-title-${pageNumber}`,
      x: settings.pagePaddingX,
      y: settings.pagePaddingTop,
      width: titleWidth,
      lines: wrappedTitleLines,
      fontFamily: settings.headingFont,
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
    const subheadingFontSize = settings.subtitleSize * scale
    const subheadingLineHeight = settings.subtitleSize * 1.12 * scale
      const wrappedSubheadingLines = wrapText(page.content.subheading, titleWidth, {
        fontFamily: settings.headingFont,
        fontSize: subheadingFontSize,
        fontWeight: 'normal',
      })

    blocks.push({
      id: `${page.id}-subtitle-${pageNumber}`,
      x: settings.pagePaddingX,
      y:
        settings.pagePaddingTop +
        blocks[0].lines.length * titleLineHeight +
        Math.round((page.type === 'core' ? 4 : 8) * scale),
        width: titleWidth,
        lines: wrappedSubheadingLines,
        fontFamily: settings.headingFont,
        fontSize: subheadingFontSize,
        lineHeight: subheadingLineHeight,
        fontWeight: 'normal',
      fontStyle: 'normal',
      align: 'center',
    })
  }

  return blocks
}

function createMeasureContext({
  fontFamily,
  fontSize,
  fontWeight,
  fontStyle = 'normal',
}: Pick<MeasureOptions, 'fontFamily' | 'fontSize' | 'fontWeight' | 'fontStyle'>) {
  if (typeof document === 'undefined') {
    return null
  }

  measuringCanvas ??= document.createElement('canvas')
  const context = measuringCanvas.getContext('2d')

  if (!context) {
    return null
  }

  context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${getFontStack(fontFamily)}`
  return context
}

function measureWidth(text: string, options: MeasureOptions) {
  const renderedText = transformLineForRender(text, options.uppercase)
  const context = createMeasureContext(options)

  if (!context) {
    return renderedText.length * options.fontSize * 0.52
  }

  // Add a small safety margin to account for differences between Canvas text metrics
  // and browser DOM font rendering (kerning, letter-spacing, etc).
  return (
    context.measureText(renderedText).width * 1.04 +
    Math.max(0, renderedText.length - 1) * (options.letterSpacing ?? 0) +
    2
  )
}

function splitLongToken(token: string, width: number, options: MeasureOptions) {
  if (width <= 0) {
    return [token]
  }

  const parts: string[] = []
  let remaining = token

  while (remaining) {
    if (measureWidth(remaining, options) <= width) {
      parts.push(remaining)
      break
    }

    if (measureWidth(remaining[0], options) > width) {
      parts.push(remaining[0])
      remaining = remaining.slice(1)
      continue
    }

    let low = 1
    let high = remaining.length
    let fitLength = 1

    while (low <= high) {
      const mid = Math.floor((low + high) / 2)
      if (measureWidth(remaining.slice(0, mid), options) <= width) {
        fitLength = mid
        low = mid + 1
      } else {
        high = mid - 1
      }
    }

    parts.push(remaining.slice(0, fitLength))
    remaining = remaining.slice(fitLength)
  }

  return parts
}

function wrapParagraph(paragraph: string, width: number, options: MeasureOptions) {
  if (!paragraph.trim()) {
    return ['']
  }

  const words = paragraph
    .trim()
    .split(/\s+/)
    .flatMap((word) => (measureWidth(word, options) <= width ? [word] : splitLongToken(word, width, options)))
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word
    if (measureWidth(candidate, options) <= width || !currentLine) {
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

function wrapText(text: string, width: number, options: MeasureOptions) {
  const normalized = text.replace(/\r\n/g, '\n').trimEnd()
  const blocks = normalized
    .split(/\n\s*\n+/)
    .map((block) => block.trimEnd())
    .filter((block) => block.length > 0)

  const lines: string[] = []

  blocks.forEach((block, blockIndex) => {
    for (const line of block.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) {
        continue
      }
      lines.push(...wrapParagraph(trimmed, width, options))
    }
    if (blockIndex < blocks.length - 1) {
      lines.push('')
    }
  })

  while (lines.at(-1) === '') {
    lines.pop()
  }

  return lines
}

function createRenderedPage(
  page: CmsPage,
  settings: CmsSettings,
  pageNumber: number,
  sourcePageLocalIndex: number,
  contentTop: number,
  maxContentY: number,
): RenderedPage {
  return {
    id: `${page.id}-${pageNumber}`,
    sourcePageId: page.id,
    sourcePageType: page.type,
    sourcePageLocalIndex,
    pageNumber,
    contentTop,
    maxContentY,
    blocks: getPageTitleBlocks(page, settings, pageNumber),
  }
}

function getContentTop(page: CmsPage, settings: CmsSettings) {
  const titleBlocks = getPageTitleBlocks(page, settings, 1)
  const lastBlock = titleBlocks.at(-1)
  if (!lastBlock) {
    return settings.pagePaddingTop
  }

  const titleGap = page.type === 'program' ? TITLE_GAP_PROGRAM : TITLE_GAP
  return lastBlock.y + lastBlock.lines.length * lastBlock.lineHeight + titleGap * getScale(settings)
}

function createLayoutContext(page: CmsPage, settings: CmsSettings, pageNumber: number): LayoutContext {
  const contentTop = getContentTop(page, settings)
  const maxContentY = PAGE_HEIGHT - settings.pagePaddingBottom
  const firstPage = createRenderedPage(page, settings, pageNumber, 0, contentTop, maxContentY)
  return {
    renderedPages: [firstPage],
    logicalPage: page,
    settings,
    columnWidth: getColumnWidth(settings),
    contentTop,
    maxContentY,
    currentPageIndex: 0,
    currentColumn: 0,
    currentY: [contentTop, contentTop],
  }
}

function advanceToNextPage(context: LayoutContext) {
  const nextPageNumber = context.renderedPages.at(-1)!.pageNumber + 1
  context.renderedPages.push(
    createRenderedPage(
      context.logicalPage,
      context.settings,
      nextPageNumber,
      context.currentPageIndex + 1,
      context.contentTop,
      context.maxContentY,
    ),
  )
  context.currentPageIndex += 1
  context.currentColumn = 0
  context.currentY = [context.contentTop, context.contentTop]
}

function advanceFlow(context: LayoutContext) {
  if (context.currentColumn === 0) {
    context.currentColumn = 1
    return
  }

  advanceToNextPage(context)
}

function resolveTextLayout(context: LayoutContext, options: TextOptions): ResolvedTextLayout {
  const fontWeight = options.fontWeight ?? 'normal'
  const fontStyle = options.fontStyle ?? 'normal'
  const align = options.align ?? 'left'
  const fontFamily = options.textRole === 'heading' ? context.settings.headingFont : context.settings.bodyFont
  const scale = getScale(context.settings)
  const fontSize = options.fontSize * scale
  const full = options.fullWidth === true
  const inset = full ? 0 : (options.indent ?? 0)
  const columnTotal = full
    ? PAGE_WIDTH - context.settings.pagePaddingX * 2
    : (options.width ?? context.columnWidth)
  const rawWidth = Math.max(8, columnTotal - inset)
  const wrapWidth = full ? rawWidth : Math.max(8, rawWidth - WRAP_WIDTH_INSET)
  const width = rawWidth
  const lines = wrapText(options.text, wrapWidth, {
    fontFamily,
    fontSize,
    fontWeight,
    fontStyle,
    letterSpacing: options.letterSpacing,
    uppercase: options.uppercase,
  })
  const lineHeight = fontSize * context.settings.lineHeight
  const blockSpacing = (options.spacingAfter ?? PARAGRAPH_GAP) * scale

  return {
    fontFamily,
    fontSize,
    lineHeight,
    blockSpacing,
    width,
    lines,
    fontWeight,
    fontStyle,
    align,
    uppercase: options.uppercase,
    letterSpacing: options.letterSpacing,
    pinned: options.pinColumn,
    xFor: (col: 0 | 1) => {
      const base = full ? context.settings.pagePaddingX : getColumnX(context.settings, col)
      return base + inset
    },
  }
}

function estimateTextHeight(
  context: LayoutContext,
  options: TextOptions,
  maxLines = Number.POSITIVE_INFINITY,
  includeSpacing = false,
) {
  const resolved = resolveTextLayout(context, options)
  const visibleLines = Math.min(resolved.lines.length, maxLines)
  if (visibleLines === 0) {
    return 0
  }
  return visibleLines * resolved.lineHeight + (includeSpacing ? resolved.blockSpacing : 0)
}

function getEffectiveReserve(contentHeight: number, reserveHeight: number, maxContentHeight: number) {
  return contentHeight + reserveHeight <= maxContentHeight ? reserveHeight : 0
}

function addLinesToFlow(context: LayoutContext, options: TextOptions) {
  const resolved = resolveTextLayout(context, options)
  const {
    fontFamily,
    fontSize,
    lineHeight,
    blockSpacing,
    width,
    lines,
    fontWeight,
    fontStyle,
    align,
    uppercase,
    letterSpacing,
    pinned,
    xFor,
  } = resolved
  const reserveHeight = options.reserveHeight ?? 0
  const maxContentHeight = context.maxContentY - context.contentTop
  const sectionId = options.sectionId

  const resolveColumn = (): 0 | 1 => (pinned !== undefined ? pinned : context.currentColumn)

  if (pinned !== undefined) {
    context.currentColumn = pinned
  }

  if (!lines.length) {
    return
  }

  const advanceWhenFull = () => {
    if (pinned !== undefined) {
      advanceToNextPage(context)
      context.currentColumn = pinned
      return
    }
    advanceFlow(context)
  }

  if (options.allowSplit === false) {
    const height = lines.length * lineHeight
    // If a block already consumes a full page, drop the keep-with-next reserve so it can still render.
    const effectiveReserve = getEffectiveReserve(height, reserveHeight, maxContentHeight)
    let guard = 0
    while (guard < 48) {
      const col = resolveColumn()
      if (context.currentY[col] + height + effectiveReserve <= context.maxContentY) {
        break
      }
      advanceWhenFull()
      guard += 1
    }

    if (height <= maxContentHeight) {
      const col = resolveColumn()
      context.renderedPages[context.currentPageIndex].blocks.push({
        id: `${options.idPrefix}-${context.currentPageIndex}-${col}`,
        x: xFor(col),
        y: context.currentY[col],
        width,
        lines,
        fontFamily,
        fontSize,
        lineHeight,
        fontWeight,
        fontStyle,
        align,
        uppercase,
        letterSpacing,
        sectionId,
      })
      context.currentY[col] += height + blockSpacing
      return
    }

    // Blocks that cannot fit on a single page fall through to the splitting logic below.
  }

  let remainingLines = [...lines]
  let blockIndex = 0
  const minFragmentLines = Math.max(1, options.minFragmentLines ?? 1)

  while (remainingLines.length > 0) {
    const col = resolveColumn()
    const availableHeight = context.maxContentY - context.currentY[col]
    const availableLines = Math.floor(availableHeight / lineHeight)
    const requiredLines = remainingLines.length <= minFragmentLines ? 1 : Math.min(minFragmentLines, remainingLines.length)
    const keepReserve = blockIndex === 0
      ? getEffectiveReserve(requiredLines * lineHeight, reserveHeight, maxContentHeight)
      : 0
    const lacksRequiredLines = availableLines < requiredLines
    const violatesReservedSpace = context.currentY[col] + requiredLines * lineHeight + keepReserve > context.maxContentY

    if (lacksRequiredLines || violatesReservedSpace) {
      advanceWhenFull()
      continue
    }

    const takeCount = Math.min(availableLines, remainingLines.length)
    const visibleLines = remainingLines.slice(0, takeCount)
    const isLastFragment = takeCount === remainingLines.length

    context.renderedPages[context.currentPageIndex].blocks.push({
      id: `${options.idPrefix}-${context.currentPageIndex}-${col}-${blockIndex}`,
      x: xFor(col),
      y: context.currentY[col],
      width,
      lines: visibleLines,
      fontFamily,
      fontSize,
      lineHeight,
      fontWeight,
      fontStyle,
      align,
      uppercase,
      letterSpacing,
      sectionId,
    })

    context.currentY[col] += visibleLines.length * lineHeight + (isLastFragment ? blockSpacing : 0)
    remainingLines = remainingLines.slice(visibleLines.length)
    blockIndex += 1

    if (remainingLines.length > 0) {
      advanceWhenFull()
    }
  }
}

function getColumnsPerPage(context: LayoutContext): number {
  return context.logicalPage.type === 'program' ? 1 : 2
}

function setContextToFlowPosition(context: LayoutContext, flowPosition: number) {
  const columnHeight = context.maxContentY - context.contentTop
  if (columnHeight <= 0) {
    return
  }
  const safeFlow = Math.max(0, flowPosition)
  const columnsPerPage = getColumnsPerPage(context)
  const pageSpan = columnHeight * columnsPerPage
  const pageOffset = Math.floor(safeFlow / pageSpan)
  const withinPage = safeFlow - pageOffset * pageSpan
  const column = (withinPage >= columnHeight ? 1 : 0) as 0 | 1
  const yInColumn = withinPage - (column === 1 ? columnHeight : 0)

  while (context.currentPageIndex < pageOffset) {
    advanceToNextPage(context)
  }

  context.currentColumn = column
  context.currentY[column] = context.contentTop + yInColumn
}

type SectionHeadingOptions = {
  uppercase?: boolean
  /** Document-space px after heading (tighter for short officer blocks). */
  spacingAfter?: number
  reserveHeight?: number
}

function addSectionHeading(
  context: LayoutContext,
  text: string,
  key: string,
  sectionId: string,
  options?: SectionHeadingOptions,
) {
  addLinesToFlow(context, {
    idPrefix: `section-heading-${key}`,
    text,
    fontSize: context.settings.headingSize,
    textRole: 'heading',
    fontWeight: 'bold',
    spacingAfter: options?.spacingAfter ?? ITEM_GAP,
    allowSplit: false,
    uppercase: options?.uppercase === true,
    reserveHeight: options?.reserveHeight,
    sectionId,
  })
}

const FACULTY_LIST_LABEL = /^(Permanent Faculty|Part-time Lecturers):\s*$/i

/** Split core body so name lists under faculty headings use a horizontal indent (see print layout). */
function segmentCoreBodyForLayout(body: string): { text: string; indent: boolean }[] {
  const raw = body.split('\n')
  const out: { text: string; indent: boolean }[] = []
  let buf: string[] = []
  let indentMode = false

  const flush = (indent: boolean) => {
    if (!buf.length) {
      return
    }
    out.push({ text: buf.join('\n'), indent })
    buf = []
  }

  for (const line of raw) {
    const trimmed = line.trim()
    if (FACULTY_LIST_LABEL.test(trimmed)) {
      if (indentMode) {
        flush(true)
      } else {
        flush(false)
      }
      out.push({ text: line, indent: false })
      indentMode = true
      continue
    }
    if (trimmed === '') {
      if (indentMode) {
        flush(true)
        indentMode = false
      } else {
        flush(false)
      }
      continue
    }
    buf.push(line)
  }
  if (indentMode) {
    flush(true)
  } else {
    flush(false)
  }
  return out
}

function renderCoreSection(context: LayoutContext, section: CoreSection, sectionKey: string) {
  const trimmedTitle = section.title.trim()
  const segments = segmentCoreBodyForLayout(section.body).filter((seg) => seg.text.trim())
  const firstBodyReserve = segments.length
    ? estimateTextHeight(
        context,
        {
          idPrefix: `section-body-${sectionKey}-reserve`,
          text: segments[0].text,
          fontSize: context.settings.bodySize,
          indent: segments[0].indent ? CORE_LIST_INDENT : undefined,
        },
        2,
      )
    : 0

  if (trimmedTitle) {
    const headingUppercase = !/^(Dean|College Secretary)$/i.test(trimmedTitle)
    const tightOfficerHeading = /^College Secretary$/i.test(trimmedTitle)
    addSectionHeading(context, section.title, sectionKey, section.id, {
      uppercase: headingUppercase,
      spacingAfter: tightOfficerHeading ? 1 : undefined,
      reserveHeight: firstBodyReserve,
    })
  }
  segments.forEach((seg, segIndex) => {
    const isLast = segIndex === segments.length - 1
    addLinesToFlow(context, {
      idPrefix: `section-body-${sectionKey}-${segIndex}`,
      text: seg.text,
      fontSize: context.settings.bodySize,
      spacingAfter: isLast ? SECTION_GAP : PARAGRAPH_GAP,
      indent: seg.indent ? CORE_LIST_INDENT : undefined,
      minFragmentLines: 2,
      sectionId: section.id,
    })
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

function renderAcademicEntry(context: LayoutContext, entry: AcademicEntry, key: string) {
  const sectionId = entry.id
  addLinesToFlow(context, {
    idPrefix: `academic-name-${key}`,
    text: entry.name,
    fontSize: context.settings.bodySize,
    fontWeight: 'bold',
    spacingAfter: ITEM_GAP,
    allowSplit: false,
    reserveHeight: context.settings.bodySize * getScale(context.settings) * context.settings.lineHeight,
    sectionId,
  })
  addLinesToFlow(context, {
    idPrefix: `academic-award-${key}`,
    text: entry.award,
    fontSize: context.settings.bodySize,
    spacingAfter: 10,
    minFragmentLines: 2,
    sectionId,
  })
}

function renderAcademicPage(context: LayoutContext, entries: AcademicEntry[]) {
  const sorted = [...entries].map((entry, index) => ({ item: entry, index })).sort(compareByFlowPosition)
  let gradeIndex = 0
  let categoryIndex = 0
  let lastGrade: string | null = null
  let lastCategory: string | null = null

  for (const { item: entry, index } of sorted) {
    if (entry.gradeLevel !== lastGrade) {
      lastGrade = entry.gradeLevel
      lastCategory = null
      const categories = groupAcademicEntries(entries).get(entry.gradeLevel)
      addLinesToFlow(context, {
        idPrefix: `academic-grade-${gradeIndex}`,
        text: entry.gradeLevel,
        fontSize: context.settings.subtitleSize,
        textRole: 'heading',
        fontWeight: 'bold',
        spacingAfter: 8,
        allowSplit: false,
        reserveHeight: estimateTextHeight(
          context,
          {
            idPrefix: `academic-grade-${gradeIndex}-reserve`,
            text: [...(categories?.keys() ?? [])][0] ?? '',
            fontSize: context.settings.headingSize,
            textRole: 'heading',
            fontWeight: 'bold',
          },
          1,
          true,
        ),
      })
      gradeIndex += 1
      categoryIndex = 0
    }

    if (entry.category !== lastCategory) {
      lastCategory = entry.category
      addLinesToFlow(context, {
        idPrefix: `academic-category-${gradeIndex}-${categoryIndex}`,
        text: entry.category,
        fontSize: context.settings.headingSize,
        textRole: 'heading',
        fontWeight: 'bold',
        spacingAfter: 8,
        allowSplit: false,
        reserveHeight: estimateTextHeight(
          context,
          {
            idPrefix: `academic-category-${gradeIndex}-${categoryIndex}-reserve`,
            text: entry.award,
            fontSize: context.settings.bodySize,
            fontWeight: 'bold',
          },
          1,
          true,
        ) + context.settings.bodySize * getScale(context.settings) * context.settings.lineHeight,
      })
      categoryIndex += 1
    }

    if (isValidFlowPosition(entry.flowPosition)) {
      setContextToFlowPosition(context, entry.flowPosition)
    }
    renderAcademicEntry(context, entry, `${entry.id}-${index}`)
  }
}

function renderNonAcademicEntry(context: LayoutContext, entry: NonAcademicEntry, key: string) {
  const sectionId = entry.id
  addLinesToFlow(context, {
    idPrefix: `nonacademic-name-${key}`,
    text: entry.name,
    fontSize: context.settings.bodySize,
    fontWeight: 'bold',
    spacingAfter: ITEM_GAP,
    allowSplit: false,
    reserveHeight: context.settings.bodySize * getScale(context.settings) * context.settings.lineHeight,
    sectionId,
  })
  addLinesToFlow(context, {
    idPrefix: `nonacademic-award-${key}`,
    text: entry.award,
    fontSize: context.settings.bodySize,
    spacingAfter: 12,
    minFragmentLines: 2,
    sectionId,
  })
}

function renderNonAcademicPage(context: LayoutContext, entries: NonAcademicEntry[]) {
  const sorted = [...entries].map((entry, index) => ({ item: entry, index })).sort(compareByFlowPosition)
  let categoryIndex = 0
  let lastCategory: string | null = null

  for (const { item: entry, index } of sorted) {
    if (entry.category !== lastCategory) {
      lastCategory = entry.category
      addLinesToFlow(context, {
        idPrefix: `nonacademic-category-${categoryIndex}`,
        text: entry.category,
        fontSize: context.settings.headingSize,
        textRole: 'heading',
        fontWeight: 'bold',
        spacingAfter: 10,
        allowSplit: false,
        reserveHeight:
          estimateTextHeight(
            context,
            {
              idPrefix: `nonacademic-name-${categoryIndex}-reserve`,
              text: entry.name,
              fontSize: context.settings.bodySize,
              fontWeight: 'bold',
            },
            1,
            true,
          ) + context.settings.bodySize * getScale(context.settings) * context.settings.lineHeight,
      })
      categoryIndex += 1
    }

    if (isValidFlowPosition(entry.flowPosition)) {
      setContextToFlowPosition(context, entry.flowPosition)
    }
    renderNonAcademicEntry(context, entry, `${entry.id}-${index}`)
  }
}

type FlowOrderedItem = { id: string; flowPosition?: number }

function compareByFlowPosition<T extends FlowOrderedItem>(
  left: { item: T; index: number },
  right: { item: T; index: number },
) {
  const leftFlow = isValidFlowPosition(left.item.flowPosition) ? left.item.flowPosition : undefined
  const rightFlow = isValidFlowPosition(right.item.flowPosition) ? right.item.flowPosition : undefined
  if (leftFlow === undefined && rightFlow === undefined) return left.index - right.index
  if (leftFlow === undefined) return 1
  if (rightFlow === undefined) return -1
  if (leftFlow === rightFlow) return left.index - right.index
  return leftFlow - rightFlow
}

function packFlowPositions<T extends FlowOrderedItem>(
  items: T[],
  implicit: Map<string, number>,
  spanById: Map<string, number>,
  overrides: Record<string, number> = {},
): Map<string, number> {
  const entries = items.map((item, index) => {
    const desired =
      overrides[item.id] ??
      (isValidFlowPosition(item.flowPosition) ? item.flowPosition : implicit.get(item.id) ?? 0)
    return {
      item,
      index,
      desired: snapFlowPosition(desired),
      span: spanById.get(item.id) ?? FLOW_PACK_GAP,
    }
  })

  entries.sort((left, right) => left.desired - right.desired || left.index - right.index)

  const resolved = new Map<string, number>()
  let cursor = 0
  for (const entry of entries) {
    const start = snapFlowPosition(Math.max(entry.desired, cursor))
    resolved.set(entry.item.id, start)
    cursor = start + entry.span + FLOW_PACK_GAP
  }
  return resolved
}

function renderProgramRow(context: LayoutContext, row: ProgramRow, index: number) {
  const afterBodySpacing = context.settings.bodySize * context.settings.lineHeight
  const sectionId = row.id
  const flowOptions = { fullWidth: true, pinColumn: 0 as const }

  const parts: Array<{ type: 'title' | 'body'; text: string }> = [
    { type: 'title', text: row.leftTitle },
    { type: 'body', text: row.leftBody },
  ]
  if (row.rightTitle?.trim()) {
    parts.push({ type: 'title', text: row.rightTitle })
  }
  if (row.rightBody?.trim()) {
    parts.push({ type: 'body', text: row.rightBody })
  }

  for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
    const part = parts[partIndex]
    if (!part.text.trim()) {
      continue
    }

    if (part.type === 'title') {
      const next = parts[partIndex + 1]
      const bodyReserve =
        next?.type === 'body'
          ? estimateTextHeight(
              context,
              {
                idPrefix: `program-body-${index}-reserve-${partIndex}`,
                text: next.text,
                fontSize: context.settings.bodySize,
                ...flowOptions,
              },
              2,
            )
          : 0

      addLinesToFlow(context, {
        idPrefix: `program-title-${index}-${partIndex}`,
        text: part.text,
        fontSize: context.settings.bodySize,
        textRole: 'heading',
        fontWeight: 'bold',
        spacingAfter: 1,
        allowSplit: false,
        reserveHeight: bodyReserve,
        sectionId,
        ...flowOptions,
      })
      continue
    }

    addLinesToFlow(context, {
      idPrefix: `program-body-${index}-${partIndex}`,
      text: part.text,
      fontSize: context.settings.bodySize,
      spacingAfter: afterBodySpacing,
      minFragmentLines: 2,
      sectionId,
      ...flowOptions,
    })
  }

  context.currentColumn = 0
  context.currentY[1] = context.currentY[0]
}

function renderProgramPage(context: LayoutContext, rows: ProgramRow[]) {
  ;[...rows]
    .map((row, index) => ({ item: row, index }))
    .sort(compareByFlowPosition)
    .forEach(({ item: row, index }) => {
      if (isValidFlowPosition(row.flowPosition)) {
        setContextToFlowPosition(context, row.flowPosition)
      }
      renderProgramRow(context, row, index)
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
      fontFamily: settings.bodyFont,
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

/** Minimum flow gap between packed core sections (matches SECTION_GAP). */
const FLOW_PACK_GAP = SECTION_GAP

function flowAtLayoutContext(context: LayoutContext, column: 0 | 1): number {
  const columnHeight = Math.max(1, context.maxContentY - context.contentTop)
  const pageSpan = columnHeight * getColumnsPerPage(context)
  const yInColumn = Math.max(0, context.currentY[column] - context.contentTop)
  const withinPage = (column === 1 ? columnHeight : 0) + yInColumn
  return context.currentPageIndex * pageSpan + withinPage
}

function measureCoreSectionFlowSpan(page: CorePage, settings: CmsSettings, section: CoreSection): number {
  const context = createLayoutContext(page, settings, 1)
  setContextToFlowPosition(context, 0)
  const start = flowAtLayoutContext(context, context.currentColumn)
  renderCoreSection(context, section, `measure-${section.id}`)
  const end = flowAtLayoutContext(context, context.currentColumn)
  return Math.max(FLOW_PACK_GAP, end - start)
}

function computeImplicitCoreSectionFlows(page: CorePage, settings: CmsSettings): Map<string, number> {
  const context = createLayoutContext(page, settings, 1)
  const flows = new Map<string, number>()
  page.content.sections.forEach((section, index) => {
    flows.set(section.id, flowAtLayoutContext(context, context.currentColumn))
    renderCoreSection(context, section, `implicit-${index}`)
  })
  return flows
}

/** Pack core sections in flow order so none overlap; pushed sections shift down automatically. */
export function resolveCoreSectionFlowPositions(
  page: CorePage,
  settings: CmsSettings,
  overrides: Record<string, number> = {},
): Map<string, number> {
  return packFlowPositions(
    page.content.sections,
    computeImplicitCoreSectionFlows(page, settings),
    new Map(page.content.sections.map((section) => [section.id, measureCoreSectionFlowSpan(page, settings, section)])),
    overrides,
  )
}

function measureProgramRowFlowSpan(page: ProgramPage, settings: CmsSettings, row: ProgramRow): number {
  const context = createLayoutContext(page, settings, 1)
  setContextToFlowPosition(context, 0)
  const start = flowAtLayoutContext(context, context.currentColumn)
  renderProgramRow(context, row, 0)
  const end = flowAtLayoutContext(context, context.currentColumn)
  return Math.max(FLOW_PACK_GAP, end - start)
}

function computeImplicitProgramRowFlows(page: ProgramPage, settings: CmsSettings): Map<string, number> {
  const context = createLayoutContext(page, settings, 1)
  const flows = new Map<string, number>()
  page.content.rows.forEach((row, index) => {
    flows.set(row.id, flowAtLayoutContext(context, context.currentColumn))
    renderProgramRow(context, row, index)
  })
  return flows
}

export function resolveProgramRowFlowPositions(
  page: ProgramPage,
  settings: CmsSettings,
  overrides: Record<string, number> = {},
): Map<string, number> {
  return packFlowPositions(
    page.content.rows,
    computeImplicitProgramRowFlows(page, settings),
    new Map(page.content.rows.map((row) => [row.id, measureProgramRowFlowSpan(page, settings, row)])),
    overrides,
  )
}

function measureAcademicEntryFlowSpan(page: AcademicPage, settings: CmsSettings, entry: AcademicEntry): number {
  const context = createLayoutContext(page, settings, 1)
  setContextToFlowPosition(context, 0)
  const start = flowAtLayoutContext(context, context.currentColumn)
  renderAcademicEntry(context, entry, `measure-${entry.id}`)
  const end = flowAtLayoutContext(context, context.currentColumn)
  return Math.max(FLOW_PACK_GAP, end - start)
}

function computeImplicitAcademicEntryFlows(page: AcademicPage, settings: CmsSettings): Map<string, number> {
  const context = createLayoutContext(page, settings, 1)
  const flows = new Map<string, number>()
  let gradeIndex = 0
  let categoryIndex = 0
  let lastGrade: string | null = null
  let lastCategory: string | null = null

  for (const [index, entry] of page.content.entries.entries()) {
    if (entry.gradeLevel !== lastGrade) {
      lastGrade = entry.gradeLevel
      lastCategory = null
      addLinesToFlow(context, {
        idPrefix: `academic-grade-implicit-${gradeIndex}`,
        text: entry.gradeLevel,
        fontSize: settings.subtitleSize,
        textRole: 'heading',
        fontWeight: 'bold',
        spacingAfter: 8,
        allowSplit: false,
      })
      gradeIndex += 1
      categoryIndex = 0
    }
    if (entry.category !== lastCategory) {
      lastCategory = entry.category
      addLinesToFlow(context, {
        idPrefix: `academic-category-implicit-${gradeIndex}-${categoryIndex}`,
        text: entry.category,
        fontSize: settings.headingSize,
        textRole: 'heading',
        fontWeight: 'bold',
        spacingAfter: 8,
        allowSplit: false,
      })
      categoryIndex += 1
    }
    flows.set(entry.id, flowAtLayoutContext(context, context.currentColumn))
    renderAcademicEntry(context, entry, `implicit-${index}`)
  }
  return flows
}

export function resolveAcademicEntryFlowPositions(
  page: AcademicPage,
  settings: CmsSettings,
  overrides: Record<string, number> = {},
): Map<string, number> {
  return packFlowPositions(
    page.content.entries,
    computeImplicitAcademicEntryFlows(page, settings),
    new Map(page.content.entries.map((entry) => [entry.id, measureAcademicEntryFlowSpan(page, settings, entry)])),
    overrides,
  )
}

function measureNonAcademicEntryFlowSpan(
  page: NonAcademicPage,
  settings: CmsSettings,
  entry: NonAcademicEntry,
): number {
  const context = createLayoutContext(page, settings, 1)
  setContextToFlowPosition(context, 0)
  const start = flowAtLayoutContext(context, context.currentColumn)
  renderNonAcademicEntry(context, entry, `measure-${entry.id}`)
  const end = flowAtLayoutContext(context, context.currentColumn)
  return Math.max(FLOW_PACK_GAP, end - start)
}

function computeImplicitNonAcademicEntryFlows(page: NonAcademicPage, settings: CmsSettings): Map<string, number> {
  const context = createLayoutContext(page, settings, 1)
  const flows = new Map<string, number>()
  let categoryIndex = 0
  let lastCategory: string | null = null

  for (const [index, entry] of page.content.entries.entries()) {
    if (entry.category !== lastCategory) {
      lastCategory = entry.category
      addLinesToFlow(context, {
        idPrefix: `nonacademic-category-implicit-${categoryIndex}`,
        text: entry.category,
        fontSize: settings.headingSize,
        textRole: 'heading',
        fontWeight: 'bold',
        spacingAfter: 10,
        allowSplit: false,
      })
      categoryIndex += 1
    }
    flows.set(entry.id, flowAtLayoutContext(context, context.currentColumn))
    renderNonAcademicEntry(context, entry, `implicit-${index}`)
  }
  return flows
}

export function resolveNonAcademicEntryFlowPositions(
  page: NonAcademicPage,
  settings: CmsSettings,
  overrides: Record<string, number> = {},
): Map<string, number> {
  return packFlowPositions(
    page.content.entries,
    computeImplicitNonAcademicEntryFlows(page, settings),
    new Map(
      page.content.entries.map((entry) => [entry.id, measureNonAcademicEntryFlowSpan(page, settings, entry)]),
    ),
    overrides,
  )
}

export function renderDocument(pages: CmsPage[], settings: CmsSettings) {
  const renderedPages: RenderedPage[] = []
  let pageNumber = 1

  for (const page of [...pages].sort((left, right) => left.order - right.order)) {
    const context = createLayoutContext(page, settings, pageNumber)

    switch (page.type) {
      case 'core':
        page.content.sections
          .map((section, index) => ({ item: section, index }))
          .sort(compareByFlowPosition)
          .forEach(({ item: section, index }) => {
            if (isValidFlowPosition(section.flowPosition)) {
              setContextToFlowPosition(context, section.flowPosition)
            }
            renderCoreSection(context, section, `${section.id}-${index}`)
          })
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
