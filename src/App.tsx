import { BookOpen, ChevronDown, Download, FileImage, FileText, GripVertical, LayoutGrid, Pencil, RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'

import { CanvasPreview } from '@/components/canvas-preview'
import { ExportDialog, ImportDialog } from '@/components/import-export-dialog'
import { PageEditor } from '@/components/page-editor'
import { PageList } from '@/components/page-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

type MobileTab = 'pages' | 'canvas' | 'editor'

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
    <div className="rounded-lg border border-[var(--color-hairline)] bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 text-left cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">{title}</span>
        <ChevronDown className={`size-3.5 text-[var(--color-muted-soft)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="animate-fade-in space-y-3 border-t border-[var(--color-hairline-soft)] px-3 pb-3 pt-2">
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
        <label className="text-xs font-medium text-[var(--color-body)]">{label}</label>
        <span className="rounded bg-[var(--surface-canvas)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--color-primary)]">
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

const MIN_EDITOR_WIDTH = 280
const MAX_EDITOR_WIDTH = 560
const DEFAULT_EDITOR_WIDTH = 360
/** Wait two animation frames so React can commit and the browser can paint the exporting state. */
const waitForUiUpdate = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

function App() {
  const [pages, setPages] = useState<CmsPage[]>(() => getPages())
  const [settings, setSettings] = useState<CmsSettings>(() => getSettings())
  const [activePageId, setActivePageId] = useState(() => getPages()[0]?.id ?? '')
  const [documentTitle, setDocumentTitle] = useState('College Recognition Program')
  const [isExporting, setIsExporting] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('canvas')
  const [editorWidth, setEditorWidth] = useState(DEFAULT_EDITOR_WIDTH)
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const [previewPageIndex, setPreviewPageIndex] = useState(0)

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
    setPreviewPageIndex(0)
  }

  const handleExportPdf = async () => {
    setIsExporting(true)
    try {
      await waitForUiUpdate()
      await exportPdfDocument(renderedPages, documentTitle)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSvg = () => {
    const maxIdx = Math.max(0, renderedPages.length - 1)
    const idx = Math.min(Math.max(0, previewPageIndex), maxIdx)
    const page = renderedPages[idx]
    if (!page) {
      return
    }
    exportSvgDocument([page], documentTitle)
  }

  const handleImport = (importedPages: CmsPage[], importedSettings?: CmsSettings, importedTitle?: string) => {
    // Clear existing pages from storage first
    pages.forEach((page) => deletePage(page.id))
    persistPages(importedPages)
    if (importedSettings) {
      setSettings(saveSettings(importedSettings))
    }
    if (importedTitle) {
      setDocumentTitle(importedTitle)
    }
    setActivePageId(importedPages[0]?.id ?? '')
    setPreviewPageIndex(0)
  }

  /* ── Resize drag handle ─────────────────────────────────── */
  const handleDragMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startWidth: editorWidth }
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = dragRef.current.startX - ev.clientX
      setEditorWidth(Math.max(MIN_EDITOR_WIDTH, Math.min(MAX_EDITOR_WIDTH, dragRef.current.startWidth + delta)))
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [editorWidth])

  /* ── Mobile page-list callbacks ────────────────────────── */
  const handleMobileSelect = useCallback((id: string) => {
    setActivePageId(id)
    setMobileTab('canvas')
  }, [])

  const handleMobileAdd = useCallback((type: PageType) => {
    handleAddPage(type)
    setMobileTab('canvas')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Shared editor/settings panel ──────────────────────── */
  const EditorSettingsPanel = (
    <Tabs defaultValue="editor" className="min-h-0 flex flex-col h-full">
      <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
        <TabsTrigger value="editor">Editor</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="editor" className="min-h-0 flex-1">
        <ScrollArea className="h-[calc(100vh-14rem)] xl:h-[calc(100vh-11rem)]">
          {activePage ? <PageEditor page={activePage} onChange={handlePageChange} /> : null}
        </ScrollArea>
      </TabsContent>
      <TabsContent value="settings" className="min-h-0 flex-1">
        <ScrollArea className="h-[calc(100vh-14rem)] xl:h-[calc(100vh-11rem)]">
          <div className="space-y-3 pb-2">
            {/* Document */}
            <SettingsGroup title="Document">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--color-body)]">Academic year</label>
                <Input
                  value={settings.documentYear}
                  onChange={(e) => updateSetting('documentYear', e.target.value)}
                  placeholder="e.g. 2024–2025"
                  className="h-10 text-xs"
                />
              </div>
            </SettingsGroup>

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
              <label className="flex items-center justify-between gap-3 rounded-lg py-1 text-xs font-medium text-[var(--color-body)]">
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
  )

  return (
    <div className="min-h-screen bg-[var(--surface-app)] text-[var(--color-ink)]">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-3 px-3 py-3 xl:px-5">

        {/* ── Header ──────────────────────────────────────── */}
        <header className="rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">

            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--color-hairline)] bg-[var(--surface-canvas)]">
                <BookOpen className="size-4.5 text-[var(--color-primary)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold tracking-tight text-[var(--color-ink)]">Booklet Builder</h1>
                  {settings.documentYear && (
                    <span className="rounded-full border border-[var(--color-hairline-strong)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink)]">
                      {settings.documentYear}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--color-muted)]">College Recognition CMS</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Document title */}
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-muted)]" />
                <input
                  value={documentTitle}
                  onChange={(event) => setDocumentTitle(event.target.value)}
                  className="h-10 w-48 rounded-md border border-[var(--color-hairline)] bg-[var(--surface-canvas)] pl-9 pr-3 text-xs text-[var(--color-ink)] placeholder:text-[var(--color-muted-soft)] transition-colors focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)] sm:w-56"
                  placeholder="Document title"
                />
              </div>

              <div className="hidden h-5 w-px bg-[var(--color-hairline)] sm:block" />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 border border-[var(--color-hairline)] bg-white px-3 text-xs text-[var(--color-body)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--surface-canvas)] hover:text-[var(--color-ink)]"
                onClick={handleReset}
              >
                <RefreshCw className="size-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 border border-[var(--color-hairline)] bg-white px-3 text-xs text-[var(--color-body)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--surface-canvas)] hover:text-[var(--color-ink)]"
                onClick={handleExportSvg}
              >
                <FileImage className="size-3.5" />
                <span className="hidden sm:inline">SVG</span>
              </Button>
              <ExportDialog pages={pages} settings={settings} title={documentTitle} />
              <ImportDialog pages={pages} onImport={handleImport} />
              <Button
                type="button"
                size="sm"
                className="h-9 px-3 text-xs"
                onClick={handleExportPdf}
                disabled={isExporting}
              >
                <Download className="size-3.5" />
                {isExporting ? 'Exporting…' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </header>

        {/* ── Mobile tab bar ──────────────────────────────── */}
        <div className="flex rounded-lg border border-[var(--color-hairline)] bg-white p-1 xl:hidden">
          {(
            [
              { key: 'pages', label: 'Pages', icon: LayoutGrid },
              { key: 'canvas', label: 'Canvas', icon: BookOpen },
              { key: 'editor', label: 'Editor', icon: Pencil },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMobileTab(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors ${
                mobileTab === key
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-muted)] hover:bg-[var(--surface-canvas)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Main grid – desktop ──────────────────────────── */}
        <div
          className="hidden min-h-0 flex-1 gap-3 xl:flex"
          style={{ minHeight: 'calc(100vh - 9rem)' }}
        >
          {/* Page list */}
          <div className="w-[280px] flex-shrink-0">
            <PageList
              pages={pages}
              activePageId={activePage?.id ?? ''}
              onSelect={setActivePageId}
              onAdd={handleAddPage}
              onDelete={handleDeletePage}
              onReorder={handleReorder}
            />
          </div>

          {/* Canvas */}
          <div className="min-w-0 flex-1">
            <CanvasPreview
              renderedPages={renderedPages}
              previewPageIndex={previewPageIndex}
              onPreviewPageChange={setPreviewPageIndex}
            />
          </div>

          {/* Resize handle */}
          <div
            className="flex w-2 flex-shrink-0 cursor-col-resize items-center justify-center rounded"
            onMouseDown={handleDragMouseDown}
            title="Drag to resize editor"
          >
            <GripVertical className="size-3.5 text-[var(--color-muted-soft)]" />
          </div>

          {/* Editor / Settings */}
          <div className="flex-shrink-0" style={{ width: editorWidth }}>
            {EditorSettingsPanel}
          </div>
        </div>

        {/* ── Main panels – mobile ────────────────────────── */}
        <div className="min-h-0 flex-1 xl:hidden" style={{ minHeight: 'calc(100vh - 12rem)' }}>
          <div className={mobileTab === 'pages' ? 'block h-full' : 'hidden'}>
            <PageList
              pages={pages}
              activePageId={activePage?.id ?? ''}
              onSelect={handleMobileSelect}
              onAdd={handleMobileAdd}
              onDelete={handleDeletePage}
              onReorder={handleReorder}
            />
          </div>
          <div className={mobileTab === 'canvas' ? 'block h-full' : 'hidden'}>
            <CanvasPreview
              renderedPages={renderedPages}
              previewPageIndex={previewPageIndex}
              onPreviewPageChange={setPreviewPageIndex}
            />
          </div>
          <div className={mobileTab === 'editor' ? 'block h-full' : 'hidden'}>
            {EditorSettingsPanel}
          </div>
        </div>

      </div>
    </div>
  )
}

export default App
