import { Document, Font, Page, StyleSheet, Text } from '@react-pdf/renderer'

import { getRenderedBlockLines } from '@/lib/rendered-block-text'
import { PAGE_HEIGHT, PAGE_WIDTH, type RenderedPage } from '@/types/cms'

Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: '#ffffff',
    position: 'relative',
    fontFamily: 'Times-Roman',
  },
})

export function PdfDocument({ pages }: { pages: RenderedPage[] }) {
  return (
    <Document>
      {pages.map((page) => (
        <Page key={page.id} size={[PAGE_WIDTH, PAGE_HEIGHT]} style={styles.page}>
          {page.blocks.map((block) => (
            <Text
              key={block.id}
              style={{
                position: 'absolute',
                left: block.x,
                top: block.y,
                width: block.width,
                fontSize: block.fontSize,
                lineHeight: block.lineHeight,
                textAlign: block.align,
                fontFamily: block.fontWeight === 'bold' ? 'Times-Bold' : 'Times-Roman',
                fontStyle: block.fontStyle,
                letterSpacing: block.letterSpacing,
              }}
            >
              {getRenderedBlockLines(block).join('\n')}
            </Text>
          ))}
        </Page>
      ))}
    </Document>
  )
}
