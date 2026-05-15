import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { renderDocument } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { PAGE_HEIGHT, PAGE_WIDTH, type CmsPage, type CmsSettings } from '@/types/cms'

export function CanvasPreview({
  pages,
  settings,
}: {
  pages: CmsPage[]
  settings: CmsSettings
}) {
  const [zoom, setZoom] = useState(0.85)
  const [currentPageIdx, setCurrentPageIdx] = useState(0)
  const renderedPages = useMemo(() => renderDocument(pages, settings), [pages, settings])
  const pageCount = renderedPages.length

  // Keep current page in bounds when pages are added/removed
  useEffect(() => {
    setCurrentPageIdx((prev) => Math.min(prev, Math.max(0, pageCount - 1)))
  }, [pageCount])

  const safeIdx = Math.min(currentPageIdx, Math.max(0, pageCount - 1))
  const currentPage = renderedPages[safeIdx]

  const goToPrev = () => setCurrentPageIdx((i) => Math.max(0, i - 1))
  const goToNext = () => setCurrentPageIdx((i) => Math.min(pageCount - 1, i + 1))

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-stone-200/80 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-4 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-stone-900">Canvas Preview</h2>
          <p className="truncate text-xs text-stone-400">
            {PAGE_WIDTH} × {PAGE_HEIGHT} · {pageCount} rendered page{pageCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={safeIdx === 0}
            onClick={goToPrev}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="min-w-[3.5rem] text-center text-[11px] font-semibold tabular-nums text-stone-600">
            {pageCount > 0 ? `${safeIdx + 1} / ${pageCount}` : '–'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={safeIdx >= pageCount - 1}
            onClick={goToNext}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setZoom((z) => Math.max(0.45, +(z - 0.1).toFixed(2)))}
          >
            <Minus className="size-3.5" />
          </Button>
          <div className="relative h-1.5 w-16 rounded-full bg-stone-100">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-indigo-400/60 transition-all duration-200"
              style={{ width: `${((zoom - 0.45) / (1.35 - 0.45)) * 100}%` }}
            />
            <input
              type="range"
              min={0.45}
              max={1.35}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setZoom((z) => Math.min(1.35, +(z + 0.1).toFixed(2)))}
          >
            <Plus className="size-3.5" />
          </Button>
          <span className="w-9 text-center text-[11px] font-medium tabular-nums text-stone-400">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="min-h-0 flex-1 border-b border-stone-100">
        <ScrollArea className="h-full">
          <div className="canvas-pattern flex min-h-full items-start justify-center px-6 py-8">
            {currentPage ? (
              <div className={cn('animate-fade-in flex flex-col items-center gap-3')}>
                <div
                  className="relative bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.05)]"
                  style={{ width: PAGE_WIDTH * zoom, height: PAGE_HEIGHT * zoom }}
                >
                  {currentPage.blocks.map((block) => (
                    <div
                      key={block.id}
                      className={cn('absolute whitespace-pre-wrap text-stone-950', block.uppercase && 'uppercase')}
                      style={{
                        left: block.x * zoom,
                        top: block.y * zoom,
                        width: block.width * zoom,
                        fontSize: block.fontSize * zoom,
                        lineHeight: `${block.lineHeight * zoom}px`,
                        fontWeight: block.fontWeight,
                        fontStyle: block.fontStyle,
                        letterSpacing: `${(block.letterSpacing ?? 0) * zoom}px`,
                        textAlign: block.align,
                        fontFamily: 'Georgia, Times New Roman, serif',
                      }}
                    >
                      {block.lines.join('\n')}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-12 text-sm text-stone-400">No pages to preview.</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-stone-50 rounded-b-xl">
        <div className="text-xs font-medium text-stone-500">
          Page {pageCount > 0 ? safeIdx + 1 : 0} of {pageCount}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs text-stone-600 hover:text-stone-900"
            disabled={safeIdx === 0 || pageCount === 0}
            onClick={goToPrev}
          >
            <ChevronLeft className="mr-1 size-3.5" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs text-stone-600 hover:text-stone-900"
            disabled={safeIdx >= pageCount - 1 || pageCount === 0}
            onClick={goToNext}
          >
            Next
            <ChevronRight className="ml-1 size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
