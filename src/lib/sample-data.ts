import type { CmsPage, CmsSettings } from '@/types/cms'

export const defaultSettings: CmsSettings = {
  globalScale: 1,
  titleSize: 18,
  subtitleSize: 12,
  headingSize: 12,
  bodySize: 11.5,
  metaSize: 10.75,
  pageNumberSize: 10,
  pagePaddingTop: 36,
  pagePaddingBottom: 30,
  pagePaddingX: 40,
  columnGap: 14,
  lineHeight: 1.1,
  showPageNumbers: true,
  documentYear: (() => {
    const now = new Date()
    const year = now.getFullYear()
    // Academic year starts in July; before July we are still in the previous year's cycle
    const startYear = now.getMonth() >= 6 ? year : year - 1
    return `${startYear}–${startYear + 1}`
  })(),
}

export const seedPages: CmsPage[] = [
  {
    id: 'core-officials',
    order: 0,
    type: 'core',
    title: 'College Officials',
    content: {
      heading: 'WEST VISAYAS STATE UNIVERSITY\nCOLLEGE OF INFORMATION AND COMMUNICATIONS TECHNOLOGY',
      subheading: 'College and division officials',
      sections: [
        {
          id: 'core-officials-dean',
          title: 'Dean',
          body: 'Dr. Ma. Beth S. Concepcion',
        },
        {
          id: 'core-officials-secretary',
          title: 'College Secretary',
          body: 'Mr. Neiljan C. Raborar',
        },
        {
          id: 'core-officials-is',
          title: 'Department of Information Systems',
          body: 'Chair: Dr. Regin A. Cabacas\n\nInformation Systems\nPermanent Faculty:\nDr. Ma. Beth S. Concepcion\nDr. Nikie Jo E. Deocampo\nProf. Erwin D. Osorio\nMr. Neiljan C. Raborar\nMr. Shem Durst Elijah B. Sandig\n\nPart-time Lecturers:\nMr. Keith C. Censoro\nMr. John Anthony R. Eleccion\nMrs. Ma. Joanna Garganera-Legislador\nMr. Sigen Mark C. Miranda',
        },
        {
          id: 'core-officials-demc',
          title: 'Division of Entertainment and Multimedia Computing',
          body: 'Chair: Dr. Evan C. Sumido\n\nPermanent Faculty:\nMs. Janine P. Defante\nProf. Karen Alinor J. Dumpit (on study leave)\nMr. Mark Joseph S. Solidarios\n\nPart-time Lecturers:\nMr. Ruel D. Benliro, Jr.\nMs. Christ Mae E. Diaz\nMs. Christy G. Villano',
        },
        {
          id: 'core-officials-it',
          title: 'Division of Information Technology',
          body: 'Chair: Dr. Frank I. Elijorde\n\nPermanent Faculty:\nMr. Christian Cadiz\nProf. Cyreneo S. Dofitas Jr. (on study leave)\nDr. Cheryll Ann N. Feliprada\nDr. Lea M. Gabawa\n\nPart-time Lecturers:\nMs. Keia Joy H. Armada\nMr. Ryan Christian L. Payunan\nMs. Angelica Grace P. Simbran',
        },
        {
          id: 'core-officials-cs',
          title: 'Division of Computer Science',
          body: 'Chair: Dr. Ralph Voltaire J. Dayot\n\nPermanent Faculty:\nDr. Bobby D. Gerardo (on secondment)\nMr. John Cristopher A. Mateo\nDr. Ma. Luche P. Sabayle\nDr. Arnel N. Secondes\n\nPart-time Lecturers:\nMr. Orlando C. Cabillos\nMr. Gene Caleb C. Carbonilla\nMr. Louie F. Cervantes\nMr. John Cairo Q. Minerva\nDr. Felipe P. Vista IV',
        },
      ],
    },
  },
  {
    id: 'program-main',
    order: 1,
    type: 'program',
    title: 'Program Flow',
    content: {
      heading: 'PROGRAM',
      rows: [
        {
          id: 'program-1',
          leftTitle: 'Processional',
          leftBody:
            'Student Awardees & Parents • Faculty & Staff • Dean • University Officials • Guest Speaker',
          rightTitle: 'Awarding of Plaque of Appreciation to the Guest Speaker',
          rightBody: 'Dr. Ma. Beth S. Concepcion\nDean, CICT',
        },
        {
          id: 'program-2',
          leftTitle: 'Entrance of Colors',
          leftBody:
            'Von Ashley P. Chichirita • Kyla B. Bearneza • Dr. Ma. Beth S. Concepcion • Dean, CICT',
          rightTitle: 'Presentation of Non-Academic Awards',
          rightBody: 'to be awarded by\nDr. Ma. Beth S. Concepcion\nDean, CICT',
        },
        {
          id: 'program-3',
          leftTitle: 'Philippine National Anthem (AVP)',
          leftBody: 'Invocation (AVP) • Opening Remarks • Dr. Ma. Beth S. Concepcion • Dean, CICT',
          rightTitle: 'Intermission Number',
          rightBody: 'to be assisted by\nDr. Ma. Pilar S. Malata\nDean of Students, OSA',
        },
        {
          id: 'program-4',
          leftTitle: 'Message',
          leftBody: 'Dr. Ma. Asuncion Christine V. Dequilla\nVP for Academic Affairs',
          rightTitle: 'Presentation of Academic Awards',
          rightBody: 'Arrizza Bea G. Alcobilla\nBSIS 4B',
        },
        {
          id: 'program-5',
          leftTitle: 'Introduction of the Guest Speaker',
          leftBody: 'Mr. Neiljan C. Raborar • College Secretary, CICT • Co-chair, CICT Parangal',
          rightTitle: 'Inspirational Message',
          rightBody: 'PLt. Wallen Mae DS Arancillo\nSpokesperson, PNP Anti-Cybercrime Group\n(BSIS Batch 2012)',
        },
        {
          id: 'program-6',
          leftTitle: 'Awarding of Certificate of Recognition for Meritorious Service',
          leftBody:
            'Dr. Joel T. De Castro (Dean, Oct 1, 2011 – Feb 14, 2020) • Dr. Ma. Beth S. Concepcion • Dean, CICT',
          rightTitle: 'Message',
          rightBody: 'Kyla B. Bearneza\nDean\'s Medal of Excellence Awardee\nMost Outstanding CICT Graduate in Academics',
        },
        {
          id: 'program-7',
          leftTitle: 'Curriculum Video',
          leftBody: 'Closing Message • Dr. Ralph Voltaire J. Dayot • Chair, CICT Parangal',
          rightTitle: 'Intermission Number',
          rightBody: 'John Daxen I. Occeño\nBSIT 4B',
        },
        {
          id: 'program-8',
          leftTitle: 'WVSU March',
          leftBody: 'Exit of Colors',
          rightTitle: 'Master of Ceremonies',
          rightBody: 'Mr. Shem Durst Elijah B. Sandig\nFaculty, CICT',
        },
      ],
    },
  },
  {
    id: 'academic-awards',
    order: 2,
    type: 'academic',
    title: 'Academic Awardees',
    content: {
      heading: 'ACADEMIC AWARDEES',
      entries: [
        { id: 'acad-1', gradeLevel: '4th Year Curriculum', category: 'Silver Medals', award: 'Bachelor of Science in Computer Science', name: 'Von Ashley P. Chichirita' },
        { id: 'acad-2', gradeLevel: '4th Year Curriculum', category: 'Silver Medals', award: 'Bachelor of Science in Computer Science', name: 'James Joseph L. Cuadra' },
        { id: 'acad-3', gradeLevel: '4th Year Curriculum', category: 'Silver Medals', award: 'Bachelor of Science in Entertainment and Multimedia Computing', name: 'Anthony Joseph Vincent C. Castillon' },
        { id: 'acad-4', gradeLevel: '4th Year Curriculum', category: 'Silver Medals', award: 'Bachelor of Science in Information Systems', name: 'Lyka L. Lamigo' },
        { id: 'acad-5', gradeLevel: '4th Year Curriculum', category: 'Silver Medals', award: 'Bachelor of Science in Information Technology', name: 'Kaye B. Bearneza' },
        { id: 'acad-6', gradeLevel: '4th Year Curriculum', category: 'Silver Medals', award: 'Bachelor of Science in Information Technology', name: 'Kyla B. Bearneza' },
        { id: 'acad-7', gradeLevel: '4th Year Curriculum', category: 'Silver Medals', award: 'Bachelor of Science in Information Technology', name: 'John Willemstad A. Osuyos' },
        { id: 'acad-8', gradeLevel: '4th Year Curriculum', category: 'Silver Medals', award: 'Bachelor of Science in Information Technology', name: 'Angelica Louise T. Allones' },
        { id: 'acad-9', gradeLevel: '4th Year Curriculum', category: 'Silver Medals', award: 'Bachelor of Science in Information Technology', name: 'Kiani R. Clementir' },
        { id: 'acad-10', gradeLevel: '4th Year Curriculum', category: 'Silver Medals', award: 'Bachelor of Science in Information Technology', name: 'Mary Joy O. Consular' },
        { id: 'acad-11', gradeLevel: '4th Year Curriculum', category: 'Gold Medals', award: 'Bachelor of Library and Information Science', name: 'Lyka Isabelle P. Casidsid' },
        { id: 'acad-12', gradeLevel: '4th Year Curriculum', category: 'Gold Medals', award: 'Bachelor of Library and Information Science', name: 'Leizelle May A. Beso' },
        { id: 'acad-13', gradeLevel: '4th Year Curriculum', category: 'Gold Medals', award: 'Bachelor of Library and Information Science', name: 'Jeneva Therese Mae S. Cercado' },
        { id: 'acad-14', gradeLevel: '4th Year Curriculum', category: 'Gold Medals', award: 'Bachelor of Science in Computer Science', name: 'Angel Jude S. Diones' },
        { id: 'acad-15', gradeLevel: '4th Year Curriculum', category: 'Gold Medals', award: 'Bachelor of Science in Computer Science', name: 'EJ Prince D. Sevilleno' },
        { id: 'acad-16', gradeLevel: '4th Year Curriculum', category: 'Gold Medals', award: 'Bachelor of Science in Computer Science', name: 'Rovalen Joy U. Calaguing' },
        { id: 'acad-17', gradeLevel: '3rd Year Curriculum', category: 'Gold Medals', award: 'Bachelor of Science in Information Technology', name: 'Jaspher John C. Ebarle' },
        { id: 'acad-18', gradeLevel: '3rd Year Curriculum', category: 'Gold Medals', award: 'Bachelor of Science in Information Technology', name: 'Conchito C. Ledesma' },
        { id: 'acad-19', gradeLevel: '2nd Year Curriculum', category: 'Bronze Medals', award: 'Bachelor of Science in Entertainment and Multimedia Computing', name: 'Peavey R. Cabrera' },
        { id: 'acad-20', gradeLevel: '2nd Year Curriculum', category: 'Bronze Medals', award: 'Bachelor of Science in Entertainment and Multimedia Computing', name: 'Sean Gerald V. Genona' },
        { id: 'acad-21', gradeLevel: '2nd Year Curriculum', category: 'Bronze Medals', award: 'Bachelor of Science in Information Systems', name: 'Isiah James T. Nasalga' },
        { id: 'acad-22', gradeLevel: '2nd Year Curriculum', category: 'Bronze Medals', award: 'Bachelor of Science in Information Systems', name: 'Judeah Pauline B. Reynaldo' },
        { id: 'acad-23', gradeLevel: '1st Year Curriculum', category: 'Bronze Medals', award: 'Bachelor of Science in Information Technology', name: 'Chelson Clyde Khalil B. Laud' },
        { id: 'acad-24', gradeLevel: '1st Year Curriculum', category: 'Bronze Medals', award: 'Bachelor of Science in Information Technology', name: 'Mark Alvin C. Cadangin' },
      ],
    },
  },
  {
    id: 'non-academic-awards',
    order: 3,
    type: 'non-academic',
    title: 'Non-Academic Awardees',
    content: {
      heading: 'NON-ACADEMIC AWARDEES',
      entries: [
        { id: 'non-1', category: 'Individual Honors', name: 'Kyla B. Bearneza', award: "Dean's Medal for Excellence in Academics" },
        { id: 'non-2', category: 'Individual Honors', name: 'Reeman L. Singh', award: "Dean's Medal for Excellence in Innovation" },
        { id: 'non-3', category: 'Individual Honors', name: 'Von Ashley P. Chichirita', award: "Dean's Medal for Excellence in Leadership" },
        { id: 'non-4', category: 'Individual Honors', name: 'Lyka Isabelle P. Casidsid', award: 'Most Outstanding Graduate - BLIS' },
        { id: 'non-5', category: 'Individual Honors', name: 'Angel Jude S. Diones', award: 'Most Outstanding Graduate - BSCS' },
        { id: 'non-6', category: 'Individual Honors', name: 'Mark Kian A. Saludares', award: 'Most Outstanding Graduate - BSEMC' },
        { id: 'non-7', category: 'Leadership Award', name: 'Dianna Rose A. Souribio', award: 'Leadership Award' },
        { id: 'non-8', category: 'CICT Student Council', name: 'Lawrence Andrew C. Arre', award: 'CICT Student Council' },
        { id: 'non-9', category: 'CICT Student Council', name: 'Ian Harvey P. Yap', award: 'CICT Student Council' },
        { id: 'non-10', category: 'CICT Student Council', name: 'Ian Marvin C. Hubag', award: 'CICT Student Council' },
        { id: 'non-11', category: 'CICT Student Council', name: 'Athena S. Villarin', award: 'CICT Student Council' },
        { id: 'non-12', category: 'College Service Awards', name: 'Radge Matthew T. Señeres', award: 'College Service Awards' },
        { id: 'non-13', category: 'College Service Awards', name: 'Nicholas Robert T. Saraet', award: 'College Service Awards' },
        { id: 'non-14', category: 'ICON Publication', name: 'Dallas A. Aquino', award: 'ICON Publication' },
        { id: 'non-15', category: 'ICON Publication', name: 'Pzalm Franzenne F. Begasin', award: 'ICON Publication' },
        { id: 'non-16', category: 'CIPHER', name: 'Lean Vince A. Cabales', award: 'CIPHER' },
        { id: 'non-17', category: 'CIPHER', name: 'Justin Jones P. Brey', award: 'CIPHER' },
        { id: 'non-18', category: 'Athenaeum Keepers', name: 'Louise Angelika P. Pahilanga', award: 'Athenaeum Keepers' },
        { id: 'non-19', category: 'Athenaeum Keepers', name: 'Keisha Julber C. Nonato', award: 'Athenaeum Keepers' },
        { id: 'non-20', category: 'Research Poster Presentation', name: 'Karen Madoline A. Cabrillos', award: 'Image Classification Based Remote Sensing Analysis of Land Zoning and Schedule of Uses Classification for Opportunity Zones Recommendation' },
      ],
    },
  },
  {
    id: 'core-programs',
    order: 4,
    type: 'core',
    title: 'College Programs',
    content: {
      heading: 'COLLEGE PROGRAMS',
      sections: [
        {
          id: 'core-programs-bsis',
          title: 'Bachelor of Science in Information Systems',
          body: 'Bachelor of Science in Information Systems (BSIS) program, formerly known as BS in Information Management, aims to equip students with the knowledge, skills, and attitude in the design and implementation of solutions that integrate information technology with business processes. This program prepares students to be IT professionals that could harness ICT as a strategic resource to meet business and organizational objectives.',
        },
        {
          id: 'core-programs-bsit',
          title: 'Bachelor of Science in Information Technology',
          body: 'The Bachelor of Science in Information Technology (BSIT) program aims to produce quality graduates who study, analyze, design, develop, implement, and evaluate ICT solutions. The program focuses on the use of ICT for a variety of applications such as in business, governance, education, personal and entertainment.',
        },
        {
          id: 'core-programs-mit',
          title: 'Master of Information Technology',
          body: 'The Master of Information Technology degree is designed for IT professionals looking to update and extend their technical knowledge of advanced computing subjects, or move into a new IT specialisation. Internationally recognised, it can help advance your career in diverse fields such as software engineering, health, telecommunications and more.',
        },
        {
          id: 'core-programs-closing',
          title: 'Aurelia Vitrum Gala',
          body: 'A celebration of timeless success and resilience, reflecting modern excellence in academic recognition, college service, leadership, and innovation.',
        },
      ],
    },
  },
]
