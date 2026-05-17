import { snapFlowPosition } from '@/lib/flow-position'
import { PAGE_WIDTH, type PageType, type RenderedPage } from '@/types/cms'

const PAGE_CENTER_X = PAGE_WIDTH / 2

export function columnsPerPageForType(pageType: PageType): number {
  return pageType === 'program' ? 1 : 2
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function flowFromPlacement(
  localPageIndex: number,
  column: 0 | 1,
  y: number,
  contentTop: number,
  maxContentY: number,
  pageType: PageType,
) {
  const columnHeight = Math.max(1, maxContentY - contentTop)
  const yInColumn = clampNumber(y - contentTop, 0, columnHeight)
  const columnsPerPage = columnsPerPageForType(pageType)
  const columnOffset = pageType === 'program' ? 0 : column * columnHeight
  return localPageIndex * columnHeight * columnsPerPage + columnOffset + yInColumn
}

export function placementFromFlow(
  flowPosition: number,
  contentTop: number,
  maxContentY: number,
  pageType: PageType,
) {
  const columnHeight = Math.max(1, maxContentY - contentTop)
  const safeFlow = Math.max(0, flowPosition)
  const pageSpan = columnHeight * columnsPerPageForType(pageType)
  const localPageIndex = Math.floor(safeFlow / pageSpan)
  const withinPage = safeFlow - localPageIndex * pageSpan
  const column = (pageType === 'program' ? 0 : withinPage >= columnHeight ? 1 : 0) as 0 | 1
  const y = contentTop + withinPage - (column === 1 ? columnHeight : 0)
  return { localPageIndex, column, y }
}

export type LayoutItemOverlay = {
  id: string
  itemId: string
  left: number
  top: number
  width: number
  height: number
  flowPosition: number
}

function inferColumnFromHorizontalBounds(left: number, right: number): 0 | 1 {
  return (left + right) / 2 >= PAGE_CENTER_X ? 1 : 0
}

export function buildLayoutItemStartFlowMap(
  renderedPages: RenderedPage[],
  sourcePageId: string,
): Map<string, number> {
  const startById = new Map<string, number>()

  for (const renderedPage of renderedPages) {
    if (renderedPage.sourcePageId !== sourcePageId) {
      continue
    }
    for (const block of renderedPage.blocks) {
      if (!block.sectionId) {
        continue
      }
      const column = inferColumnFromHorizontalBounds(block.x, block.x + block.width)
      const flow = flowFromPlacement(
        renderedPage.sourcePageLocalIndex,
        column,
        block.y,
        renderedPage.contentTop,
        renderedPage.maxContentY,
        renderedPage.sourcePageType,
      )
      const currentStart = startById.get(block.sectionId)
      if (currentStart === undefined || flow < currentStart) {
        startById.set(block.sectionId, flow)
      }
    }
  }

  return startById
}

export function buildLayoutItemOverlays(
  renderedPage: RenderedPage,
  startFlowByItemId: Map<string, number>,
): LayoutItemOverlay[] {
  const grouped = new Map<string, RenderedPage['blocks']>()

  for (const block of renderedPage.blocks) {
    if (!block.sectionId) {
      continue
    }
    const list = grouped.get(block.sectionId) ?? []
    list.push(block)
    grouped.set(block.sectionId, list)
  }

  return [...grouped.entries()].map(([itemId, blocks]) => {
    const left = Math.min(...blocks.map((block) => block.x))
    const top = Math.min(...blocks.map((block) => block.y))
    const right = Math.max(...blocks.map((block) => block.x + block.width))
    const bottom = Math.max(...blocks.map((block) => block.y + block.lines.length * block.lineHeight))
    const column = inferColumnFromHorizontalBounds(left, right)
    const fallbackFlow = flowFromPlacement(
      renderedPage.sourcePageLocalIndex,
      column,
      top,
      renderedPage.contentTop,
      renderedPage.maxContentY,
      renderedPage.sourcePageType,
    )

    return {
      id: itemId,
      itemId,
      left,
      top,
      width: Math.max(8, right - left),
      height: Math.max(8, bottom - top),
      flowPosition: startFlowByItemId.get(itemId) ?? fallbackFlow,
    }
  })
}

export function findLayoutItemAtPoint(
  blocks: RenderedPage['blocks'],
  docX: number,
  docY: number,
): string | null {
  const hits: { itemId: string; area: number }[] = []

  for (const block of blocks) {
    if (!block.sectionId) {
      continue
    }
    const bottom = block.y + block.lines.length * block.lineHeight
    if (docX < block.x || docX > block.x + block.width || docY < block.y || docY > bottom) {
      continue
    }
    hits.push({
      itemId: block.sectionId,
      area: block.width * Math.max(1, bottom - block.y),
    })
  }

  if (!hits.length) {
    return null
  }

  hits.sort((left, right) => left.area - right.area)
  return hits[0]!.itemId
}

export function snapLayoutFlowPosition(flowPosition: number): number {
  return snapFlowPosition(flowPosition)
}
