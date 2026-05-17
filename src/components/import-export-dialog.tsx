import { AlertCircle, Check, ClipboardCopy, Download, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'

import { useConfirm } from '@/components/confirm-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { exportBooklet, getImportSummary, prepareImportPages, validateBookletImport, type BookletExport } from '@/lib/import-export'
import { downloadFile, slugify } from '@/lib/utils'
import type { CmsPage, CmsSettings } from '@/types/cms'

/* ── Export Dialog ────────────────────────────────────────── */

export function ExportDialog({ pages, settings, title, frontCover, backCover }: {
  pages: CmsPage[]; settings: CmsSettings; title: string; frontCover?: string | null; backCover?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const json = exportBooklet(pages, settings, title, frontCover, backCover)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([json], { type: 'application/json' })
    downloadFile(blob, `${slugify(title) || 'booklet'}-export.json`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm"
          className="h-9 border border-[var(--color-hairline)] bg-white px-3 text-xs text-[var(--color-body)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--surface-canvas)] hover:text-[var(--color-ink)]">
          <Download className="size-3.5" /><span className="hidden sm:inline">Export JSON</span>
        </Button>
      </DialogTrigger>
      <DialogContent showClose={false} className="max-w-xl">
        <div className="flex items-start justify-between gap-3">
          <DialogHeader className="pr-0">
            <DialogTitle>Export Booklet Data</DialogTitle>
            <DialogDescription>
              {pages.length} page{pages.length !== 1 ? 's' : ''} · Copy or download as JSON
            </DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon" className="size-7 flex-shrink-0 text-[var(--color-muted)]">
              <X className="size-4" />
            </Button>
          </DialogClose>
        </div>

        <Textarea value={json} readOnly className="min-h-48 max-h-64 bg-[var(--surface-canvas)] font-mono text-[11px] leading-relaxed text-[var(--color-body)]" />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <><Check className="size-3.5 text-emerald-600" />Copied!</> : <><ClipboardCopy className="size-3.5" />Copy to clipboard</>}
          </Button>
          <Button type="button" size="sm" onClick={handleDownload}>
            <Download className="size-3.5" />Download .json
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Import Dialog ────────────────────────────────────────── */

type ImportMode = 'replace' | 'merge'
type ImportState = { step: 'input' } | { step: 'valid'; data: BookletExport } | { step: 'error'; errors: string[] } | { step: 'done'; summary: string }

export function ImportDialog({ pages, onImport }: {
  pages: CmsPage[]
  onImport: (pages: CmsPage[], settings?: CmsSettings, title?: string, frontCover?: string | null, backCover?: string | null) => void
}) {
  const { confirm } = useConfirm()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ImportMode>('replace')
  const [pasteRaw, setPasteRaw] = useState('')
  const [state, setState] = useState<ImportState>({ step: 'input' })
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => { setState({ step: 'input' }); setPasteRaw('') }

  const processJson = (text: string) => {
    try {
      const parsed = JSON.parse(text)
      const result = validateBookletImport(parsed)
      if (result.valid) {
        setState({ step: 'valid', data: result.data })
      } else {
        setState({ step: 'error', errors: result.errors })
      }
    } catch {
      setState({ step: 'error', errors: ['Invalid JSON: unable to parse the input'] })
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => processJson(reader.result as string)
    reader.readAsText(file)
    e.target.value = ''
  }

  const handlePaste = () => { if (pasteRaw.trim()) processJson(pasteRaw) }

  const handleConfirm = async () => {
    if (state.step !== 'valid') return
    if (mode === 'replace') {
      const ok = await confirm({
        title: 'Replace all pages?',
        description: 'Replace all existing pages with imported data? This cannot be undone.',
        confirmLabel: 'Replace & import',
        destructive: true,
      })
      if (!ok) {
        return
      }
    }
    const finalPages = prepareImportPages(state.data, pages, mode)
    const summary = getImportSummary(state.data.pages)
    onImport(finalPages, state.data.settings, state.data.title, state.data.frontCover, state.data.backCover)
    setState({ step: 'done', summary })
    setTimeout(() => { setOpen(false); reset() }, 1800)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) reset() }}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm"
          className="h-9 border border-[var(--color-hairline)] bg-white px-3 text-xs text-[var(--color-body)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--surface-canvas)] hover:text-[var(--color-ink)]">
          <Upload className="size-3.5" /><span className="hidden sm:inline">Import JSON</span>
        </Button>
      </DialogTrigger>
      <DialogContent showClose={false}>
        <div className="flex items-start justify-between gap-3">
          <DialogHeader className="pr-0">
            <DialogTitle>Import Booklet Data</DialogTitle>
            <DialogDescription>Upload a .json file or paste JSON content</DialogDescription>
          </DialogHeader>
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="icon" className="size-7 flex-shrink-0 text-[var(--color-muted)]">
              <X className="size-4" />
            </Button>
          </DialogClose>
        </div>

        {state.step === 'done' ? (
          <div className="flex flex-col items-center gap-2 py-6 animate-scale-in">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100"><Check className="size-5 text-emerald-600" /></div>
            <p className="text-sm font-medium text-[var(--color-ink)]">{state.summary}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex rounded-lg border border-[var(--color-hairline)] p-0.5">
              {(['replace', 'merge'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${mode === m ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'}`}>
                  {m === 'replace' ? 'Replace all' : `Merge (append to ${pages.length} pages)`}
                </button>
              ))}
            </div>

            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--color-hairline-strong)] px-4 py-5 text-xs font-medium text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_8%,white)] hover:text-[var(--color-primary)] cursor-pointer">
              <Upload className="size-4" />Drop or click to upload .json file
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--color-hairline)]" />
              <span className="text-[10px] font-semibold uppercase text-[var(--color-muted)]">or paste</span>
              <div className="h-px flex-1 bg-[var(--color-hairline)]" />
            </div>

            <Textarea value={pasteRaw} onChange={(e) => setPasteRaw(e.target.value)} placeholder='{"version":1,"pages":[...]}'
              className="min-h-28 bg-[var(--surface-canvas)] font-mono text-[11px]" />
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={handlePaste} disabled={!pasteRaw.trim()}>
              Validate pasted JSON
            </Button>

            {state.step === 'error' && (
              <div className="animate-fade-in rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700"><AlertCircle className="size-3.5" />Validation errors</div>
                <ul className="list-disc pl-5 space-y-0.5">
                  {state.errors.slice(0, 8).map((err, i) => <li key={i} className="text-[11px] text-red-600">{err}</li>)}
                  {state.errors.length > 8 && <li className="text-[11px] text-red-500">…and {state.errors.length - 8} more</li>}
                </ul>
                <button type="button" onClick={reset} className="text-[11px] font-medium text-red-700 underline cursor-pointer">Try again</button>
              </div>
            )}

            {state.step === 'valid' && (
              <div className="animate-fade-in rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><Check className="size-3.5" />Valid — {getImportSummary(state.data.pages)}</div>
                {state.data.title && <p className="text-[11px] text-emerald-600">Title: "{state.data.title}"</p>}
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={reset}>Back</Button>
                  <Button type="button" size="sm" onClick={() => void handleConfirm()} className="border-[#1f8a65] bg-[#1f8a65] text-white hover:border-[#1a7456] hover:bg-[#1a7456]">
                    {mode === 'replace' ? 'Replace & import' : 'Merge & import'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
