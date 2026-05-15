import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { GripVertical, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CmsPage, PageType } from '@/types/cms'

const pageTypeLabels: Record<PageType, string> = {
  program: 'Program',
  academic: 'Academic',
  'non-academic': 'Non-Academic',
  core: 'Core',
}

function SortablePageItem({
  page,
  isActive,
  onSelect,
  onDelete,
}: {
  page: CmsPage
  isActive: boolean
  onSelect: (pageId: string) => void
  onDelete: (pageId: string) => void
}) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: page.id })
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({ id: page.id })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <button
      ref={(node) => {
        setDroppableRef(node)
        setDraggableRef(node)
      }}
      type="button"
      style={style}
      onClick={() => onSelect(page.id)}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
        isActive ? 'border-stone-900 bg-stone-900 text-stone-50' : 'border-stone-200 bg-white text-stone-900 hover:bg-stone-50',
        isOver && 'border-stone-500',
        isDragging && 'opacity-70',
      )}
    >
      <span
        className={cn('mt-0.5 inline-flex cursor-grab text-stone-400', isActive && 'text-stone-300')}
        {...listeners}
        {...attributes}
        onClick={(event) => event.stopPropagation()}
      >
        <GripVertical className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{page.title}</span>
        <span className={cn('block text-xs uppercase tracking-[0.18em]', isActive ? 'text-stone-300' : 'text-stone-500')}>
          {pageTypeLabels[page.type]}
        </span>
      </span>
      <span>
        <Button
          type="button"
          size="icon"
          variant={isActive ? 'secondary' : 'ghost'}
          className="size-8"
          onClick={(event) => {
            event.stopPropagation()
            onDelete(page.id)
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      </span>
    </button>
  )
}

export function PageList({
  pages,
  activePageId,
  onSelect,
  onAdd,
  onDelete,
  onReorder,
}: {
  pages: CmsPage[]
  activePageId: string
  onSelect: (pageId: string) => void
  onAdd: (pageType: PageType) => void
  onDelete: (pageId: string) => void
  onReorder: (activeId: string, overId: string) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return
    }

    onReorder(String(active.id), String(over.id))
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Pages</CardTitle>
        <CardDescription>Drag to reorder the document structure.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(['core', 'program', 'academic', 'non-academic'] as PageType[]).map((pageType) => (
            <Button key={pageType} type="button" variant="outline" className="justify-start" onClick={() => onAdd(pageType)}>
              <Plus className="size-4" />
              {pageTypeLabels[pageType]}
            </Button>
          ))}
        </div>
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="space-y-2">
            {pages.map((page) => (
              <SortablePageItem
                key={page.id}
                page={page}
                isActive={page.id === activePageId}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </div>
        </DndContext>
      </CardContent>
    </Card>
  )
}
