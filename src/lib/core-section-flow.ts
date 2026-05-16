import { resolveCoreSectionFlowPositions } from '@/lib/layout'
import { normalizeFlowPosition, snapFlowPosition } from '@/lib/flow-position'
import type { CmsPage, CmsSettings, CorePage } from '@/types/cms'

export type SectionFlowReflowCommand = {
  pageId: string
  movedSectionId: string
  before: Record<string, number | undefined>
  after: Record<string, number | undefined>
}

export function flowPositionsEqual(a: number | undefined, b: number | undefined): boolean {
  return normalizeFlowPosition(a) === normalizeFlowPosition(b)
}

export function snapshotCoreSectionFlows(page: CorePage): Record<string, number | undefined> {
  return Object.fromEntries(
    page.content.sections.map((section) => [section.id, normalizeFlowPosition(section.flowPosition)]),
  )
}

export function coreSectionFlowSnapshotsEqual(
  before: Record<string, number | undefined>,
  after: Record<string, number | undefined>,
): boolean {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const key of keys) {
    if (!flowPositionsEqual(before[key], after[key])) {
      return false
    }
  }
  return true
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

export function applyCoreSectionFlowMap(
  pages: CmsPage[],
  pageId: string,
  flows: Record<string, number | undefined>,
): CmsPage[] {
  return pages.map((page) => {
    if (page.id !== pageId || page.type !== 'core') {
      return page
    }
    return {
      ...page,
      content: {
        ...page.content,
        sections: page.content.sections.map((section) => {
          const flow = flows[section.id]
          if (flow === undefined) {
            const { flowPosition: _removed, ...rest } = section
            return rest
          }
          return { ...section, flowPosition: snapFlowPosition(flow) }
        }),
      },
    }
  })
}

export function repositionCoreSectionWithReflow(
  pages: CmsPage[],
  pageId: string,
  sectionId: string,
  flowPosition: number,
  settings: CmsSettings,
): { pages: CmsPage[]; before: Record<string, number | undefined>; after: Record<string, number | undefined> } | null {
  const page = pages.find((entry) => entry.id === pageId && entry.type === 'core')
  if (!page || page.type !== 'core') {
    return null
  }

  const before = snapshotCoreSectionFlows(page)
  const resolved = resolveCoreSectionFlowPositions(page, settings, {
    [sectionId]: snapFlowPosition(flowPosition),
  })
  const after = Object.fromEntries(resolved.entries()) as Record<string, number | undefined>

  if (coreSectionFlowSnapshotsEqual(before, after)) {
    return null
  }

  return {
    pages: applyCoreSectionFlowMap(pages, pageId, after),
    before,
    after,
  }
}

/** @deprecated Use applyCoreSectionFlowMap — single-section updates do not reflow peers. */
export function setCoreSectionFlowPosition(
  pages: CmsPage[],
  pageId: string,
  sectionId: string,
  flowPosition: number | undefined,
): CmsPage[] {
  const page = pages.find((entry) => entry.id === pageId && entry.type === 'core')
  if (!page || page.type !== 'core') {
    return pages
  }
  const flows = snapshotCoreSectionFlows(page)
  if (flowPosition === undefined) {
    delete flows[sectionId]
  } else {
    flows[sectionId] = snapFlowPosition(flowPosition)
  }
  return applyCoreSectionFlowMap(pages, pageId, flows)
}
