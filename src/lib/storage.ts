import { defaultSettings, seedPages } from '@/lib/sample-data'
import { isValidFlowPosition, normalizeFlowPosition } from '@/lib/flow-position'
import type { CmsPage, CmsSettings, CorePage } from '@/types/cms'

const PAGES_KEY = 'cms_v1_pages'
const SETTINGS_KEY = 'cms_v1_settings'
const FRONT_COVER_KEY = 'cms_v1_front_cover'
const BACK_COVER_KEY = 'cms_v1_back_cover'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback
  }

  const rawValue = window.localStorage.getItem(key)

  if (!rawValue) {
    return fallback
  }

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function normalizeNewlines(text: string) {
  return text.replace(/\r\n/g, '\n')
}

/** Legacy Dean section lumped secretary into the body; split when missing a College Secretary section. */
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

/** Remove a trailing lone "Dean" line — it duplicates the section title and sits above the next section (e.g. College Secretary). */
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

export function getPages(): CmsPage[] {
  // TODO: replace with Supabase.
  const pages = readJson<CmsPage[]>(PAGES_KEY, seedPages)
  let effective = [...pages].sort((a, b) => a.order - b.order)

  let anyChanged = false
  const secretaryResult = migrateCollegeOfficialsSecretarySection(effective)
  effective = secretaryResult.pages
  anyChanged ||= secretaryResult.changed

  const stripDeanResult = migrateStripTrailingDeanFromTitleSection(effective)
  effective = stripDeanResult.pages
  anyChanged ||= stripDeanResult.changed

  const flowPositionResult = migrateCoreSectionFlowPosition(effective)
  effective = flowPositionResult.pages
  anyChanged ||= flowPositionResult.changed

  if (anyChanged && canUseStorage()) {
    writeJson(PAGES_KEY, effective)
  }

  if (!canUseStorage() || window.localStorage.getItem(PAGES_KEY)) {
    return [...effective].sort((left, right) => left.order - right.order)
  }

  writeJson(PAGES_KEY, seedPages)
  return [...seedPages]
}

export function savePage(page: CmsPage): CmsPage[] {
  // TODO: replace with Supabase.
  const pages = getPages()
  const existingIndex = pages.findIndex((entry) => entry.id === page.id)

  if (existingIndex >= 0) {
    pages[existingIndex] = page
  } else {
    pages.push(page)
  }

  const nextPages = [...pages].sort((left, right) => left.order - right.order)
  writeJson(PAGES_KEY, nextPages)
  return nextPages
}

export function deletePage(pageId: string): CmsPage[] {
  // TODO: replace with Supabase.
  const nextPages = getPages().filter((page) => page.id !== pageId)
  writeJson(PAGES_KEY, nextPages)
  return nextPages
}

export function getSettings(): CmsSettings {
  // TODO: replace with Supabase.
  const settings = readJson<CmsSettings>(SETTINGS_KEY, defaultSettings)

  if (!canUseStorage() || window.localStorage.getItem(SETTINGS_KEY)) {
    return { ...defaultSettings, ...settings }
  }

  writeJson(SETTINGS_KEY, defaultSettings)
  return { ...defaultSettings }
}

export function saveSettings(settings: CmsSettings): CmsSettings {
  // TODO: replace with Supabase.
  writeJson(SETTINGS_KEY, settings)
  return settings
}

export function getFrontCover(): string | null {
  if (!canUseStorage()) return null
  return window.localStorage.getItem(FRONT_COVER_KEY)
}

export function saveFrontCover(dataUrl: string | null): void {
  if (!canUseStorage()) return
  if (dataUrl === null) {
    window.localStorage.removeItem(FRONT_COVER_KEY)
  } else {
    window.localStorage.setItem(FRONT_COVER_KEY, dataUrl)
  }
}

export function getBackCover(): string | null {
  if (!canUseStorage()) return null
  return window.localStorage.getItem(BACK_COVER_KEY)
}

export function saveBackCover(dataUrl: string | null): void {
  if (!canUseStorage()) return
  if (dataUrl === null) {
    window.localStorage.removeItem(BACK_COVER_KEY)
  } else {
    window.localStorage.setItem(BACK_COVER_KEY, dataUrl)
  }
}
