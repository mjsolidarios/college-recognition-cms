import { Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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

function SectionLabel({ children }: { children: string }) {
  return <label className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{children}</label>
}

function ItemCard({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 rounded-lg border border-stone-200 p-3">{children}</div>
}

function updateItem<T extends { id: string }>(items: T[], itemId: string, updater: (item: T) => T) {
  return items.map((item) => (item.id === itemId ? updater(item) : item))
}

function EditorChrome({ page, children }: { page: CmsPage; children: React.ReactNode }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Editor</CardTitle>
        <CardDescription>Update content and structure for the selected page.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <SectionLabel>Page title</SectionLabel>
            <Input value={page.title} readOnly />
          </div>
          <div className="space-y-2">
            <SectionLabel>Page type</SectionLabel>
            <Select value={page.type} onValueChange={() => undefined}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={page.type}>{page.type}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <SectionLabel>Order</SectionLabel>
            <Input value={String(page.order + 1)} readOnly />
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}

function ProgramEditor({ page, onChange }: { page: ProgramPage; onChange: (page: CmsPage) => void }) {
  const updateRow = (rowId: string, updater: (row: ProgramRow) => ProgramRow) => {
    onChange({
      ...page,
      content: {
        ...page.content,
        rows: updateItem(page.content.rows, rowId, updater),
      },
    })
  }

  return (
    <EditorChrome page={page}>
      <div className="space-y-4">
        <div className="space-y-2">
          <SectionLabel>Page title</SectionLabel>
          <Input value={page.title} onChange={(event) => onChange({ ...page, title: event.target.value })} />
        </div>
        <div className="space-y-2">
          <SectionLabel>Heading</SectionLabel>
          <Input value={page.content.heading} onChange={(event) => onChange({ ...page, content: { ...page.content, heading: event.target.value } })} />
        </div>
        <div className="space-y-3">
          {page.content.rows.map((row) => (
            <ItemCard key={row.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-stone-900">Program row</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() =>
                    onChange({
                      ...page,
                      content: {
                        ...page.content,
                        rows: page.content.rows.filter((item) => item.id !== row.id),
                      },
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <SectionLabel>Left title</SectionLabel>
                  <Input value={row.leftTitle} onChange={(event) => updateRow(row.id, (current) => ({ ...current, leftTitle: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <SectionLabel>Right title</SectionLabel>
                  <Input value={row.rightTitle ?? ''} onChange={(event) => updateRow(row.id, (current) => ({ ...current, rightTitle: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <SectionLabel>Left body</SectionLabel>
                  <Textarea value={row.leftBody} onChange={(event) => updateRow(row.id, (current) => ({ ...current, leftBody: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <SectionLabel>Right body</SectionLabel>
                  <Textarea value={row.rightBody ?? ''} onChange={(event) => updateRow(row.id, (current) => ({ ...current, rightBody: event.target.value }))} />
                </div>
              </div>
            </ItemCard>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
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
                    rightTitle: 'Supporting detail',
                    rightBody: '',
                  },
                ],
              },
            })
          }
        >
          <Plus className="size-4" />
          Add row
        </Button>
      </div>
    </EditorChrome>
  )
}

function AcademicEditor({ page, onChange }: { page: AcademicPage; onChange: (page: CmsPage) => void }) {
  const updateEntry = (entryId: string, updater: (entry: AcademicEntry) => AcademicEntry) => {
    onChange({
      ...page,
      content: {
        ...page.content,
        entries: updateItem(page.content.entries, entryId, updater),
      },
    })
  }

  return (
    <EditorChrome page={page}>
      <div className="space-y-4">
        <div className="space-y-2">
          <SectionLabel>Page title</SectionLabel>
          <Input value={page.title} onChange={(event) => onChange({ ...page, title: event.target.value })} />
        </div>
        <div className="space-y-2">
          <SectionLabel>Heading</SectionLabel>
          <Input value={page.content.heading} onChange={(event) => onChange({ ...page, content: { ...page.content, heading: event.target.value } })} />
        </div>
        {page.content.entries.map((entry) => (
          <ItemCard key={entry.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-stone-900">Awardee</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() =>
                  onChange({
                    ...page,
                    content: { ...page.content, entries: page.content.entries.filter((item) => item.id !== entry.id) },
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <SectionLabel>Name</SectionLabel>
                <Input value={entry.name} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <SectionLabel>Award / Program</SectionLabel>
                <Input value={entry.award} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, award: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <SectionLabel>Category</SectionLabel>
                <Input value={entry.category} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, category: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <SectionLabel>Grade level</SectionLabel>
                <Input value={entry.gradeLevel} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, gradeLevel: event.target.value }))} />
              </div>
            </div>
          </ItemCard>
        ))}
        <Button
          type="button"
          variant="outline"
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
          <Plus className="size-4" />
          Add awardee
        </Button>
      </div>
    </EditorChrome>
  )
}

function NonAcademicEditor({ page, onChange }: { page: NonAcademicPage; onChange: (page: CmsPage) => void }) {
  const updateEntry = (entryId: string, updater: (entry: NonAcademicEntry) => NonAcademicEntry) => {
    onChange({
      ...page,
      content: {
        ...page.content,
        entries: updateItem(page.content.entries, entryId, updater),
      },
    })
  }

  return (
    <EditorChrome page={page}>
      <div className="space-y-4">
        <div className="space-y-2">
          <SectionLabel>Page title</SectionLabel>
          <Input value={page.title} onChange={(event) => onChange({ ...page, title: event.target.value })} />
        </div>
        <div className="space-y-2">
          <SectionLabel>Heading</SectionLabel>
          <Input value={page.content.heading} onChange={(event) => onChange({ ...page, content: { ...page.content, heading: event.target.value } })} />
        </div>
        {page.content.entries.map((entry) => (
          <ItemCard key={entry.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-stone-900">Award</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() =>
                  onChange({
                    ...page,
                    content: { ...page.content, entries: page.content.entries.filter((item) => item.id !== entry.id) },
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <SectionLabel>Name</SectionLabel>
                <Input value={entry.name} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <SectionLabel>Award</SectionLabel>
                <Input value={entry.award} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, award: event.target.value }))} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <SectionLabel>Category</SectionLabel>
                <Input value={entry.category} onChange={(event) => updateEntry(entry.id, (current) => ({ ...current, category: event.target.value }))} />
              </div>
            </div>
          </ItemCard>
        ))}
        <Button
          type="button"
          variant="outline"
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
          <Plus className="size-4" />
          Add award
        </Button>
      </div>
    </EditorChrome>
  )
}

function CoreEditor({ page, onChange }: { page: CorePage; onChange: (page: CmsPage) => void }) {
  const updateSection = (sectionId: string, updater: (section: CoreSection) => CoreSection) => {
    onChange({
      ...page,
      content: {
        ...page.content,
        sections: updateItem(page.content.sections, sectionId, updater),
      },
    })
  }

  return (
    <EditorChrome page={page}>
      <div className="space-y-4">
        <div className="space-y-2">
          <SectionLabel>Page title</SectionLabel>
          <Input value={page.title} onChange={(event) => onChange({ ...page, title: event.target.value })} />
        </div>
        <div className="space-y-2">
          <SectionLabel>Heading</SectionLabel>
          <Textarea value={page.content.heading} onChange={(event) => onChange({ ...page, content: { ...page.content, heading: event.target.value } })} />
        </div>
        <div className="space-y-2">
          <SectionLabel>Subheading</SectionLabel>
          <Input value={page.content.subheading ?? ''} onChange={(event) => onChange({ ...page, content: { ...page.content, subheading: event.target.value } })} />
        </div>
        {page.content.sections.map((section) => (
          <ItemCard key={section.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-stone-900">Section</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() =>
                  onChange({
                    ...page,
                    content: {
                      ...page.content,
                      sections: page.content.sections.filter((item) => item.id !== section.id),
                    },
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <SectionLabel>Title</SectionLabel>
                <Input value={section.title} onChange={(event) => updateSection(section.id, (current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <SectionLabel>Body</SectionLabel>
                <Textarea value={section.body} onChange={(event) => updateSection(section.id, (current) => ({ ...current, body: event.target.value }))} />
              </div>
            </div>
          </ItemCard>
        ))}
        <Button
          type="button"
          variant="outline"
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
          <Plus className="size-4" />
          Add section
        </Button>
      </div>
    </EditorChrome>
  )
}

export function PageEditor({ page, onChange }: { page: CmsPage; onChange: (page: CmsPage) => void }) {
  switch (page.type) {
    case 'program':
      return <ProgramEditor page={page} onChange={onChange} />
    case 'academic':
      return <AcademicEditor page={page} onChange={onChange} />
    case 'non-academic':
      return <NonAcademicEditor page={page} onChange={onChange} />
    case 'core':
      return <CoreEditor page={page} onChange={onChange} />
  }
}
