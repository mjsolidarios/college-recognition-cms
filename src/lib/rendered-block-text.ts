import type { RenderTextBlock } from '@/types/cms'

export function transformLineForRender(text: string, uppercase?: boolean) {
  if (text.length === 0) {
    return text
  }
  return uppercase ? text.toUpperCase() : text
}

export function getRenderedBlockLines(block: RenderTextBlock) {
  return block.lines.map((line) => transformLineForRender(line, block.uppercase))
}
