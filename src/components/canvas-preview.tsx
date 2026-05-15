import { ZoomIn, ZoomOut } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Canvas Preview</CardTitle>
          <CardDescription>
            Fixed {PAGE_WIDTH} × {PAGE_HEIGHT} layout with automatic pagination.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => setZoom((current) => Math.max(0.45, current - 0.1))}>
            <ZoomOut className="size-4" />
          </Button>
          <span className="w-14 text-center text-sm font-medium text-stone-600">{Math.round(zoom * 100)}%</span>
          <Button type="button" variant="outline" size="icon" onClick={() => setZoom((current) => Math.min(1.35, current + 0.1))}>
            <ZoomIn className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        <ScrollArea className="h-full rounded-b-xl bg-stone-100">
          <div className="flex min-h-full justify-center p-6">
            <div className="space-y-6">
              {renderedPages.map((page) => (
                <div
                  key={page.id}
                  className="relative bg-white"
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
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
