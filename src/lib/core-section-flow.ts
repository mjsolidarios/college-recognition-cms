import { normalizeFlowPosition, snapFlowPosition } from '@/lib/flow-position'
import type { CmsPage, CoreSection } from '@/types/cms'

export type SectionFlowCommand = {
  pageId: string
  sectionId: string
  from: number | undefined
  to: number | undefined
}

export function flowPositionsEqual(a: number | undefined, b: number | undefined): boolean {
  return normalizeFlowPosition(a) === normalizeFlowPosition(b)
}

export function getCoreSectionFlowPosition(
  pages: CmsPage[],
  pageId: string,
  sectionId: string,
): number | undefined {
  const page = pages.find((entry) => entry.id === pageId && entry.type === 'core')
  if (!page || page.type !== 'core') {
    return undefined
  }
  const section = page.content.sections.find((entry) => entry.id === sectionId)
  return normalizeFlowPosition(section?.flowPosition)
}

export function setCoreSectionFlowPosition(
  pages: CmsPage[],
  pageId: string,
  sectionId: string,
  flowPosition: number | undefined,
): CmsPage[] {
  const snapped = flowPosition === undefined ? undefined : snapFlowPosition(flowPosition)

  return pages.map((page) => {
    if (page.id !== pageId || page.type !== 'core') {
      return page
    }
    return {
      ...page,
      content: {
        ...page.content,
        sections: page.content.sections.map((section): CoreSection => {
          if (section.id !== sectionId) {
            return section
          }
          if (snapped === undefined) {
            const { flowPosition: _removed, ...rest } = section
            return rest
          }
          return { ...section, flowPosition: snapped }
        }),
      },
    }
  })
}
