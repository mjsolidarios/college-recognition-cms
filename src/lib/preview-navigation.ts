import type { RenderedPage } from '@/types/cms'

/** Display-slot index for the first rendered sheet of a CMS page (includes front-cover offset). */
export function previewSlotIndexForPageId(
  renderedPages: RenderedPage[],
  pageId: string,
  options: { hasFrontCover?: boolean } = {},
): number | null {
  const renderedIndex = renderedPages.findIndex((page) => page.sourcePageId === pageId)
  if (renderedIndex < 0) {
    return null
  }
  const coverOffset = options.hasFrontCover ? 1 : 0
  return coverOffset + renderedIndex
}

/** Display-slot index for the sheet that contains a layout item's blocks (falls back to the page's first sheet). */
export function previewSlotIndexForLayoutItem(
  renderedPages: RenderedPage[],
  pageId: string,
  itemId: string,
  options: { hasFrontCover?: boolean } = {},
): number | null {
  const renderedIndex = renderedPages.findIndex(
    (page) => page.sourcePageId === pageId && page.blocks.some((block) => block.sectionId === itemId),
  )
  if (renderedIndex >= 0) {
    const coverOffset = options.hasFrontCover ? 1 : 0
    return coverOffset + renderedIndex
  }
  return previewSlotIndexForPageId(renderedPages, pageId, options)
}

/** @deprecated Use previewSlotIndexForLayoutItem */
export const previewSlotIndexForCoreSection = previewSlotIndexForLayoutItem
