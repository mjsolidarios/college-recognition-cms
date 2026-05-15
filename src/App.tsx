import { Download, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'

import { CanvasPreview } from '@/components/canvas-preview'
import { PageEditor } from '@/components/page-editor'
import { PageList } from '@/components/page-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-6 px-4 py-4 xl:px-6">
        <header className="rounded-2xl border border-stone-200 bg-white px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">School recognition CMS</p>
              <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Auto-layout recognition booklet builder</h1>
              <p className="max-w-3xl text-sm text-stone-600">
                Build ceremony programs, academic and non-academic award pages, and core booklet content with live pagination, SVG export, and multi-page PDF output.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} className="sm:w-72" />
              <Button type="button" variant="outline" onClick={handleReset}>
                <RefreshCw className="size-4" />
                Reset seed data
              </Button>
              <Button type="button" variant="outline" onClick={handleExportSvg}>
                <Download className="size-4" />
                Export SVG
              </Button>
              <Button type="button" onClick={handleExportPdf} disabled={isExporting}>
                <Download className="size-4" />
                {isExporting ? 'Exporting…' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_380px]">
          <PageList
            pages={pages}
            activePageId={activePage?.id ?? ''}
            onSelect={setActivePageId}
            onAdd={handleAddPage}
            onDelete={handleDeletePage}
            onReorder={handleReorder}
          />

          <CanvasPreview pages={pages} settings={settings} />

          <Tabs defaultValue="editor" className="min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="min-h-0">
              <ScrollArea className="h-[calc(100vh-16rem)] xl:h-[calc(100vh-13.5rem)]">
                {activePage ? <PageEditor page={activePage} onChange={handlePageChange} /> : null}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="settings" className="min-h-0">
              <ScrollArea className="h-[calc(100vh-16rem)] xl:h-[calc(100vh-13.5rem)]">
                <Card>
                  <CardHeader>
                    <CardTitle>Layout settings</CardTitle>
                    <CardDescription>Adjust global and section-level type scales for the live layout.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      ['globalScale', 'Global scale', 0.8, 1.4, 0.05],
                      ['titleSize', 'Title size', 14, 28, 0.5],
                      ['subtitleSize', 'Subtitle size', 10, 18, 0.5],
                      ['headingSize', 'Section heading size', 10, 18, 0.5],
                      ['bodySize', 'Body size', 9, 16, 0.25],
                      ['metaSize', 'Meta size', 8, 14, 0.25],
                      ['pageNumberSize', 'Page number size', 8, 14, 0.25],
                      ['pagePaddingTop', 'Top padding', 24, 72, 1],
                      ['pagePaddingBottom', 'Bottom padding', 20, 72, 1],
                      ['pagePaddingX', 'Side padding', 24, 72, 1],
                      ['columnGap', 'Column gap', 16, 48, 1],
                      ['lineHeight', 'Line height', 1.1, 1.8, 0.05],
                    ].map(([key, label, min, max, step]) => (
                      <div key={String(key)} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-sm font-medium text-stone-800">{label}</label>
                          <span className="text-xs text-stone-500">{String(settings[key as keyof CmsSettings])}</span>
                        </div>
                        <input
                          type="range"
                          min={Number(min)}
                          max={Number(max)}
                          step={Number(step)}
                          value={Number(settings[key as keyof CmsSettings])}
                          onChange={(event) => updateSetting(key as keyof CmsSettings, Number(event.target.value) as never)}
                          className="w-full"
                        />
                      </div>
                    ))}
                    <label className="flex items-center gap-3 rounded-lg border border-stone-200 px-3 py-3 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={settings.showPageNumbers}
                        onChange={(event) => updateSetting('showPageNumbers', event.target.checked)}
                      />
                      Show page numbers
                    </label>
                  </CardContent>
                </Card>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default App
