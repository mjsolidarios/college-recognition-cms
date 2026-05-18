import { readFileSync, writeFileSync } from 'node:fs'

const programNames = {
  BLIS: 'Bachelor of Library and Information Science',
  BSCS: 'Bachelor of Science in Computer Science',
  BSEMC: 'Bachelor of Science in Entertainment and Multimedia Computing',
  BSIS: 'Bachelor of Science in Information Systems',
  BSIT: 'Bachelor of Science in Information Technology',
}

const gradeLabels = {
  'First Year': '1st Year Curriculum',
  'Second Year': '2nd Year Curriculum',
  'Third Year': '3rd Year Curriculum',
  'Fourth Year': '4th Year Curriculum',
}

const medalLabels = {
  Gold: 'Gold Medals',
  Silver: 'Silver Medals',
  Bronze: 'Bronze Medals',
}
const programOrder = [
  programNames.BLIS,
  programNames.BSCS,
  programNames.BSEMC,
  programNames.BSIS,
  programNames.BSIT,
]
const gradeOrder = [
  gradeLabels['Fourth Year'],
  gradeLabels['Third Year'],
  gradeLabels['Second Year'],
  gradeLabels['First Year'],
]
const medalOrder = Object.values(medalLabels)
const suffixPattern = /^(Jr\.?|Sr\.?|II|III|IV|V)$/i

function clean(value) {
  return value
    .replace(/\u000b/g, ' ')
    .replace(/\\-/g, '-')
    .replace(/\\!/g, '!')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeStudentName(name) {
  const parts = clean(name)
    .replace(/,\s+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const suffixIndex = parts.findIndex((part) => suffixPattern.test(part))
  if (suffixIndex < 0 || suffixIndex === parts.length - 1) {
    return parts.join(' ')
  }
  const [suffix] = parts.splice(suffixIndex, 1)
  return [...parts, suffix.replace(/\.$/, '.')].join(' ')
}

function getLastNameSortKey(name) {
  const withoutSuffix = normalizeStudentName(name).replace(/\s+(Jr\.?|Sr\.?|I{2,3}|IV|V)$/i, '')
  const parts = withoutSuffix.split(/\s+/).filter(Boolean)
  return (parts.at(-1) ?? withoutSuffix).toLocaleLowerCase('en')
}

function looksLikePersonName(value) {
  const text = clean(value)
  if (!text || /[:—"()]/.test(text) || /^(Team|Adviser|Co-adviser|Mentor|Mentors):?\b/i.test(text)) {
    return false
  }
  const parts = text.split(/\s+/).filter(Boolean)
  return parts.length >= 2 && parts.length <= 6
}

function compactLines(value) {
  return value
    .split(/\r?\n/)
    .map(clean)
    .filter(Boolean)
    .join(' ')
}

function splitTextBlocks(markdown) {
  return markdown
    .replace(/\u000b/g, ' ')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(clean)
}

function isTableSeparator(line) {
  return /^\|\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(line.trim())
}

function parseProgram(markdown) {
  const blocks = splitTextBlocks(markdown)
    .filter((block) => !/^PROGRAM$/i.test(clean(block)))
    .filter((block) => !/^\d+$/.test(clean(block)))

  const rows = []
  for (let index = 0; index < blocks.length; index += 4) {
    const leftTitle = compactLines(blocks[index] ?? '')
    const rightTitle = compactLines(blocks[index + 1] ?? '')
    const leftBody = compactLines(blocks[index + 2] ?? '')
    const rightBody = compactLines(blocks[index + 3] ?? '')

    if (!leftTitle && !rightTitle && !leftBody && !rightBody) {
      continue
    }

    const row = {
      id: `program-${rows.length + 1}`,
      leftTitle,
      leftBody,
      rightTitle,
      rightBody,
    }

    rows.push(row)
  }

  return rows
}

function parseOfficials(markdown) {
  const lines = markdown
    .replace(/\u000b/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.trim())

  const headingEnd = lines.findIndex((line) => /^College and division officials$/i.test(line))
  const heading = lines.slice(0, headingEnd).filter(Boolean).join('\n')
  const subheading = headingEnd >= 0 ? lines[headingEnd] : 'College and division officials'

  const sectionTitleLines = new Set([
    'Dean',
    'College Secretary',
    'DEPARTMENT OF INFORMATION',
    'DIVISION OF ENTERTAINMENT AND',
    'DIVISION OF INFORMATION',
    'DIVISION OF COMPUTER SCIENCE',
  ])
  const titleContinuationLines = new Set([
    'SYSTEMS',
    'MULTIMEDIA COMPUTING',
    'TECHNOLOGY',
  ])

  const sections = []
  let currentTitle = ''
  let currentBodyLines = []

  const flush = () => {
    if (!currentTitle) {
      return
    }
    sections.push({
      id: `core-officials-${sections.length + 1}`,
      title: clean(currentTitle),
      body: currentBodyLines
        .join('\n')
        .replace(/\(on study\nleave\)/g, '(on study leave)')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    })
  }

  for (let index = Math.max(0, headingEnd + 1); index < lines.length; index += 1) {
    const line = lines[index]
    if (!line) {
      if (currentBodyLines.length > 0 && currentBodyLines.at(-1) !== '') {
        currentBodyLines.push('')
      }
      continue
    }

    if (sectionTitleLines.has(line)) {
      flush()
      currentTitle = line
      while (titleContinuationLines.has(lines[index + 1])) {
        index += 1
        currentTitle = `${currentTitle} ${lines[index]}`
      }
      currentBodyLines = []
      continue
    }

    if (currentTitle) {
      currentBodyLines.push(clean(line))
    }
  }
  flush()

  return {
    heading,
    subheading,
    sections,
  }
}

function parseAcademic(markdown) {
  const entries = []
  let year = ''
  let medal = ''
  let program = ''

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line === '---' || isTableSeparator(line)) {
      continue
    }

    const gradeMatch = line.match(/^##\s+(First Year|Second Year|Third Year|Fourth Year)$/)
    if (gradeMatch) {
      year = gradeLabels[gradeMatch[1]]
      continue
    }

    const medalMatch = line.match(/^###\s+.*\b(Gold|Silver|Bronze)\b/)
    if (medalMatch) {
      medal = medalLabels[medalMatch[1]]
      continue
    }

    const programMatch = line.match(/^####\s+(.+)$/)
    if (programMatch) {
      const code = clean(programMatch[1])
      program = programNames[code] ?? code
      continue
    }

    if (!line.startsWith('|')) {
      continue
    }

    const cells = splitRow(line)
    if (cells[0] === '#' || cells[1] === 'Name' || cells.length < 3) {
      continue
    }

    const name = normalizeStudentName(cells[1])
    if (!name || !year || !medal || !program) {
      continue
    }

    entries.push({
      gradeLevel: year,
      category: medal,
      award: program,
      name,
      gwa: Number.parseFloat(cells[2]),
    })
  }

  return entries
    .sort((left, right) => {
      const gradeDelta = gradeOrder.indexOf(left.gradeLevel) - gradeOrder.indexOf(right.gradeLevel)
      if (gradeDelta !== 0) {
        return gradeDelta
      }
      const medalDelta = medalOrder.indexOf(left.category) - medalOrder.indexOf(right.category)
      if (medalDelta !== 0) {
        return medalDelta
      }
      const programDelta = programOrder.indexOf(left.award) - programOrder.indexOf(right.award)
      if (programDelta !== 0) {
        return programDelta
      }
      const gwaDelta = left.gwa - right.gwa
      if (Number.isFinite(gwaDelta) && gwaDelta !== 0) {
        return gwaDelta
      }
      const lastNameDelta = getLastNameSortKey(left.name).localeCompare(getLastNameSortKey(right.name))
      if (lastNameDelta !== 0) {
        return lastNameDelta
      }
      return left.name.localeCompare(right.name)
    })
    .map((entry, index) => ({
      id: `academic-${index + 1}`,
      gradeLevel: entry.gradeLevel,
      category: entry.category,
      award: entry.award,
      name: entry.name,
    }))
}

function parseNonAcademic(markdown) {
  const entries = []
  const rawLines = markdown.split(/\r?\n/)
  const firstSectionIndex = rawLines.findIndex((line) => /^##\s+/.test(line.trim()))
  const preSectionLines = rawLines
    .slice(0, firstSectionIndex < 0 ? rawLines.length : firstSectionIndex)
    .map(clean)
    .filter((line) => line && !line.startsWith('#') && line !== 'Non-Academic Awards' && line !== '---')

  for (let index = 0; index < preSectionLines.length; index += 2) {
    const name = preSectionLines[index]
    const award = preSectionLines[index + 1]
    if (!name || !award) {
      continue
    }
    entries.push({
      id: `non-academic-${entries.length + 1}`,
      category: 'Individual Honors',
      award,
      name,
    })
  }

  let currentSection = ''
  let currentLevel = ''
  let currentAward = ''
  let blockLines = []

  const categoryForCurrentBlock = () =>
    [currentSection, currentLevel].filter(Boolean).join(' - ') || 'Non-Academic Awards'

  const isServiceListSection = () =>
    currentSection === 'College Service Awards' ||
    currentSection === 'Special Citation for Service'

  const flushBlock = () => {
    const lines = blockLines.map(clean).filter(Boolean)
    blockLines = []
    if (lines.length === 0) {
      return
    }

    const category = categoryForCurrentBlock()

    if (!currentAward) {
      if (currentSection === 'College Service Awards') {
        for (const line of lines) {
          entries.push({
            id: `non-academic-${entries.length + 1}`,
            category,
            award: line,
            name: '',
          })
        }
        return
      }
      entries.push({
        id: `non-academic-${entries.length + 1}`,
        category,
        award: category,
        name: lines.join('\n'),
      })
      return
    }

    if (/^Best Thesis\b/.test(currentSection) && programNames[currentAward]) {
      entries.push({
        id: `non-academic-${entries.length + 1}`,
        category,
        award: lines[0],
        name: lines.slice(1).join('\n'),
      })
      return
    }

    if (
      currentSection === 'Special Citation for Various Achievements' &&
      lines.length > 1 &&
      !looksLikePersonName(lines[0]) &&
      !/^(Adviser|Co-adviser|Mentor|Mentors):/i.test(lines[0])
    ) {
      entries.push({
        id: `non-academic-${entries.length + 1}`,
        category,
        award: lines[0],
        name: lines.slice(1).join('\n'),
      })
      return
    }

    const shouldUseFirstLineAsAwardDetail =
      lines.length > 1 &&
      !isServiceListSection() &&
      !looksLikePersonName(lines[0]) &&
      !/^Team\b/i.test(lines[0]) &&
      !/^(Adviser|Co-adviser|Mentor|Mentors):/i.test(lines[0])

    entries.push({
      id: `non-academic-${entries.length + 1}`,
      category,
      award: shouldUseFirstLineAsAwardDetail ? `${currentAward} - ${lines[0]}` : currentAward,
      name: (shouldUseFirstLineAsAwardDetail ? lines.slice(1) : lines).join('\n'),
    })
  }

  for (const rawLine of rawLines.slice(Math.max(0, firstSectionIndex))) {
    const line = rawLine.trim()

    if (!line || line === '---') {
      flushBlock()
      if (isServiceListSection()) {
        currentAward = ''
      }
      continue
    }

    const sectionMatch = line.match(/^##\s+(.+)$/)
    if (sectionMatch) {
      flushBlock()
      currentSection = clean(sectionMatch[1])
      currentLevel = ''
      currentAward = ''
      continue
    }

    const levelMatch = line.match(/^###\s+(.+)$/)
    if (levelMatch) {
      flushBlock()
      currentLevel = clean(levelMatch[1])
      currentAward = ''
      continue
    }

    const awardMatch = line.match(/^\*\*(.+?)\*\*$/)
    if (awardMatch) {
      flushBlock()
      currentAward = clean(awardMatch[1])
      continue
    }

    if (line.startsWith('|') && !isTableSeparator(line)) {
      const cells = splitRow(line)
      if (cells.length >= 2 && cells.some(Boolean)) {
        blockLines.push(cells.filter(Boolean).join(' - '))
      }
      continue
    }

    blockLines.push(line)
  }
  flushBlock()

  return entries
}

const academicEntries = parseAcademic(readFileSync('acad-awards.md', 'utf8'))
const nonAcademicEntries = parseNonAcademic(readFileSync('non-acad-awards.md', 'utf8'))
const officials = parseOfficials(readFileSync('officials.md', 'utf8'))
const programRows = parseProgram(readFileSync('program.md', 'utf8'))

const booklet = {
  version: 1,
  title: 'PARANGAL 2026 - CICT Recognition Booklet',
  exportedAt: '2026-05-18T00:00:00.000Z',
  frontCover: null,
  backCover: null,
  settings: {
    globalScale: 1,
    titleSize: 18,
    subtitleSize: 12,
    headingSize: 12,
    bodySize: 11.5,
    headingFont: 'helvetica',
    bodyFont: 'times',
    metaSize: 10.75,
    pageNumberSize: 10,
    pagePaddingTop: 36,
    pagePaddingBottom: 30,
    pagePaddingX: 40,
    columnGap: 14,
    lineHeight: 1.1,
    showPageNumbers: true,
    documentYear: '2025-2026',
    borderEnabled: false,
    borderStyle: 'simple',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderPadding: 12,
    borderSeparateSides: false,
    borderSvgLeft: null,
    borderSvgRight: null,
  },
  pages: [
    {
      id: 'core-officials-2026',
      order: 0,
      type: 'core',
      title: 'College Officials',
      content: {
        heading: officials.heading,
        subheading: officials.subheading,
        sections: officials.sections,
      },
    },
    {
      id: 'program-main-2026',
      order: 1,
      type: 'program',
      title: 'Program Flow',
      content: {
        heading: 'PROGRAM',
        rows: programRows,
      },
    },
    {
      id: 'academic-awards-2026',
      order: 2,
      type: 'academic',
      title: 'Academic Awardees',
      content: {
        heading: 'ACADEMIC AWARDEES',
        entries: academicEntries,
      },
    },
    {
      id: 'non-academic-awards-2026',
      order: 3,
      type: 'non-academic',
      title: 'Non-Academic Awardees',
      content: {
        heading: 'NON-ACADEMIC AWARDEES',
        entries: nonAcademicEntries,
      },
    },
  ],
}

writeFileSync('docs/parangal-2026-awards-import.json', `${JSON.stringify(booklet, null, 2)}\n`)

console.log(`Wrote docs/parangal-2026-awards-import.json`)
console.log(`Official sections: ${officials.sections.length}`)
console.log(`Program rows: ${programRows.length}`)
console.log(`Academic entries: ${academicEntries.length}`)
console.log(`Non-academic entries: ${nonAcademicEntries.length}`)
console.log(`Total entries: ${academicEntries.length + nonAcademicEntries.length}`)

for (const page of booklet.pages) {
  if ('entries' in page.content) {
    const categories = new Set(page.content.entries.map((entry) => entry.category))
    console.log(`${page.title}: ${categories.size} categories`)
  }
}
