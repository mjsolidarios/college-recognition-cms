import {
  resolveAcademicEntryFlowPositions,
  resolveCoreSectionFlowPositions,
  resolveNonAcademicEntryFlowPositions,
  resolveProgramRowFlowPositions,
} from '@/lib/layout'
import { normalizeFlowPosition, snapFlowPosition } from '@/lib/flow-position'
import type { CmsPage, CmsSettings } from '@/types/cms'

export type LayoutItemFlowReflowCommand = {
  pageId: string
  movedItemId: string
  before: Record<string, number | undefined>
  after: Record<string, number | undefined>
}

/** @deprecated Use LayoutItemFlowReflowCommand */
export type SectionFlowReflowCommand = LayoutItemFlowReflowCommand

export type PageMutationCommand = {
  pageId: string
  before: CmsPage
  after: CmsPage
}

export type UndoRedoCommand =
  | { type: 'layoutFlow'; data: LayoutItemFlowReflowCommand }
  | { type: 'pageMutation'; data: PageMutationCommand }

export function flowPositionsEqual(a: number | undefined, b: number | undefined): boolean {
  return normalizeFlowPosition(a) === normalizeFlowPosition(b)
}

export function snapshotPageLayoutFlows(page: CmsPage): Record<string, number | undefined> {
  switch (page.type) {
    case 'core':
      return Object.fromEntries(
        page.content.sections.map((section) => [section.id, normalizeFlowPosition(section.flowPosition)]),
      )
    case 'program':
      return Object.fromEntries(
        page.content.rows.map((row) => [row.id, normalizeFlowPosition(row.flowPosition)]),
      )
    case 'academic':
      return Object.fromEntries(
        page.content.entries.map((entry) => [entry.id, normalizeFlowPosition(entry.flowPosition)]),
      )
    case 'non-academic':
      return Object.fromEntries(
        page.content.entries.map((entry) => [entry.id, normalizeFlowPosition(entry.flowPosition)]),
      )
  }
}

export function layoutFlowSnapshotsEqual(
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

function resolvePageLayoutFlows(
  page: CmsPage,
  settings: CmsSettings,
  overrides: Record<string, number>,
): Map<string, number> {
  switch (page.type) {
    case 'core':
      return resolveCoreSectionFlowPositions(page, settings, overrides)
    case 'program':
      return resolveProgramRowFlowPositions(page, settings, overrides)
    case 'academic':
      return resolveAcademicEntryFlowPositions(page, settings, overrides)
    case 'non-academic':
      return resolveNonAcademicEntryFlowPositions(page, settings, overrides)
  }
}

export function applyPageLayoutFlowMap(
  pages: CmsPage[],
  pageId: string,
  flows: Record<string, number | undefined>,
): CmsPage[] {
  return pages.map((page) => {
    if (page.id !== pageId) {
      return page
    }
    switch (page.type) {
      case 'core':
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
      case 'program':
        return {
          ...page,
          content: {
            ...page.content,
            rows: page.content.rows.map((row) => {
              const flow = flows[row.id]
              if (flow === undefined) {
                const { flowPosition: _removed, ...rest } = row
                return rest
              }
              return { ...row, flowPosition: snapFlowPosition(flow) }
            }),
          },
        }
      case 'academic':
        return {
          ...page,
          content: {
            ...page.content,
            entries: page.content.entries.map((entry) => {
              const flow = flows[entry.id]
              if (flow === undefined) {
                const { flowPosition: _removed, ...rest } = entry
                return rest
              }
              return { ...entry, flowPosition: snapFlowPosition(flow) }
            }),
          },
        }
      case 'non-academic':
        return {
          ...page,
          content: {
            ...page.content,
            entries: page.content.entries.map((entry) => {
              const flow = flows[entry.id]
              if (flow === undefined) {
                const { flowPosition: _removed, ...rest } = entry
                return rest
              }
              return { ...entry, flowPosition: snapFlowPosition(flow) }
            }),
          },
        }
    }
  })
}

export function pageHasLayoutItems(page: CmsPage | undefined): boolean {
  if (!page) {
    return false
  }
  switch (page.type) {
    case 'core':
      return page.content.sections.length > 0
    case 'program':
      return page.content.rows.length > 0
    case 'academic':
    case 'non-academic':
      return page.content.entries.length > 0
  }
}

export function pageContainsLayoutItem(page: CmsPage, itemId: string): boolean {
  switch (page.type) {
    case 'core':
      return page.content.sections.some((section) => section.id === itemId)
    case 'program':
      return page.content.rows.some((row) => row.id === itemId)
    case 'academic':
    case 'non-academic':
      return page.content.entries.some((entry) => entry.id === itemId)
  }
}

export function repositionLayoutItemWithReflow(
  pages: CmsPage[],
  pageId: string,
  itemId: string,
  flowPosition: number,
  settings: CmsSettings,
): { pages: CmsPage[]; before: Record<string, number | undefined>; after: Record<string, number | undefined> } | null {
  const page = pages.find((entry) => entry.id === pageId)
  if (!page || !pageContainsLayoutItem(page, itemId)) {
    return null
  }

  const before = snapshotPageLayoutFlows(page)
  const resolved = resolvePageLayoutFlows(page, settings, { [itemId]: snapFlowPosition(flowPosition) })
  const after = Object.fromEntries(resolved.entries()) as Record<string, number | undefined>

  if (layoutFlowSnapshotsEqual(before, after)) {
    return null
  }

  return {
    pages: applyPageLayoutFlowMap(pages, pageId, after),
    before,
    after,
  }
}

/** @deprecated Use repositionLayoutItemWithReflow */
export const repositionCoreSectionWithReflow = repositionLayoutItemWithReflow

/** @deprecated Use applyPageLayoutFlowMap */
export const applyCoreSectionFlowMap = applyPageLayoutFlowMap
