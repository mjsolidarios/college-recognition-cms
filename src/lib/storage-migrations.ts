import { isValidFlowPosition, normalizeFlowPosition } from '@/lib/flow-position'
import type { CmsPage, CorePage } from '@/types/cms'

function normalizeNewlines(text: string) {
  return text.replace(/\r\n/g, '\n')
}

function trySplitDeanBodyWithSecretary(body: string): { deanBody: string; secretaryBody: string } | null {
  const text = normalizeNewlines(body).trimEnd()
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  if (blocks.length < 2) return null
  const last = blocks.at(-1)!
  const lines = last.split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  const lastLine = lines.at(-1)!
  if (!/^college\s+secretary$/i.test(lastLine)) return null
  const namePart = lines.slice(0, -1).join('\n').trim()
  if (!namePart) return null
  return {
    deanBody: blocks.slice(0, -1).join('\n\n'),
    secretaryBody: namePart,
  }
}

function migrateCollegeOfficialsSecretarySection(pages: CmsPage[]): { pages: CmsPage[]; changed: boolean } {
  let changed = false

  const insertDefaultSecretaryAfterDean = (core: CorePage): CorePage => {
    const deanIndex = core.content.sections.findIndex(
      (s) => s.id === 'core-officials-dean' || /^dean$/i.test(s.title.trim()),
    )
    if (deanIndex < 0) {
      return core
    }
    const sections = [...core.content.sections]
    sections.splice(deanIndex + 1, 0, {
      id: 'core-officials-secretary',
      title: 'College Secretary',
      body: 'Mr. Neiljan C. Raborar',
    })
    return { ...core, content: { ...core.content, sections } }
  }

  const next = pages.map((page) => {
    if (page.id !== 'core-officials' || page.type !== 'core') {
      return page
    }

    const core = page as CorePage
    const hasSecretarySection = core.content.sections.some(
      (s) => s.id === 'core-officials-secretary' || /^college\s+secretary$/i.test(s.title.trim()),
    )
    if (hasSecretarySection) {
      return page
    }

    const deanIndex = core.content.sections.findIndex(
      (s) => s.id === 'core-officials-dean' || /^dean$/i.test(s.title.trim()),
    )
    if (deanIndex < 0) {
      return page
    }

    const dean = core.content.sections[deanIndex]
    const split = trySplitDeanBodyWithSecretary(dean.body)
    if (split) {
      changed = true
      const deanSection = { ...dean, body: split.deanBody }
      const secretarySection = {
        id: 'core-officials-secretary',
        title: 'College Secretary',
        body: split.secretaryBody,
      }

      const sections = [...core.content.sections]
      sections[deanIndex] = deanSection
      sections.splice(deanIndex + 1, 0, secretarySection)

      return {
        ...core,
        content: { ...core.content, sections },
      }
    }

    changed = true
    return insertDefaultSecretaryAfterDean(core)
  })

  return { pages: next, changed }
}

function stripTrailingDeanRankLine(body: string): string {
  const normalized = normalizeNewlines(body).trimEnd()
  return normalized.replace(/\n\s*Dean\s*$/, '').trimEnd()
}

function migrateStripTrailingDeanFromTitleSection(pages: CmsPage[]): { pages: CmsPage[]; changed: boolean } {
  let changed = false
  const next = pages.map((page) => {
    if (page.type !== 'core') {
      return page
    }
    let sectionChanged = false
    const core = page as CorePage
    const sections = core.content.sections.map((section) => {
      if (!/^dean$/i.test(section.title.trim())) {
        return section
      }
      const stripped = stripTrailingDeanRankLine(section.body)
      if (stripped === section.body) {
        return section
      }
      sectionChanged = true
      return { ...section, body: stripped }
    })
    if (!sectionChanged) {
      return page
    }
    changed = true
    return { ...core, content: { ...core.content, sections } }
  })
  return { pages: next, changed }
}

function migrateCoreSectionFlowPosition(pages: CmsPage[]): { pages: CmsPage[]; changed: boolean } {
  let changed = false
  const stripFlowPosition = (section: { id: string; title: string; body: string }) => ({
    id: section.id,
    title: section.title,
    body: section.body,
  })
  const next = pages.map((page) => {
    if (page.type !== 'core') {
      return page
    }
    let sectionChanged = false
    const sections = page.content.sections.map((section) => {
      if (section.flowPosition === undefined) {
        return section
      }
      if (isValidFlowPosition(section.flowPosition)) {
        const rounded = normalizeFlowPosition(section.flowPosition)
        if (rounded === undefined) {
          sectionChanged = true
          return stripFlowPosition(section)
        }
        if (rounded === section.flowPosition) {
          return section
        }
        sectionChanged = true
        return { ...section, flowPosition: rounded }
      }
      sectionChanged = true
      return stripFlowPosition(section)
    })
    if (!sectionChanged) {
      return page
    }
    changed = true
    return { ...page, content: { ...page.content, sections } }
  })
  return { pages: next, changed }
}

export function migratePages(pages: CmsPage[]): CmsPage[] {
  let effective = [...pages].sort((a, b) => a.order - b.order)

  const secretaryResult = migrateCollegeOfficialsSecretarySection(effective)
  effective = secretaryResult.pages

  const stripDeanResult = migrateStripTrailingDeanFromTitleSection(effective)
  effective = stripDeanResult.pages

  const flowPositionResult = migrateCoreSectionFlowPosition(effective)
  effective = flowPositionResult.pages

  return [...effective].sort((left, right) => left.order - right.order)
}
