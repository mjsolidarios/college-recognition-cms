import { Minus, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

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
  const renderedPages = useMemo(() => renderDocument(pages, settings), [pages, settings])

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-stone-200/80 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Canvas Preview</h2>
          <p className="text-xs text-stone-400">
            {PAGE_WIDTH} × {PAGE_HEIGHT} · {renderedPages.length} rendered page{renderedPages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setZoom((current) => Math.max(0.45, +(current - 0.1).toFixed(2)))}
          >
            <Minus className="size-3.5" />
          </Button>
          <div className="relative h-1.5 w-20 rounded-full bg-stone-100">
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
            onClick={() => setZoom((current) => Math.min(1.35, +(current + 0.1).toFixed(2)))}
          >
            <Plus className="size-3.5" />
          </Button>
          <span className="ml-1 w-10 text-center text-[11px] font-medium tabular-nums text-stone-400">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-full rounded-b-xl">
          <div className="canvas-pattern flex min-h-full justify-center px-6 py-8">
            <div className="space-y-6">
              {renderedPages.map((page, pageIndex) => (
                <div key={page.id} className="animate-fade-in" style={{ animationDelay: `${pageIndex * 40}ms` }}>
                  {/* Page */}
                  <div
                    className="relative bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.05)] transition-[width,height] duration-200"
                    style={{ width: PAGE_WIDTH * zoom, height: PAGE_HEIGHT * zoom }}
                  >
                    {page.blocks.map((block) => (
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
                  {/* Page label */}
                  <div className="mt-2 text-center text-[10px] font-medium tabular-nums text-stone-400">
                    {pageIndex + 1} / {renderedPages.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
