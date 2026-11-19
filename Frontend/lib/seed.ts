import type { Exam, LearningModule, Submission, Teacher } from './types'

export const DEMO_TEACHER: Teacher & { password: string } = {
  name: 'Bu Sari Wulandari',
  email: 'guru@demo.id',
  password: 'demo1234',
}

export const SEED_MODULES: LearningModule[] = [
  {
    id: 'mod-fotosintesis',
    title: 'Fotosintesis pada tumbuhan',
    teacherName: DEMO_TEACHER.name,
    createdAt: '2026-11-10T08:00:00.000Z',
    originalText:
      'Fotosintesis adalah proses tumbuhan hijau membuat makanannya sendiri. Proses ini terjadi di daun, tepatnya di kloroplas yang mengandung klorofil. Bahan yang dibutuhkan adalah air, karbon dioksida, dan cahaya matahari. Hasilnya adalah glukosa dan oksigen.',
    blindAudioScript:
      'Selamat datang di materi fotosintesis. Fotosintesis adalah cara tumbuhan hijau membuat makanannya sendiri.\n\nProses ini terjadi di daun. Di dalam daun ada bagian kecil bernama kloroplas. Kloroplas berisi zat hijau yang disebut klorofil. Klorofil menangkap cahaya matahari.\n\nTumbuhan membutuhkan tiga bahan. Pertama, air yang diserap akar dari tanah. Kedua, karbon dioksida dari udara yang masuk lewat pori-pori daun. Ketiga, cahaya matahari.\n\nDari ketiga bahan itu, tumbuhan menghasilkan dua hal. Pertama, glukosa, yaitu gula yang menjadi makanan tumbuhan. Kedua, oksigen, yang dilepas ke udara dan kita hirup setiap hari.\n\nRingkasnya: air ditambah karbon dioksida ditambah cahaya, menjadi glukosa dan oksigen. Materi selesai.',
    deafVisualSummary: {
      summary:
        'Fotosintesis adalah cara tumbuhan hijau membuat makanan sendiri memakai air, karbon dioksida, dan cahaya matahari.',
      sections: [
        { title: 'Tempat terjadinya', points: ['Terjadi di daun', 'Di dalam kloroplas', 'Klorofil menangkap cahaya'] },
        { title: 'Bahan yang dibutuhkan', points: ['Air dari akar', 'Karbon dioksida dari udara', 'Cahaya matahari'] },
        { title: 'Hasil fotosintesis', points: ['Glukosa sebagai makanan', 'Oksigen dilepas ke udara'] },
      ],
      conceptMap: { center: 'Fotosintesis', branches: ['Daun', 'Klorofil', 'Air', 'Karbon dioksida', 'Cahaya', 'Glukosa', 'Oksigen'] },
      glossary: [
        { term: 'Klorofil', meaning: 'Zat hijau daun yang menangkap cahaya matahari.' },
        { term: 'Kloroplas', meaning: 'Bagian sel daun tempat fotosintesis terjadi.' },
        { term: 'Glukosa', meaning: 'Gula hasil fotosintesis, makanan bagi tumbuhan.' },
        { term: 'Stomata', meaning: 'Pori-pori kecil di daun untuk keluar masuk udara.' },
      ],
    },
  },
  {
    id: 'mod-tata-surya',
    title: 'Mengenal tata surya',
    teacherName: 'Pak Andi Pratama',
    createdAt: '2026-11-04T08:00:00.000Z',
    originalText:
      'Tata surya terdiri dari matahari sebagai pusat dan delapan planet yang mengelilinginya. Planet terdekat adalah Merkurius dan terjauh adalah Neptunus. Bumi adalah planet ketiga.',
    blindAudioScript:
      'Ini materi tata surya. Tata surya adalah kumpulan benda langit dengan matahari sebagai pusatnya.\n\nAda delapan planet yang mengelilingi matahari. Urutannya dari yang terdekat: Merkurius, Venus, Bumi, Mars, Jupiter, Saturnus, Uranus, dan Neptunus.\n\nBumi adalah planet ketiga dari matahari. Bumi satu-satunya planet yang diketahui memiliki kehidupan.\n\nJupiter adalah planet terbesar. Saturnus terkenal dengan cincinnya yang indah. Materi selesai.',
    deafVisualSummary: {
      summary: 'Tata surya terdiri dari matahari sebagai pusat dan delapan planet yang mengelilinginya.',
      sections: [
        { title: 'Pusat tata surya', points: ['Matahari adalah pusat', 'Semua planet mengelilingi matahari'] },
        { title: 'Urutan planet', points: ['Merkurius, Venus, Bumi, Mars', 'Jupiter, Saturnus, Uranus, Neptunus'] },
        { title: 'Fakta menarik', points: ['Bumi planet ketiga', 'Jupiter planet terbesar', 'Saturnus punya cincin'] },
      ],
      conceptMap: { center: 'Tata surya', branches: ['Matahari', 'Planet dalam', 'Planet luar', 'Bumi', 'Orbit'] },
      glossary: [
        { term: 'Orbit', meaning: 'Jalur lintasan planet saat mengelilingi matahari.' },
        { term: 'Planet', meaning: 'Benda langit besar yang mengelilingi bintang.' },
      ],
    },
  },
]

export const SEED_EXAMS: Exam[] = [
  {
    id: 'exam-fotosintesis',
    title: 'Ulangan harian fotosintesis',
    pin: '1234',
    moduleId: 'mod-fotosintesis',
    status: 'active',
    createdAt: '2026-11-11T08:00:00.000Z',
    questions: [
      {
        id: 1,
        text: 'Di bagian tumbuhan manakah fotosintesis terutama terjadi?',
        options: { A: 'Akar', B: 'Daun', C: 'Batang', D: 'Bunga' },
        answer: 'B',
      },
      {
        id: 2,
        text: 'Zat hijau daun yang menangkap cahaya matahari disebut apa?',
        options: { A: 'Klorofil', B: 'Glukosa', C: 'Oksigen', D: 'Stomata' },
        answer: 'A',
      },
      {
        id: 3,
        text: 'Gas apa yang diambil tumbuhan dari udara untuk fotosintesis?',
        options: { A: 'Oksigen', B: 'Nitrogen', C: 'Karbon dioksida', D: 'Hidrogen' },
        answer: 'C',
      },
      {
        id: 4,
        text: 'Apa makanan yang dihasilkan tumbuhan dari fotosintesis?',
        options: { A: 'Protein', B: 'Lemak', C: 'Vitamin', D: 'Glukosa' },
        answer: 'D',
      },
      {
        id: 5,
        text: 'Gas apa yang dilepas tumbuhan ke udara setelah fotosintesis?',
        options: { A: 'Oksigen', B: 'Karbon dioksida', C: 'Uap besi', D: 'Amonia' },
        answer: 'A',
      },
    ],
  },
  {
    id: 'exam-tata-surya',
    title: 'Kuis tata surya',
    pin: '5678',
    moduleId: 'mod-tata-surya',
    status: 'active',
    createdAt: '2026-11-05T08:00:00.000Z',
    questions: [
      {
        id: 1,
        text: 'Planet ke berapakah Bumi jika dihitung dari matahari?',
        options: { A: 'Pertama', B: 'Kedua', C: 'Ketiga', D: 'Keempat' },
        answer: 'C',
      },
      {
        id: 2,
        text: 'Planet apakah yang paling besar di tata surya?',
        options: { A: 'Jupiter', B: 'Mars', C: 'Venus', D: 'Merkurius' },
        answer: 'A',
      },
    ],
  },
]

export const SEED_SUBMISSIONS: Submission[] = [
  {
    id: 'sub-1',
    examId: 'exam-fotosintesis',
    attemptId: 'seed-1',
    studentName: 'Rafi',
    answers: { 1: 'B', 2: 'A', 3: 'C', 4: 'D', 5: 'B' },
    correctCount: 4,
    totalQuestions: 5,
    answeredCount: 5,
    score: 80,
    createdAt: '2026-11-12T03:10:00.000Z',
  },
  {
    id: 'sub-2',
    examId: 'exam-fotosintesis',
    attemptId: 'seed-2',
    studentName: 'Nadia',
    answers: { 1: 'B', 2: 'A', 3: 'C', 4: 'D', 5: 'A' },
    correctCount: 5,
    totalQuestions: 5,
    answeredCount: 5,
    score: 100,
    createdAt: '2026-11-12T03:25:00.000Z',
  },
  {
    id: 'sub-3',
    examId: 'exam-tata-surya',
    attemptId: 'seed-3',
    studentName: 'Dimas',
    answers: { 1: 'C', 2: null },
    correctCount: 1,
    totalQuestions: 2,
    answeredCount: 1,
    score: 50,
    createdAt: '2026-11-06T02:00:00.000Z',
  },
]
