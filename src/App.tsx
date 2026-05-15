import { ChevronDown, Download, FileImage, FileText, RefreshCw, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

import { CanvasPreview } from '@/components/canvas-preview'
import { PageEditor } from '@/components/page-editor'
import { PageList } from '@/components/page-list'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { renderDocument } from '@/lib/layout'
import { defaultSettings, seedPages } from '@/lib/sample-data'
import { deletePage, getPages, getSettings, savePage, saveSettings } from '@/lib/storage'
import { exportPdfDocument, exportSvgDocument } from '@/lib/exporters'
import type { CmsPage, CmsSettings, PageType } from '@/types/cms'

const PAGE_LABELS: Record<PageType, string> = {
  core: 'Core Page',
  program: 'Program',
  academic: 'Academic Awards',
  'non-academic': 'Non-Academic Awards',
}

function createBlankPage(pageType: PageType, order: number): CmsPage {
  switch (pageType) {
    case 'program':
      return {
        id: crypto.randomUUID(),
        order,
        type: 'program',
        title: PAGE_LABELS[pageType],
        content: {
          heading: 'PROGRAM',
          rows: [
            {
              id: crypto.randomUUID(),
              leftTitle: 'Opening number',
              leftBody: 'Describe the opening sequence.',
              rightTitle: 'Support details',
              rightBody: 'Use this column for presenters, awarders, or notes.',
            },
          ],
        },
      }
    case 'academic':
      return {
        id: crypto.randomUUID(),
        order,
        type: 'academic',
        title: PAGE_LABELS[pageType],
        content: {
          heading: 'ACADEMIC AWARDEES',
          entries: [
            {
              id: crypto.randomUUID(),
              name: 'New awardee',
              award: 'Bachelor of Science in Information Technology',
              category: 'Gold Medals',
              gradeLevel: '4th Year Curriculum',
            },
          ],
        },
      }
    case 'non-academic':
      return {
        id: crypto.randomUUID(),
        order,
        type: 'non-academic',
        title: PAGE_LABELS[pageType],
        content: {
          heading: 'NON-ACADEMIC AWARDEES',
          entries: [
            {
              id: crypto.randomUUID(),
              name: 'New awardee',
              award: 'Leadership Award',
              category: 'Individual Honors',
            },
          ],
        },
      }
    case 'core':
      return {
        id: crypto.randomUUID(),
        order,
        type: 'core',
        title: PAGE_LABELS[pageType],
        content: {
          heading: 'COLLEGE RECOGNITION PROGRAM',
          subheading: 'Welcome message or general content',
          sections: [
            {
              id: crypto.randomUUID(),
              title: 'Section title',
              body: 'Write the section body here.',
            },
          ],
        },
      }
  }
}

function reorderPages(pages: CmsPage[], activeId: string, overId: string) {
  const orderedPages = [...pages].sort((left, right) => left.order - right.order)
  const activeIndex = orderedPages.findIndex((page) => page.id === activeId)
  const overIndex = orderedPages.findIndex((page) => page.id === overId)

  if (activeIndex < 0 || overIndex < 0) {
    return orderedPages
  }

  const [activePage] = orderedPages.splice(activeIndex, 1)
  orderedPages.splice(overIndex, 0, activePage)

  return orderedPages.map((page, index) => ({ ...page, order: index }))
}

/* ── Settings panel sub-components ───────────────────────── */

function SettingsGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg border border-stone-200/80 bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 text-left cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">{title}</span>
        <ChevronDown className={`size-3.5 text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="animate-fade-in space-y-3 border-t border-stone-100 px-3 pb-3 pt-2">
          {children}
        </div>
      )}
    </div>
  )
}

function SliderSetting({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-medium text-stone-600">{label}</label>
        <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-indigo-600">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </div>
  )
}

/* ── Main App ────────────────────────────────────────────── */

function App() {
  const [pages, setPages] = useState<CmsPage[]>(() => getPages())
  const [settings, setSettings] = useState<CmsSettings>(() => getSettings())
  const [activePageId, setActivePageId] = useState(() => getPages()[0]?.id ?? '')
  const [documentTitle, setDocumentTitle] = useState('College Recognition Program')
  const [isExporting, setIsExporting] = useState(false)

  const activePage = useMemo(
    () => pages.find((page) => page.id === activePageId) ?? pages[0],
    [activePageId, pages],
  )

  const renderedPages = useMemo(() => renderDocument(pages, settings), [pages, settings])

  const persistPages = (nextPages: CmsPage[]) => {
    const orderedPages = [...nextPages].sort((left, right) => left.order - right.order)
    let persistedPages = orderedPages
    orderedPages.forEach((page) => {
      persistedPages = savePage(page)
    })
    setPages(persistedPages)
    setActivePageId((current) => current || persistedPages[0]?.id || '')
  }

  const handlePageChange = (page: CmsPage) => {
    const nextPages = pages.map((entry) => (entry.id === page.id ? page : entry))
    persistPages(nextPages)
  }

  const handleAddPage = (pageType: PageType) => {
    const page = createBlankPage(pageType, pages.length)
    persistPages([...pages, page])
    setActivePageId(page.id)
  }

  const handleDeletePage = (pageId: string) => {
    const nextPages = deletePage(pageId).map((page, index) => ({ ...page, order: index }))
    persistPages(nextPages)
    setActivePageId((current) => (current === pageId ? nextPages[0]?.id ?? '' : current))
  }

  const handleReorder = (activeId: string, overId: string) => {
    persistPages(reorderPages(pages, activeId, overId))
  }

  const updateSetting = <K extends keyof CmsSettings>(key: K, value: CmsSettings[K]) => {
    const nextSettings = { ...settings, [key]: value }
    setSettings(saveSettings(nextSettings))
  }

  const handleReset = () => {
    pages.forEach((page) => {
      deletePage(page.id)
    })
    persistPages(seedPages)
    setSettings(saveSettings(defaultSettings))
    setActivePageId(seedPages[0].id)
  }

  const handleExportPdf = async () => {
    setIsExporting(true)
    try {
      await exportPdfDocument(renderedPages, documentTitle)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSvg = () => {
    exportSvgDocument(renderedPages, documentTitle)
  }

  return (
    <div className="min-h-screen bg-[var(--surface-app)] text-stone-950">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-4 px-4 py-3 xl:px-5">
        {/* ── Header ──────────────────────────────────────── */}
        <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white shadow-lg shadow-indigo-950/10">
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-indigo-400/5 blur-2xl" />

          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-indigo-400" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300">
                  Recognition CMS
                </p>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Booklet Builder
              </h1>
              <p className="max-w-xl text-sm text-indigo-200/70">
                Build ceremony programs, award pages, and core content with live pagination and export.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              {/* Document title */}
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-indigo-300/60" />
                <input
                  value={documentTitle}
                  onChange={(event) => setDocumentTitle(event.target.value)}
                  className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-indigo-300/40 backdrop-blur-sm transition-all duration-200 focus:border-indigo-400/40 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 sm:w-64"
                  placeholder="Document title"
                />
              </div>

              <div className="h-6 w-px bg-white/10 hidden sm:block" />

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-indigo-200/80 hover:bg-white/10 hover:text-white"
                  onClick={handleReset}
                >
                  <RefreshCw className="size-3.5" />
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-indigo-200/80 hover:bg-white/10 hover:text-white"
                  onClick={handleExportSvg}
                >
                  <FileImage className="size-3.5" />
                  SVG
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-indigo-500 text-white shadow-md shadow-indigo-500/30 hover:bg-indigo-400"
                  onClick={handleExportPdf}
                  disabled={isExporting}
                >
                  <Download className="size-3.5" />
                  {isExporting ? 'Exporting…' : 'Export PDF'}
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom accent bar */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
        </header>

        {/* ── Main grid ───────────────────────────────────── */}
        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <PageList
            pages={pages}
            activePageId={activePage?.id ?? ''}
            onSelect={setActivePageId}
            onAdd={handleAddPage}
            onDelete={handleDeletePage}
            onReorder={handleReorder}
          />

          <CanvasPreview pages={pages} settings={settings} />

          {/* ── Right panel ─────────────────────────────── */}
          <Tabs defaultValue="editor" className="min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="min-h-0">
              <ScrollArea className="h-[calc(100vh-14rem)] xl:h-[calc(100vh-11.5rem)]">
                {activePage ? <PageEditor page={activePage} onChange={handlePageChange} /> : null}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="settings" className="min-h-0">
              <ScrollArea className="h-[calc(100vh-14rem)] xl:h-[calc(100vh-11.5rem)]">
                <div className="space-y-3 pb-2">
                  {/* Scale */}
                  <SettingsGroup title="Scale">
                    <SliderSetting
                      label="Global scale"
                      value={settings.globalScale}
                      min={0.8} max={1.4} step={0.05}
                      unit="×"
                      onChange={(v) => updateSetting('globalScale', v)}
                    />
                  </SettingsGroup>

                  {/* Typography */}
                  <SettingsGroup title="Typography">
                    <SliderSetting
                      label="Title size"
                      value={settings.titleSize}
                      min={14} max={28} step={0.5}
                      unit="px"
                      onChange={(v) => updateSetting('titleSize', v)}
                    />
                    <SliderSetting
                      label="Subtitle size"
                      value={settings.subtitleSize}
                      min={10} max={18} step={0.5}
                      unit="px"
                      onChange={(v) => updateSetting('subtitleSize', v)}
                    />
                    <SliderSetting
                      label="Section heading"
                      value={settings.headingSize}
                      min={10} max={18} step={0.5}
                      unit="px"
                      onChange={(v) => updateSetting('headingSize', v)}
                    />
                    <SliderSetting
                      label="Body size"
                      value={settings.bodySize}
                      min={9} max={16} step={0.25}
                      unit="px"
                      onChange={(v) => updateSetting('bodySize', v)}
                    />
                    <SliderSetting
                      label="Meta size"
                      value={settings.metaSize}
                      min={8} max={14} step={0.25}
                      unit="px"
                      onChange={(v) => updateSetting('metaSize', v)}
                    />
                    <SliderSetting
                      label="Page number size"
                      value={settings.pageNumberSize}
                      min={8} max={14} step={0.25}
                      unit="px"
                      onChange={(v) => updateSetting('pageNumberSize', v)}
                    />
                    <SliderSetting
                      label="Line height"
                      value={settings.lineHeight}
                      min={1.1} max={1.8} step={0.05}
                      unit="×"
                      onChange={(v) => updateSetting('lineHeight', v)}
                    />
                  </SettingsGroup>

                  {/* Layout */}
                  <SettingsGroup title="Layout">
                    <SliderSetting
                      label="Top padding"
                      value={settings.pagePaddingTop}
                      min={24} max={72} step={1}
                      unit="px"
                      onChange={(v) => updateSetting('pagePaddingTop', v)}
                    />
                    <SliderSetting
                      label="Bottom padding"
                      value={settings.pagePaddingBottom}
                      min={20} max={72} step={1}
                      unit="px"
                      onChange={(v) => updateSetting('pagePaddingBottom', v)}
                    />
                    <SliderSetting
                      label="Side padding"
                      value={settings.pagePaddingX}
                      min={24} max={72} step={1}
                      unit="px"
                      onChange={(v) => updateSetting('pagePaddingX', v)}
                    />
                    <SliderSetting
                      label="Column gap"
                      value={settings.columnGap}
                      min={16} max={48} step={1}
                      unit="px"
                      onChange={(v) => updateSetting('columnGap', v)}
                    />
                  </SettingsGroup>

                  {/* Display */}
                  <SettingsGroup title="Display">
                    <label className="flex items-center justify-between gap-3 rounded-lg py-1 text-xs font-medium text-stone-600">
                      Show page numbers
                      <span className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={settings.showPageNumbers}
                          onChange={(event) => updateSetting('showPageNumbers', event.target.checked)}
                        />
                        <span className="toggle-track" />
                      </span>
                    </label>
                  </SettingsGroup>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default App
