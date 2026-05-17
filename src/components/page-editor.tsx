import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import { ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react'

import { BulkAddAcademicDialog, BulkAddNonAcademicDialog } from '@/components/bulk-add-dialog'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type {
  AcademicEntry,
  AcademicPage,
  CmsPage,
  CorePage,
  CoreSection,
  NonAcademicEntry,
  NonAcademicPage,
  ProgramPage,
  ProgramRow,
} from '@/types/cms'

const TYPE_COLORS: Record<string, string> = {
  core: 'bg-[rgb(var(--type-core))]',
  program: 'bg-[rgb(var(--type-program))]',
  academic: 'bg-[rgb(var(--type-academic))]',
  'non-academic': 'bg-[rgb(var(--type-non-academic))]',
}

const REORDER_ACTIVATION_DISTANCE = 8
const REORDER_DROP_TARGET_CLASS = 'ring-2 ring-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)]'

function SectionLabel({ children }: { children: string }) {
  return <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">{children}</label>
}

function CollapsibleItemCard({
  children,
  title,
  index,
  onDelete,
  containerRef,
  containerStyle,
  containerClassName,
  dragListeners,
  dragAttributes,
  isDragging = false,
  isSelected = false,
  onSelect,
}: {
  children: React.ReactNode
  title: string
  index: number
  onDelete: () => void
  containerRef?: (node: HTMLDivElement | null) => void
  containerStyle?: React.CSSProperties
  containerClassName?: string
  dragListeners?: DraggableSyntheticListeners
  dragAttributes?: DraggableAttributes
  isDragging?: boolean
  isSelected?: boolean
  onSelect?: () => void
}) {
  const [isOpen, setIsOpen] = useState(true)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isSelected) {
      return
    }
    setIsOpen(true)
    rootRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [isSelected])

  return (
    <div
      ref={(node) => {
        rootRef.current = node
        if (containerRef) {
          containerRef(node)
        }
      }}
      style={containerStyle}
      className={cn(
        'animate-slide-up rounded-lg border bg-[var(--surface-canvas)]/60 transition-colors hover:border-[var(--color-hairline-strong)]',
        isSelected
          ? 'border-[var(--color-primary)] ring-2 ring-[color:color-mix(in_srgb,var(--color-primary)_18%,transparent)]'
          : 'border-[var(--color-hairline)]',
        isDragging && 'opacity-70',
        containerClassName,
      )}
      onClick={() => onSelect?.()}
    >
      <div className="flex w-full items-center gap-2 px-3 py-2.5">
        <span
          className="inline-flex cursor-grab text-[var(--color-muted-soft)] transition-colors hover:text-[var(--color-muted)]"
          aria-label="Drag to reorder"
          title="Drag to reorder"
          data-no-section-select
          onClick={(event) => event.stopPropagation()}
          {...dragListeners}
          {...dragAttributes}
        >
          <GripVertical className="size-3.5" />
        </span>
        <span className="flex size-5 items-center justify-center rounded bg-[var(--surface-strong)] text-[10px] font-bold tabular-nums text-[var(--color-muted)]">
          {index}
        </span>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="flex-1 truncate text-xs font-semibold text-[var(--color-body)]">{title}</span>
          <ChevronDown className={cn('size-3.5 shrink-0 text-[var(--color-muted)] transition-transform duration-200', isOpen && 'rotate-180')} />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 text-[var(--color-muted)] hover:text-[#cf2d56]"
          data-no-section-select
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
      {isOpen && (
        <div className="animate-fade-in space-y-3 border-t border-[var(--color-hairline)] px-3 pb-3 pt-3">
          {children}
        </div>
      )}
    </div>
  )
}

function AddButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--color-hairline-strong)] px-3 py-2.5 text-xs font-medium text-[var(--color-muted)] transition-colors duration-200 hover:border-[var(--color-primary)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_8%,white)] hover:text-[var(--color-primary)] cursor-pointer"
    >
      <Plus className="size-3.5" />
      {children}
    </button>
  )
}

function updateItem<T extends { id: string }>(items: T[], itemId: string, updater: (item: T) => T) {
  return items.map((item) => (item.id === itemId ? updater(item) : item))
}

function reorderItems<T extends { id: string }>(items: T[], activeId: string, overId: string) {
  const activeIndex = items.findIndex((item) => item.id === activeId)
  const overIndex = items.findIndex((item) => item.id === overId)

  if (activeIndex < 0 || overIndex < 0) {
    return items
  }

  const reorderedItems = [...items]
  const [activeItem] = reorderedItems.splice(activeIndex, 1)
  reorderedItems.splice(overIndex, 0, activeItem)
  return reorderedItems
}

function ReorderableItemCard({
  itemId,
  children,
  title,
  index,
  onDelete,
  isSelected = false,
  onSelect,
}: {
  itemId: string
  children: React.ReactNode
  title: string
  index: number
  onDelete: () => void
  isSelected?: boolean
  onSelect?: () => void
}) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: itemId })
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({ id: itemId })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <CollapsibleItemCard
      title={title}
      index={index}
      onDelete={onDelete}
      containerRef={(node) => {
        setDroppableRef(node)
        setDraggableRef(node)
      }}
      containerStyle={style}
      containerClassName={cn(isOver && REORDER_DROP_TARGET_CLASS)}
      isDragging={isDragging}
      isSelected={isSelected}
      onSelect={onSelect}
      dragListeners={listeners}
      dragAttributes={attributes}
    >
      {children}
    </CollapsibleItemCard>
  )
}

function useEditorReorderSensor() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: REORDER_ACTIVATION_DISTANCE } }),
    useSensor(KeyboardSensor),
  )
}

function EditorChrome({ page, children }: { page: CmsPage; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--color-hairline)] bg-white">
      {/* Type color bar */}
      <div className={cn('h-1 rounded-t-xl', TYPE_COLORS[page.type])} />

      <div className="flex flex-col gap-1 p-4 pb-2">
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">Editor</h3>
        <p className="text-xs text-[var(--color-muted)]">Update content and structure for the selected page.</p>
      </div>

      <div className="space-y-4 p-4 pt-2">{children}</div>
    </div>
  )
}

function ProgramEditor({
  page,
  onChange,
  selectedLayoutItemId,
  onLayoutItemSelect,
}: {
  page: ProgramPage
  onChange: (page: CmsPage) => void
  selectedLayoutItemId?: string | null
  onLayoutItemSelect?: (itemId: string | null) => void
}) {
  const sensors = useEditorReorderSensor()
  const programColumnCardClassName = 'space-y-3 rounded-lg border border-[var(--color-hairline)] bg-white p-3'
  const updateRow = (rowId: string, updater: (row: ProgramRow) => ProgramRow) => {
    onChange({
      ...page,
      content: {
        ...page.content,
        rows: updateItem(page.content.rows, rowId, updater),
      },
    })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return
    }

    onChange({
      ...page,
      content: {
        ...page.content,
        rows: reorderItems(page.content.rows, String(active.id), String(over.id)),
      },
    })
  }

  return (
    <EditorChrome page={page}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <SectionLabel>Page title</SectionLabel>
          <Input value={page.title} onChange={(event) => onChange({ ...page, title: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <SectionLabel>Heading</SectionLabel>
          </div>
          <Input value={page.content.heading} onChange={(event) => onChange({ ...page, content: { ...page.content, heading: event.target.value } })} />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-[var(--color-muted)]">{page.content.rows.length} row{page.content.rows.length !== 1 ? 's' : ''}</span>
          <div className="h-px flex-1 bg-[var(--color-hairline)]" />
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="space-y-2">
            {page.content.rows.map((row, index) => {
              const hasRightColumn = row.rightTitle !== undefined || row.rightBody !== undefined
              const rightColumnToggleId = `program-row-two-column-${row.id}`
              return (
                <ReorderableItemCard
                key={row.id}
                itemId={row.id}
                title={row.leftTitle || 'Untitled row'}
                index={index + 1}
                isSelected={selectedLayoutItemId === row.id}
                onSelect={() => onLayoutItemSelect?.(row.id)}
                onDelete={() =>
                onChange({
                  ...page,
                  content: {
                    ...page.content,
                    rows: page.content.rows.filter((item) => item.id !== row.id),
                  },
                })
              }
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-hairline)] bg-white px-3 py-2 text-xs font-medium text-[var(--color-body)]">
                    <label htmlFor={rightColumnToggleId}>Two-column row</label>
                    <span className="toggle-switch">
                      <input
                        id={rightColumnToggleId}
                        type="checkbox"
                        checked={hasRightColumn}
                        aria-label={`Two-column row ${hasRightColumn ? 'enabled' : 'disabled'}`}
                        onChange={(event) =>
                          updateRow(row.id, (current) =>
                            event.target.checked
                              ? { ...current, rightTitle: current.rightTitle ?? '', rightBody: current.rightBody ?? '' }
                              : { ...current, rightTitle: undefined, rightBody: undefined },
                          )
                        }
                      />
                      <span className="toggle-track" />
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className={programColumnCardClassName}>
                      <div className="space-y-1.5">
                        <SectionLabel>Left title</SectionLabel>
                        <Input value={row.leftTitle} onChange={(event) => updateRow(row.id, (current) => ({ ...current, leftTitle: event.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <SectionLabel>Left body</SectionLabel>
                        <Textarea value={row.leftBody} onChange={(event) => updateRow(row.id, (current) => ({ ...current, leftBody: event.target.value }))} />
                      </div>
                    </div>

                    <div className={programColumnCardClassName} aria-disabled={!hasRightColumn}>
                      <div className="space-y-1.5">
                        <SectionLabel>Right title</SectionLabel>
                        <Input
                          value={row.rightTitle ?? ''}
                          disabled={!hasRightColumn}
                          onChange={(event) => updateRow(row.id, (current) => ({ ...current, rightTitle: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <SectionLabel>Right body</SectionLabel>
                        <Textarea
                          value={row.rightBody ?? ''}
                          disabled={!hasRightColumn}
                          onChange={(event) => updateRow(row.id, (current) => ({ ...current, rightBody: event.target.value }))}
                        />
                      </div>
                      {!hasRightColumn && (
                        <p className="text-[11px] leading-snug text-[var(--color-muted)]">Enable “Two-column row” to edit right-column content.</p>
                      )}
                    </div>
                  </div>
                </div>
              </ReorderableItemCard>
              )
            })}
          </div>
        </DndContext>
        <AddButton
          onClick={() =>
            onChange({
              ...page,
              content: {
                ...page.content,
                rows: [
                  ...page.content.rows,
                  {
                    id: crypto.randomUUID(),
                    leftTitle: 'New item',
                    leftBody: '',
                  },
                ],
              },
            })
          }
        >
          Add row
        </AddButton>
      </div>
    </EditorChrome>
  )
}

function AcademicEditor({
  page,
  onChange,
  selectedLayoutItemId,
  onLayoutItemSelect,
}: {
  page: AcademicPage
  onChange: (page: CmsPage) => void
  selectedLayoutItemId?: string | null
  onLayoutItemSelect?: (itemId: string | null) => void
}) {
  const sensors = useEditorReorderSensor()
  const updateEntry = (entryId: string, updater: (entry: AcademicEntry) => AcademicEntry) => {
    onChange({
      ...page,
      content: {
        ...page.content,
        entries: updateItem(page.content.entries, entryId, updater),
      },
    })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return
    }

    onChange({
      ...page,
      content: {
        ...page.content,
        entries: reorderItems(page.content.entries, String(active.id), String(over.id)),
      },
    })
  }

  return (
    <EditorChrome page={page}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <SectionLabel>Page title</SectionLabel>
          <Input value={page.title} onChange={(event) => onChange({ ...page, title: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <SectionLabel>Heading</SectionLabel>
          <Input value={page.content.heading} onChange={(event) => onChange({ ...page, content: { ...page.content, heading: event.target.value } })} />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-[var(--color-muted)]">{page.content.entries.length} awardee{page.content.entries.length !== 1 ? 's' : ''}</span>
          <div className="h-px flex-1 bg-[var(--color-hairline)]" />
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="space-y-2">
            {page.content.entries.map((entry, index) => (
              <ReorderableItemCard
                key={entry.id}
                itemId={entry.id}
                title={entry.name || 'Untitled'}
                index={index + 1}
                isSelected={selectedLayoutItemId === entry.id}
                onSelect={() => onLayoutItemSelect?.(entry.id)}
                onDelete={() =>
                onChange({
                  ...page,
                  content: { ...page.content, entries: page.content.entries.filter((item) => item.id !== entry.id) },
                })
              }
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <SectionLabel>Name</SectionLabel>
                    <Input value={entry.name} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <SectionLabel>Award / Program</SectionLabel>
                    <Input value={entry.award} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, award: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <SectionLabel>Category</SectionLabel>
                    <Input value={entry.category} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, category: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <SectionLabel>Grade level</SectionLabel>
                    <Input value={entry.gradeLevel} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, gradeLevel: event.target.value }))} />
                  </div>
                </div>
              </ReorderableItemCard>
            ))}
          </div>
        </DndContext>
        <div className="grid grid-cols-2 gap-2">
          <AddButton
            onClick={() =>
              onChange({
                ...page,
                content: {
                  ...page.content,
                  entries: [
                    ...page.content.entries,
                    {
                      id: crypto.randomUUID(),
                      name: 'New awardee',
                      award: 'Award or program',
                      category: 'Category',
                      gradeLevel: 'Grade level',
                    },
                  ],
                },
              })
            }
          >
            Add awardee
          </AddButton>
          <BulkAddAcademicDialog
            onAdd={(entries) =>
              onChange({
                ...page,
                content: { ...page.content, entries: [...page.content.entries, ...entries] },
              })
            }
          />
        </div>
      </div>
    </EditorChrome>
  )
}

function NonAcademicEditor({
  page,
  onChange,
  selectedLayoutItemId,
  onLayoutItemSelect,
}: {
  page: NonAcademicPage
  onChange: (page: CmsPage) => void
  selectedLayoutItemId?: string | null
  onLayoutItemSelect?: (itemId: string | null) => void
}) {
  const sensors = useEditorReorderSensor()
  const updateEntry = (entryId: string, updater: (entry: NonAcademicEntry) => NonAcademicEntry) => {
    onChange({
      ...page,
      content: {
        ...page.content,
        entries: updateItem(page.content.entries, entryId, updater),
      },
    })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return
    }

    onChange({
      ...page,
      content: {
        ...page.content,
        entries: reorderItems(page.content.entries, String(active.id), String(over.id)),
      },
    })
  }

  return (
    <EditorChrome page={page}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <SectionLabel>Page title</SectionLabel>
          <Input value={page.title} onChange={(event) => onChange({ ...page, title: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <SectionLabel>Heading</SectionLabel>
          <Input value={page.content.heading} onChange={(event) => onChange({ ...page, content: { ...page.content, heading: event.target.value } })} />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-[var(--color-muted)]">{page.content.entries.length} award{page.content.entries.length !== 1 ? 's' : ''}</span>
          <div className="h-px flex-1 bg-[var(--color-hairline)]" />
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="space-y-2">
            {page.content.entries.map((entry, index) => (
              <ReorderableItemCard
                key={entry.id}
                itemId={entry.id}
                title={entry.name || 'Untitled'}
                index={index + 1}
                isSelected={selectedLayoutItemId === entry.id}
                onSelect={() => onLayoutItemSelect?.(entry.id)}
                onDelete={() =>
                onChange({
                  ...page,
                  content: { ...page.content, entries: page.content.entries.filter((item) => item.id !== entry.id) },
                })
              }
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <SectionLabel>Name</SectionLabel>
                    <Input value={entry.name} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <SectionLabel>Award</SectionLabel>
                    <Input value={entry.award} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, award: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <SectionLabel>Category</SectionLabel>
                    <Input value={entry.category} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, category: event.target.value }))} />
                  </div>
                </div>
              </ReorderableItemCard>
            ))}
          </div>
        </DndContext>
        <div className="grid grid-cols-2 gap-2">
          <AddButton
            onClick={() =>
              onChange({
                ...page,
                content: {
                  ...page.content,
                  entries: [
                    ...page.content.entries,
                    {
                      id: crypto.randomUUID(),
                      name: 'New awardee',
                      award: 'Award',
                      category: 'Category',
                    },
                  ],
                },
              })
            }
          >
            Add award
          </AddButton>
          <BulkAddNonAcademicDialog
            onAdd={(entries) =>
              onChange({
                ...page,
                content: { ...page.content, entries: [...page.content.entries, ...entries] },
              })
            }
          />
        </div>
      </div>
    </EditorChrome>
  )
}

function CoreEditor({
  page,
  onChange,
  selectedLayoutItemId,
  onLayoutItemSelect,
}: {
  page: CorePage
  onChange: (page: CmsPage) => void
  selectedLayoutItemId?: string | null
  onLayoutItemSelect?: (itemId: string | null) => void
}) {
  const sensors = useEditorReorderSensor()
  const updateSection = (sectionId: string, updater: (section: CoreSection) => CoreSection) => {
    onChange({
      ...page,
      content: {
        ...page.content,
        sections: updateItem(page.content.sections, sectionId, updater),
      },
    })
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return
    }

    onChange({
      ...page,
      content: {
        ...page.content,
        sections: reorderItems(page.content.sections, String(active.id), String(over.id)),
      },
    })
  }

  return (
    <EditorChrome page={page}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <SectionLabel>Page title</SectionLabel>
          <Input value={page.title} onChange={(event) => onChange({ ...page, title: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <SectionLabel>Heading</SectionLabel>
          <Textarea value={page.content.heading} onChange={(event) => onChange({ ...page, content: { ...page.content, heading: event.target.value } })} />
        </div>
        <div className="space-y-1.5">
          <SectionLabel>Subheading</SectionLabel>
          <Input value={page.content.subheading ?? ''} onChange={(event) => onChange({ ...page, content: { ...page.content, subheading: event.target.value } })} />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-[var(--color-muted)]">{page.content.sections.length} section{page.content.sections.length !== 1 ? 's' : ''}</span>
          <div className="h-px flex-1 bg-[var(--color-hairline)]" />
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="space-y-2">
            {page.content.sections.map((section, index) => (
              <ReorderableItemCard
                key={section.id}
                itemId={section.id}
                title={section.title || 'Untitled'}
                index={index + 1}
                isSelected={selectedLayoutItemId === section.id}
                onSelect={() => onLayoutItemSelect?.(section.id)}
                onDelete={() =>
                onChange({
                  ...page,
                  content: {
                    ...page.content,
                    sections: page.content.sections.filter((item) => item.id !== section.id),
                  },
                })
              }
              >
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <SectionLabel>Title</SectionLabel>
                    <Input value={section.title} onChange={(event) => updateSection(section.id, (current) => ({ ...current, title: event.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <SectionLabel>Body</SectionLabel>
                    <Textarea value={section.body} onChange={(event) => updateSection(section.id, (current) => ({ ...current, body: event.target.value }))} />
                  </div>
                </div>
              </ReorderableItemCard>
            ))}
          </div>
        </DndContext>
        <AddButton
          onClick={() =>
            onChange({
              ...page,
              content: {
                ...page.content,
                sections: [
                  ...page.content.sections,
                  { id: crypto.randomUUID(), title: 'New section', body: '' },
                ],
              },
            })
          }
        >
          Add section
        </AddButton>
      </div>
    </EditorChrome>
  )
}

export function PageEditor({
  page,
  onChange,
  selectedLayoutItemId,
  onLayoutItemSelect,
}: {
  page: CmsPage
  onChange: (page: CmsPage) => void
  selectedLayoutItemId?: string | null
  onLayoutItemSelect?: (itemId: string | null) => void
}) {
  switch (page.type) {
    case 'program':
      return (
        <ProgramEditor
          page={page}
          onChange={onChange}
          selectedLayoutItemId={selectedLayoutItemId}
          onLayoutItemSelect={onLayoutItemSelect}
        />
      )
    case 'academic':
      return (
        <AcademicEditor
          page={page}
          onChange={onChange}
          selectedLayoutItemId={selectedLayoutItemId}
          onLayoutItemSelect={onLayoutItemSelect}
        />
      )
    case 'non-academic':
      return (
        <NonAcademicEditor
          page={page}
          onChange={onChange}
          selectedLayoutItemId={selectedLayoutItemId}
          onLayoutItemSelect={onLayoutItemSelect}
        />
      )
    case 'core':
      return (
        <CoreEditor
          page={page}
          onChange={onChange}
          selectedLayoutItemId={selectedLayoutItemId}
          onLayoutItemSelect={onLayoutItemSelect}
        />
      )
  }
}
