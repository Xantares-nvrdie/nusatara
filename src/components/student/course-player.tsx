'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  Download,
  FileText,
  Flag,
  GraduationCap,
  Info,
  Lightbulb,
  Maximize2,
  MessageSquare,
  Paperclip,
  Pause,
  Play,
  Search,
  Send,
  Sparkles,
  Subtitles,
  ThumbsUp,
  Volume2,
  X,
} from 'lucide-react'
import { EmptyState, Skeleton } from '@/components/site/form'
import { fetchModuleById, useHydrated, useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { VisualSummaryView } from '@/components/module/visual-summary'

export type LessonStatus = 'completed' | 'currently-learning' | 'not-started'

export interface LessonData {
  id: string
  number: string
  title: string
  chapterNumber: string
  chapterTitle: string
  duration: string
  status: LessonStatus
  contentType: 'video-article' | 'visual-concept' | 'interactive-quiz' | 'deep-dive'
  summary?: string
  paragraphs: string[]
  keyFacts?: string[]
  callout?: {
    type: 'tip' | 'info' | 'important'
    title: string
    text: string
  }
  codeSnippet?: {
    language: string
    title: string
    code: string
  }
  video?: {
    title: string
    duration: string
    posterColor: string
  }
  quickQuiz?: {
    question: string
    options: string[]
    correctIndex: number
    explanation: string
  }
}

export interface ChapterData {
  id: string
  number: string
  title: string
  lessons: LessonData[]
}

export interface DiscussionItem {
  id: string
  userName: string
  role: 'Guru' | 'Siswa'
  avatarColor: string
  timestamp: string
  content: string
  likes: number
  repliesCount: number
}

export interface DownloadableFile {
  id: string
  name: string
  size: string
  extension: 'pdf' | 'png' | 'xlsx' | 'docx'
  category: string
}

const SAMPLE_DISCUSSIONS: DiscussionItem[] = [
  {
    id: 'disc-1',
    userName: 'Pak Andi Pratama',
    role: 'Guru',
    avatarColor: 'bg-emerald-600',
    timestamp: '2 jam yang lalu',
    content:
      'Perhatikan perbedaan kecepatan revolusi planet dalam dan luar. Semakin dekat dengan matahari, gravitasi semakin kuat sehingga planet bergerak lebih cepat!',
    likes: 8,
    repliesCount: 2,
  },
  {
    id: 'disc-2',
    userName: 'Siti Rahma',
    role: 'Siswa',
    avatarColor: 'bg-purple-600',
    timestamp: '1 jam yang lalu',
    content:
      'Apakah cincin Saturnus itu padat seperti piringan atau terdiri dari partikel-partikel terpisah?',
    likes: 4,
    repliesCount: 1,
  },
  {
    id: 'disc-3',
    userName: 'Budi Santoso',
    role: 'Siswa',
    avatarColor: 'bg-blue-600',
    timestamp: '35 menit yang lalu',
    content:
      'Peta konsepnya sangat membantu membedakan karakteristik planet terrestrial vs gas giants!',
    likes: 5,
    repliesCount: 0,
  },
]

const SAMPLE_FILES: DownloadableFile[] = [
  {
    id: 'file-1',
    name: 'Modul_Ringkasan_Tata_Surya.pdf',
    size: '2.4 MB',
    extension: 'pdf',
    category: 'Materi Utama',
  },
  {
    id: 'file-2',
    name: 'Peta_Konsep_Visual_Sistem_Planet.png',
    size: '1.8 MB',
    extension: 'png',
    category: 'Infografis',
  },
  {
    id: 'file-3',
    name: 'Tabel_Data_Fisik_Planet.xlsx',
    size: '340 KB',
    extension: 'xlsx',
    category: 'Data Tambahan',
  },
  {
    id: 'file-4',
    name: 'Kamus_Istilah_Astronomi.docx',
    size: '520 KB',
    extension: 'docx',
    category: 'Glosarium',
  },
]

export function CoursePlayer({ id }: { id: string }) {
  const hydrated = useHydrated()
  const mod = useStore((s) => s.modules.find((m) => m.id === id))
  const [loading, setLoading] = useState(!mod || !mod.blindAudioScript)

  // Notification Banner
  const [showNotification, setShowNotification] = useState(true)

  // Sidebar Tab: 'content' | 'discussion' | 'files'
  const [sidebarTab, setSidebarTab] = useState<'content' | 'discussion' | 'files'>('content')

  // Search in Content Tab
  const [searchQuery, setSearchQuery] = useState('')

  // Expandable chapters state
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({
    'chap-1': true,
    'chap-2': true,
    'chap-3': true,
  })

  // Mobile drawer open state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  // Interactive Quiz state
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null)
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  // Discussion state
  const [discussions, setDiscussions] = useState<DiscussionItem[]>(SAMPLE_DISCUSSIONS)
  const [newComment, setNewComment] = useState('')

  // Report Issue toast state
  const [reportedToast, setReportedToast] = useState(false)

  // Download simulation toast state
  const [downloadToast, setDownloadToast] = useState<string | null>(null)

  // Video playback simulation
  const [isPlayingVideo, setIsPlayingVideo] = useState(false)

  // Prepare full curriculum
  const chapters: ChapterData[] = useMemo(() => {
    return [
      {
        id: 'chap-1',
        number: '1.0',
        title: '1.0 Pusat & Fondasi Tata Surya',
        lessons: [
          {
            id: 'les-1-1',
            number: '1.1',
            title: 'Matahari sebagai Pusat Tata Surya',
            chapterNumber: 'Bab 1',
            chapterTitle: 'Pusat & Fondasi Tata Surya',
            duration: '8 mins',
            status: 'completed',
            contentType: 'video-article',
            paragraphs: [
              'Tata surya kita adalah sistem terikat gravitasi yang terdiri dari Matahari dan benda-benda langit yang mengelilinginya, baik secara langsung maupun tidak langsung. Di antara benda-benda yang mengitari Matahari secara langsung, yang terbesar adalah delapan planet, dengan sisanya merupakan benda-benda yang lebih kecil seperti planet kerdil dan benda kecil tata surya.',
              'Matahari merupakan sebuah bintang tipe G yang berada di pusat tata surya. Sekitar 99,86% dari massa total tata surya terkonsentrasi di dalam Matahari. Massa yang sangat masif ini menciptakan gaya gravitasi yang sangat dominan, menjaga planet-planet, asteroid, komet, dan puing-puing kosmik tetap mengorbit pada jalurnya.',
              'Energi matahari dihasilkan melalui proses reaksi fusi termonuklir di bagian intinya, di mana atom-atom hidrogen bergabung membentuk helium pada suhu sekitar 15 juta derajat Celsius. Energi ini dipancarkan dalam bentuk radiasi elektromagnetik, termasuk cahaya tampak dan panas yang esensial bagi kelangsungan hidup di Bumi.',
            ],
            keyFacts: [
              'Matahari mengandung 99,86% dari seluruh massa tata surya.',
              'Jarak rata-rata Bumi ke Matahari adalah 1 Satuan Astronomi (150 juta km).',
              'Cahaya matahari membutuhkan waktu sekitar 8 menit 20 detik untuk sampai ke Bumi.',
              'Suhu permukaan matahari (fotosfer) mencapai sekitar 5.500 °C.',
            ],
            callout: {
              type: 'important',
              title: 'Catatan Konsep: Mengapa Planet Tidak Jatuh ke Matahari?',
              text: 'Planet tidak jatuh ke dalam Matahari karena mereka memiliki kecepatan orbit menyamping yang sangat tinggi. Keseimbangan antara gaya gravitasi matahari yang menarik ke dalam dan inersia gerak planet menghasilkan orbit elips yang stabil.',
            },
            codeSnippet: {
              language: 'json',
              title: 'Data Karakteristik Fisis Matahari',
              code: `{\n  "nama": "Matahari (Sol)",\n  "tipe_spektral": "G2V (Yellow Dwarf)",\n  "massa": "1.989 × 10^30 kg",\n  "radius": "696.340 km",\n  "periode_rotasi_ekuator": "25 hari",\n  "komposisi": {\n    "hidrogen": "73.4%",\n    "helium": "25.0%",\n    "unsur_berat": "1.6%"\n  }\n}`,
            },
            video: {
              title: 'Animasi Pembelajaran: Struktur Anatomi Matahari & Gravitasi Orbit',
              duration: '04:15',
              posterColor: 'from-amber-500 to-orange-700',
            },
            quickQuiz: {
              question: 'Berapa persentase perkiraan massa total tata surya yang terkonsentrasi di dalam Matahari?',
              options: ['Sekitar 50%', 'Sekitar 75%', 'Sekitar 90%', 'Sekitar 99,8%'],
              correctIndex: 3,
              explanation: 'Matahari mendominasi tata surya kita dengan menguasai sekitar 99,86% dari seluruh massa tata surya.',
            },
          },
          {
            id: 'les-1-2',
            number: '1.2',
            title: 'Dinamika Gravitasi & Lintasan Orbit',
            chapterNumber: 'Bab 1',
            chapterTitle: 'Pusat & Fondasi Tata Surya',
            duration: '7 mins',
            status: 'completed',
            contentType: 'deep-dive',
            paragraphs: [
              'Gerakan planet-planet mengitari matahari diatur oleh Hukum Pergerakan Planet yang dirumuskan oleh Johannes Kepler pada awal abad ke-17, yang kemudian dijelaskan secara fisika matematis oleh Sir Isaac Newton melalui Hukum Gravitasi Universal.',
              'Hukum Kepler Pertama menyatakan bahwa semua planet bergerak dalam lintasan elips dengan Matahari berada di salah satu titik fokusnya. Ini berarti jarak antara planet dan matahari selalu berubah-ubah sepanjang tahun orbitnya.',
              'Titik di mana planet berada pada posisi terdekat dengan Matahari disebut Perihelion, sedangkan titik terjauhnya disebut Aphelion. Kecepatan orbit planet meningkat saat mendekati perihelion dan melambat saat mendekati aphelion.',
            ],
            keyFacts: [
              'Hukum Kepler I: Orbit planet berbentuk elips, bukan lingkaran sempurna.',
              'Hukum Kepler II: Garis edar planet menyapu luas area yang sama dalam interval waktu yang sama.',
              'Hukum Kepler III: Kuadrat periode orbit planet sebanding dengan pangkat tiga sumbu semi-mayor orbitnya.',
            ],
            callout: {
              type: 'tip',
              title: 'Tips Memahami Orbit',
              text: 'Semakin jauh jarak suatu planet dari matahari, semakin panjang lintasan orbitnya dan semakin lambat kecepatan rata-rata gerak orbitnya.',
            },
            quickQuiz: {
              question: 'Titik lintasan orbit di mana sebuah planet berada pada jarak paling dekat dengan matahari disebut?',
              options: ['Aphelion', 'Perihelion', 'Ekuinoks', 'Solstis'],
              correctIndex: 1,
              explanation: 'Perihelion adalah titik terdekat planet ke matahari, sedangkan Aphelion adalah titik terjauh.',
            },
          },
        ],
      },
      {
        id: 'chap-2',
        number: '2.0',
        title: '2.0 Karakteristik & Urutan Planet',
        lessons: [
          {
            id: 'les-2-1',
            number: '2.1',
            title: 'Planet Dalam: Merkurius, Venus, Bumi, dan Mars',
            chapterNumber: 'Bab 2',
            chapterTitle: 'Karakteristik & Urutan Planet',
            duration: '10 mins',
            status: 'currently-learning',
            contentType: 'video-article',
            paragraphs: [
              'Empat planet terdekat dari Matahari dikenal sebagai Planet Dalam (Terrestrial Planets): Merkurius, Venus, Bumi, dan Mars. Kelompok planet ini memiliki permukaan padat berbatu, kepadatan tinggi, sedikit atau tanpa bulan (satelit alami), dan tidak memiliki sistem cincin.',
              'Merkurius adalah planet terkecil dan terdekat dengan matahari, mengalami fluktuasi suhu paling ekstrem karena tidak memiliki atmosfer tebal. Venus sering disebut saudara kembar Bumi dari segi ukuran, namun memiliki efek rumah kaca tak terkendali dengan atmosfer karbon dioksida pekat beracun.',
              'Bumi adalah satu-satunya planet yang terbukti menampung kehidupan dengan air cair di permukaannya. Mars, yang dikenal sebagai Planet Merah karena kandungan besi oksida di permukaannya, memiliki gunung tertinggi (Olympus Mons) dan ngarai terdalam di tata surya.',
            ],
            keyFacts: [
              'Merkurius tidak memiliki atmosfer pelindung, sehingga suhu siang mencapai 430 °C dan malam -180 °C.',
              'Venus adalah planet terpanas di tata surya dengan suhu permukaan konstan ~465 °C.',
              'Bumi memiliki 1 satelit alami (Bulan), sedangkan Mars memiliki 2 satelit kecil (Phobos dan Deimos).',
            ],
            callout: {
              type: 'info',
              title: 'Zona Layak Huni (Habitable Zone)',
              text: 'Bumi berada tepat di Goldilocks Zone — jarak dari bintang di mana suhu memungkinkan air cair tetap stabil di permukaan.',
            },
            video: {
              title: 'Perbandingan Ukuran & Lanskap 4 Planet Kebumian (Terrestrial)',
              duration: '06:30',
              posterColor: 'from-blue-600 to-indigo-900',
            },
            quickQuiz: {
              question: 'Manakah planet yang memiliki suhu permukaan paling panas di tata surya akibat efek rumah kaca ekstrem?',
              options: ['Merkurius', 'Venus', 'Bumi', 'Mars'],
              correctIndex: 1,
              explanation: 'Meskipun Merkurius lebih dekat ke Matahari, atmosfer tebal karbon dioksida di Venus memerangkap panas dan menjadikannya planet terpanas.',
            },
          },
          {
            id: 'les-2-2',
            number: '2.2',
            title: 'Planet Luar: Jupiter, Saturnus, Uranus, dan Neptunus',
            chapterNumber: 'Bab 2',
            chapterTitle: 'Karakteristik & Urutan Planet',
            duration: '12 mins',
            status: 'not-started',
            contentType: 'deep-dive',
            paragraphs: [
              'Di luar sabuk asteroid terdapat empat Planet Luar (Jovian Planets): Jupiter, Saturnus, Uranus, dan Neptunus. Berbeda dengan planet dalam, planet luar berukuran sangat besar dan tidak memiliki permukaan padat yang terdefinisi dengan jelas.',
              'Jupiter adalah planet terbesar di tata surya, memiliki Bintik Merah Raksasa yang merupakan badai antisiklon raksasa yang telah berkecamuk ratusan tahun. Saturnus sangat terkenal dengan sistem cincin esnya yang megah dan lebar.',
              'Uranus dan Neptunus diklasifikasikan sebagai Raksasa Es (Ice Giants) karena atmosfernya kaya akan metana, amonia, dan air. Uranus memiliki rotasi yang unik karena sumbu putarnya miring hampir 98 derajat, berputar secara menyamping.',
            ],
            keyFacts: [
              'Jupiter memiliki massa lebih dari dua kali lipat gabungan semua planet lain di tata surya.',
              'Cincin Saturnus membentang hingga 282.000 km, namun ketebalannya rata-rata hanya sekitar 10 meter.',
              'Uranus dan Neptunus tampak biru karena gas metana di atmosfernya menyerap cahaya merah.',
            ],
            callout: {
              type: 'tip',
              title: 'Satelit Alami Planet Luar',
              text: 'Planet luar memiliki puluhan satelit alami. Beberapa yang paling menarik meliputi Ganymede (bulan terbesar di tata surya) dan Titan (memiliki atmosfer tebal dan danau hidrokarbon cair).',
            },
          },
          {
            id: 'les-2-3',
            number: '2.3',
            title: 'Fakta Menarik Planet & Kehidupan Ekstrem',
            chapterNumber: 'Bab 2',
            chapterTitle: 'Karakteristik & Urutan Planet',
            duration: '8 mins',
            status: 'not-started',
            contentType: 'visual-concept',
            paragraphs: [
              'Penjelajahan antariksa modern telah mengungkap banyak anomali menarik di sekitar tata surya kita. Dari geiser es di Enceladus hingga samudra bawah permukaan di Europa, pencarian tanda-tanda kehidupan mikroorganisme terus berlanjut.',
              'Bumi tetap menjadi rumah paling istimewa karena medan magnetnya yang kuat membelokkan angin matahari yang mematikan, serta atmosfer yang kaya nitrogen dan oksigen.',
            ],
            keyFacts: [
              'Satu hari di Venus lebih lama daripada satu tahun di Venus.',
              'Matahari terbenam di Mars terlihat berwarna kebiruan karena hamburan debu halus di atmosfernya.',
            ],
          },
        ],
      },
      {
        id: 'chap-3',
        number: '3.0',
        title: '3.0 Rangkuman, Peta Konsep & Glosarium',
        lessons: [
          {
            id: 'les-3-1',
            number: '3.1',
            title: 'Peta Konsep & Visual Summary Modul',
            chapterNumber: 'Bab 3',
            chapterTitle: 'Rangkuman, Peta Konsep & Glosarium',
            duration: '6 mins',
            status: 'not-started',
            contentType: 'visual-concept',
            paragraphs: [
              'Berikut adalah peta konsep lengkap dan ringkasan visual terstruktur dari keseluruhan materi tata surya. Gunakan peta konsep ini untuk melihat korelasi antar komponen dan memperdalam ingatan jangka panjang.',
            ],
          },
          {
            id: 'les-3-2',
            number: '3.2',
            title: 'Glosarium Astronomi & Uji Pemahaman',
            chapterNumber: 'Bab 3',
            chapterTitle: 'Rangkuman, Peta Konsep & Glosarium',
            duration: '5 mins',
            status: 'not-started',
            contentType: 'interactive-quiz',
            paragraphs: [
              'Pelajari istilah-istilah ilmiah penting dalam astronomi tata surya dan uji sejauh mana Anda telah menguasai kompetensi dasar materi ini.',
            ],
          },
        ],
      },
    ]
  }, [])

  // Flattened lesson list for sequential navigation
  const allLessons = useMemo(() => chapters.flatMap((c) => c.lessons), [chapters])

  // Active Lesson ID
  const [activeLessonId, setActiveLessonId] = useState<string>('les-2-1')

  const activeLessonIndex = useMemo(
    () => allLessons.findIndex((l) => l.id === activeLessonId),
    [allLessons, activeLessonId],
  )

  const activeLesson = allLessons[activeLessonIndex] || allLessons[0]
  const isLastLesson = activeLessonIndex === allLessons.length - 1
  const isLastChapter =
    activeLesson.chapterNumber === chapters[chapters.length - 1].number ||
    activeLesson.chapterTitle === chapters[chapters.length - 1].title

  // Filter lessons in Content tab search
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters

    const query = searchQuery.toLowerCase()
    return chapters
      .map((ch) => {
        const matchingLessons = ch.lessons.filter(
          (l) => l.title.toLowerCase().includes(query) || l.number.includes(query),
        )
        const chapterMatches = ch.title.toLowerCase().includes(query)
        if (chapterMatches) return ch
        if (matchingLessons.length > 0) {
          return { ...ch, lessons: matchingLessons }
        }
        return null
      })
      .filter((ch): ch is ChapterData => ch !== null)
  }, [chapters, searchQuery])

  // Toggle chapter collapse
  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }))
  }

  // Handle lesson navigation
  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId)
    setSelectedQuizAnswer(null)
    setQuizSubmitted(false)
    setIsMobileSidebarOpen(false)

    // Scroll main content to top
    const container = document.getElementById('main-learning-scroll')
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Next and Previous navigation
  const handlePrevLesson = () => {
    if (activeLessonIndex > 0) {
      handleSelectLesson(allLessons[activeLessonIndex - 1].id)
    }
  }

  const handleNextLesson = () => {
    if (activeLessonIndex < allLessons.length - 1) {
      handleSelectLesson(allLessons[activeLessonIndex + 1].id)
    }
  }

  // Submit discussion comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const newItem: DiscussionItem = {
      id: `disc-${Date.now()}`,
      userName: 'Anda (Siswa)',
      role: 'Siswa',
      avatarColor: 'bg-lime text-black font-extrabold',
      timestamp: 'Baru saja',
      content: newComment.trim(),
      likes: 0,
      repliesCount: 0,
    }

    setDiscussions([newItem, ...discussions])
    setNewComment('')
  }

  // Report issue handler
  const handleReportIssue = () => {
    setReportedToast(true)
    setTimeout(() => setReportedToast(false), 4000)
  }

  // Download simulation
  const handleDownload = (fileName: string) => {
    setDownloadToast(fileName)
    setTimeout(() => setDownloadToast(null), 3500)
  }

  const completedCount = allLessons.filter((l) => l.status === 'completed').length
  const progressPercent = Math.round((completedCount / allLessons.length) * 100)

  if (!hydrated || loading) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background p-6">
        <Skeleton className="h-96 w-full max-w-4xl rounded-3xl" />
      </div>
    )
  }

  if (!mod) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background p-6">
        <EmptyState
          icon={BookOpen}
          text="Modul pembelajaran tidak ditemukan."
          action={
            <Link href="/tunarungu/kartu" className="font-bold underline text-foreground">
              Kembali ke daftar modul
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-background font-sans text-foreground">
      {/* 1. TOP NAVIGATION BAR */}
      <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-border bg-white px-3 sm:px-6 shadow-2xs z-30">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/tunarungu/kartu"
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-bold text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground"
            title="Kembali ke Beranda Modul"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Semua Modul</span>
          </Link>

          <span className="h-4 w-px bg-border hidden sm:inline-block" aria-hidden="true" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#111] text-lime shadow-xs">
              <GraduationCap className="size-4.5" aria-hidden="true" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                LMS Player · NusaTara
              </span>
              <h1 className="text-xs sm:text-sm font-black tracking-tight text-foreground truncate max-w-[200px] sm:max-w-md lg:max-w-lg">
                {mod.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Right: Progress & Sidebar Toggle for Mobile */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Progress bar in header */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-24 sm:w-32 bg-neutral-100 rounded-full h-2 overflow-hidden border border-border/80">
              <div
                className="bg-lime h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-extrabold text-foreground">{progressPercent}% Selesai</span>
          </div>

          {/* Mobile Sidebar Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="inline-flex lg:hidden items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-neutral-200 transition-colors"
            aria-label="Buka Navigasi Pelajaran"
          >
            <Compass className="size-4 text-[#7c3aed]" aria-hidden="true" />
            <span>Kurikulum</span>
          </button>

          {/* Exit Link */}
          <Link
            href="/tunarungu/kartu"
            className="hidden sm:flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-neutral-100 hover:text-foreground transition-colors"
            title="Keluar dari ruang belajar"
          >
            <X className="size-4.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {/* 2. COURSE UPDATE NOTIFICATION BANNER */}
      {showNotification && (
        <aside
          aria-label="Pemberitahuan Modul"
          className="flex shrink-0 items-center justify-between border-b border-border/80 bg-neutral-50 px-4 py-2 sm:px-6 text-xs text-neutral-700 z-20"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <Info className="size-3.5" aria-hidden="true" />
            </span>
            <p className="truncate">
              <span className="font-bold text-foreground">Modul diperbarui:</span> Versi terbaru mencakup data orbit, video anatomi fusi matahari, dan peta konsep visual.
            </p>
            <button
              type="button"
              onClick={() => handleSelectLesson('les-3-1')}
              className="ml-2 hidden sm:inline-block font-extrabold text-[#7c3aed] underline hover:text-purple-800 shrink-0"
            >
              Lihat Peta Konsep
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowNotification(false)}
            className="rounded-lg p-1 text-muted-foreground hover:bg-neutral-200/80 transition-colors ml-2"
            aria-label="Tutup pemberitahuan"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </aside>
      )}

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* 3. MAIN LEARNING CONTENT AREA */}
        <main
          id="main-learning-scroll"
          className="flex flex-1 flex-col overflow-y-auto bg-white"
        >
          {/* Content Wrapper with generous reading width */}
          <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-10 md:py-12 space-y-8 flex-1">
            {/* Active Lesson Breadcrumbs & Header Metadata */}
            <div className="flex flex-col gap-2.5 border-b border-border/80 pb-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="text-foreground">{activeLesson.chapterNumber}</span>
                <span>·</span>
                <span>{activeLesson.chapterTitle}</span>
                <span>·</span>
                <span className="rounded-md bg-purple-50 px-2 py-0.5 text-purple-700 font-extrabold">
                  Pelajaran {activeLesson.number}
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl md:text-4xl text-balance">
                {activeLesson.title}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {activeLesson.duration} estimasi
                </span>
                <span>·</span>
                <span>Oleh: <strong className="font-bold text-foreground">{mod.teacherName}</strong></span>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                  <Sparkles className="size-3.5" aria-hidden="true" /> Aksesibilitas Visual Siap
                </span>
              </div>
            </div>

            {/* Embedded Video Mockup (if available in lesson) */}
            {activeLesson.video && (
              <section aria-label="Media Pembelajaran Video" className="flex flex-col gap-2">
                <div className={cn(
                  'relative aspect-video w-full overflow-hidden rounded-2xl bg-gradient-to-br shadow-sm border border-border/80 flex flex-col justify-between p-4 sm:p-6 text-white',
                  activeLesson.video.posterColor,
                )}>
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-black/50 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-white">
                      Resolusi HD 1080p
                    </span>
                    <span className="rounded-lg bg-black/50 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-lime flex items-center gap-1">
                      <Subtitles className="size-3.5" aria-hidden="true" /> Subtitle Bahasa Indonesia
                    </span>
                  </div>

                  {/* Play Button Overlay */}
                  <div className="flex flex-col items-center justify-center text-center my-auto">
                    <button
                      type="button"
                      onClick={() => setIsPlayingVideo(!isPlayingVideo)}
                      className="group flex size-14 sm:size-16 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform hover:scale-110 active:scale-95"
                      aria-label={isPlayingVideo ? 'Jeda Video' : 'Putar Video'}
                    >
                      {isPlayingVideo ? (
                        <Pause className="size-6 sm:size-7 fill-current" aria-hidden="true" />
                      ) : (
                        <Play className="size-6 sm:size-7 fill-current translate-x-0.5" aria-hidden="true" />
                      )}
                    </button>
                    <p className="mt-3 text-xs sm:text-sm font-extrabold text-white/95 max-w-md drop-shadow-sm">
                      {activeLesson.video.title}
                    </p>
                  </div>

                  {/* Video Control Bar */}
                  <div className="flex flex-col gap-1.5 rounded-xl bg-black/60 backdrop-blur-md p-2.5 sm:p-3">
                    <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-lime h-full rounded-full w-2/5" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-white/90">
                      <span>01:42 / {activeLesson.video.duration}</span>
                      <div className="flex items-center gap-3">
                        <button type="button" className="hover:text-lime" aria-label="Audio">
                          <Volume2 className="size-3.5" aria-hidden="true" />
                        </button>
                        <button type="button" className="hover:text-lime" aria-label="Layar penuh">
                          <Maximize2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Formatted Text Paragraphs */}
            <article className="prose prose-neutral max-w-none text-base leading-relaxed text-foreground/90 space-y-4">
              {activeLesson.paragraphs.map((p, idx) => (
                <p key={idx} className="text-base sm:text-lg leading-relaxed text-balance">
                  {p}
                </p>
              ))}
            </article>

            {/* Callout / Information Box */}
            {activeLesson.callout && (
              <aside
                aria-label="Sorotan Penting"
                className="flex items-start gap-3.5 rounded-2xl border-2 border-[#111] bg-lime/90 p-4 sm:p-6 text-black shadow-xs"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#111] text-lime">
                  <Lightbulb className="size-4.5" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1 text-sm sm:text-base">
                  <h3 className="font-black text-black">{activeLesson.callout.title}</h3>
                  <p className="leading-relaxed font-semibold text-neutral-900">{activeLesson.callout.text}</p>
                </div>
              </aside>
            )}

            {/* Key Facts List */}
            {activeLesson.keyFacts && activeLesson.keyFacts.length > 0 && (
              <section aria-labelledby="fakta-kunci" className="rounded-2xl border border-border bg-neutral-50/80 p-5 sm:p-6 space-y-3">
                <h3 id="fakta-kunci" className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
                  Fakta Kunci & Intisari
                </h3>
                <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {activeLesson.keyFacts.map((fact, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-foreground/90 font-medium">
                      <span className="mt-1 size-2 rounded-xs bg-[#111] ring-2 ring-lime shrink-0" aria-hidden="true" />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Code / Structured Astronomical Data Snippet */}
            {activeLesson.codeSnippet && (
              <section aria-labelledby="data-fisis" className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                  <span id="data-fisis">{activeLesson.codeSnippet.title}</span>
                  <span className="uppercase text-[10px] tracking-wider font-extrabold bg-neutral-100 px-2 py-0.5 rounded-md">
                    {activeLesson.codeSnippet.language}
                  </span>
                </div>
                <pre className="overflow-x-auto rounded-2xl bg-[#111] p-4 text-xs sm:text-sm font-mono text-lime leading-relaxed border border-neutral-800 shadow-sm">
                  <code>{activeLesson.codeSnippet.code}</code>
                </pre>
              </section>
            )}

            {/* If on visual concept lessons (Lesson 3.1), render full visual summary from module */}
            {activeLesson.id === 'les-3-1' && (
              <section aria-label="Peta Konsep & Ringkasan Visual">
                <VisualSummaryView data={mod.deafVisualSummary} />
              </section>
            )}

            {/* Interactive Quick Quiz Check (if present in lesson) */}
            {activeLesson.quickQuiz && (
              <section
                aria-labelledby="kuis-cek-pemahaman"
                className="rounded-2xl border border-border bg-white p-5 sm:p-7 shadow-xs space-y-4"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-[#7c3aed] text-white">
                    <Check className="size-4" aria-hidden="true" />
                  </span>
                  <h3 id="kuis-cek-pemahaman" className="text-base sm:text-lg font-black text-foreground">
                    Cek Pemahaman Cepat
                  </h3>
                </div>

                <p className="text-sm sm:text-base font-bold text-foreground">
                  {activeLesson.quickQuiz.question}
                </p>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {activeLesson.quickQuiz.options.map((opt, oIdx) => {
                    const isSelected = selectedQuizAnswer === oIdx
                    const isCorrect = oIdx === activeLesson.quickQuiz?.correctIndex
                    let btnClass = 'border-border hover:bg-neutral-50 text-foreground'

                    if (quizSubmitted) {
                      if (isCorrect) {
                        btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-400'
                      } else if (isSelected) {
                        btnClass = 'border-destructive bg-red-50 text-red-950 font-bold'
                      }
                    } else if (isSelected) {
                      btnClass = 'border-[#7c3aed] bg-purple-50 text-purple-950 font-bold ring-2 ring-purple-300'
                    }

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => !quizSubmitted && setSelectedQuizAnswer(oIdx)}
                        className={cn(
                          'flex items-center gap-3 rounded-xl border p-3.5 text-left text-xs sm:text-sm transition-all',
                          btnClass,
                        )}
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-xs font-black text-neutral-800">
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Submit Quiz button & feedback */}
                <div className="flex items-center justify-between pt-2">
                  {!quizSubmitted ? (
                    <button
                      type="button"
                      disabled={selectedQuizAnswer === null}
                      onClick={() => setQuizSubmitted(true)}
                      className="rounded-xl bg-[#111] px-4 py-2 text-xs sm:text-sm font-extrabold text-white transition-opacity disabled:opacity-40 hover:bg-neutral-800"
                    >
                      Periksa Jawaban
                    </button>
                  ) : (
                    <div className="flex flex-col gap-1 text-xs sm:text-sm">
                      <span className={cn(
                        'font-black',
                        selectedQuizAnswer === activeLesson.quickQuiz.correctIndex ? 'text-emerald-600' : 'text-destructive',
                      )}>
                        {selectedQuizAnswer === activeLesson.quickQuiz.correctIndex ? '✓ Jawaban Tepat!' : '✕ Belum Tepat'}
                      </span>
                      <p className="text-muted-foreground">{activeLesson.quickQuiz.explanation}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* End of Chapter/Course - Exam Gateway Card */}
            {(isLastLesson || isLastChapter) && (
              <section
                aria-label="Ujian Akhir Modul"
                className="mt-8 overflow-hidden rounded-3xl border-2 border-[#111] bg-gradient-to-br from-lime/30 via-white to-purple-50 p-6 sm:p-8 shadow-xs space-y-5 animate-fade-up"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#111] px-3 py-1 text-xs font-black text-lime">
                      <Award className="size-3.5" aria-hidden="true" />
                      <span>{isLastLesson ? 'Semua Bab Materi Selesai' : 'Bab Terakhir Modul'}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-foreground">
                      Uji Pemahaman: {mod.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl leading-relaxed">
                      {isLastLesson
                        ? 'Luar biasa! Anda telah menyelesaikan seluruh bab pembelajaran. Sekarang saatnya menguji penguasaan materi Anda melalui ujian evaluasi resmi.'
                        : 'Anda sedang berada di bab terakhir materi ini. Setelah menuntaskan pelajaran, Anda dapat langsung menguji pemahaman melalui ujian evaluasi.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-neutral-700 pt-1">
                      <span className="rounded-lg bg-white border border-border px-2.5 py-1 font-mono text-foreground shadow-2xs">
                        PIN Ujian: <strong className="text-[#7c3aed] font-black text-sm">5678</strong>
                      </span>
                      <span className="text-muted-foreground">· Terbuka untuk Siswa</span>
                    </div>
                  </div>

                  <Link
                    href="/tunarungu/ujian"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#111] px-6 py-3.5 text-sm font-black text-lime hover:bg-neutral-800 transition-all hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <GraduationCap className="size-4" aria-hidden="true" />
                    <span>Mulai Ujian Sekarang</span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </section>
            )}
          </div>

          {/* 6. STICKY BOTTOM NAVIGATION BAR */}
          <footer className="sticky bottom-0 border-t border-border bg-white/95 backdrop-blur-md px-4 py-3.5 sm:px-8 z-10">
            <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
              {/* Report Issue Button */}
              <button
                type="button"
                onClick={handleReportIssue}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
              >
                <Flag className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <span className="hidden sm:inline">Laporkan Masalah</span>
              </button>

              {/* Prev and Next / Exam Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handlePrevLesson}
                  disabled={activeLessonIndex === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3.5 py-2 text-xs sm:text-sm font-extrabold text-foreground transition-all disabled:opacity-40 hover:bg-neutral-100"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  <span>Sebelumnya</span>
                </button>

                {isLastLesson ? (
                  <Link
                    href="/tunarungu/ujian"
                    className="inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-2 sm:px-5 sm:py-2 text-xs sm:text-sm font-black text-black transition-all hover:bg-[#c7f42e] shadow-xs hover:scale-105 active:scale-95"
                  >
                    <Award className="size-4" aria-hidden="true" />
                    <span>Ikuti Ujian Modul</span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextLesson}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#111] px-4 py-2 text-xs sm:text-sm font-black text-lime transition-all hover:bg-neutral-800 shadow-xs"
                  >
                    <span>Pelajaran Berikutnya</span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </footer>
        </main>

        {/* 5. RIGHT SIDEBAR – LEARNING NAVIGATOR (DESKTOP & DRAWER) */}
        <aside
          aria-label="Panel Navigasi & Sumber Belajar"
          className={cn(
            'fixed inset-y-0 right-0 z-40 flex w-full max-w-xs sm:max-w-sm lg:max-w-none flex-col border-l border-border bg-white transition-transform duration-300 ease-in-out lg:static lg:w-80 xl:w-96 lg:translate-x-0',
            isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0',
          )}
        >
          {/* Sidebar Top Header with Tabs */}
          <div className="flex flex-col border-b border-border bg-white shrink-0">
            {/* Header Title with Mobile Close Button */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground">
                Navigasi Pembelajaran
              </h2>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-neutral-100 lg:hidden"
                aria-label="Tutup panel"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {/* 3 Tabs: Content, Discussion, Files */}
            <div className="flex border-t border-border/80 px-2">
              <button
                type="button"
                onClick={() => setSidebarTab('content')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-extrabold transition-colors',
                  sidebarTab === 'content'
                    ? 'border-[#111] text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <BookOpen className="size-3.5" aria-hidden="true" />
                <span>Materi</span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('discussion')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-extrabold transition-colors',
                  sidebarTab === 'discussion'
                    ? 'border-[#111] text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <MessageSquare className="size-3.5" aria-hidden="true" />
                <span>Diskusi</span>
                <span className="rounded-full bg-neutral-200 px-1.5 py-0.2 text-[10px] font-bold text-neutral-800">
                  {discussions.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('files')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-extrabold transition-colors',
                  sidebarTab === 'files'
                    ? 'border-[#111] text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Paperclip className="size-3.5" aria-hidden="true" />
                <span>Berkas</span>
                <span className="rounded-full bg-neutral-200 px-1.5 py-0.2 text-[10px] font-bold text-neutral-800">
                  {SAMPLE_FILES.length}
                </span>
              </button>
            </div>
          </div>

          {/* TAB 1: CONTENT TAB */}
          {sidebarTab === 'content' && (
            <div className="flex flex-1 flex-col overflow-y-auto p-4 space-y-4">
              {/* Search Field */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari pelajaran atau bab..."
                  className="w-full rounded-xl border border-border bg-neutral-50 pl-9 pr-3 py-2 text-xs sm:text-sm font-medium placeholder:text-muted-foreground focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#111]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    aria-label="Hapus pencarian"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>

              {/* Curriculum List with Expandable Sections */}
              <div className="space-y-4">
                {filteredChapters.map((chapter) => {
                  const isExpanded = expandedChapters[chapter.id] ?? true
                  const completedInChapter = chapter.lessons.filter((l) => l.status === 'completed').length

                  return (
                    <div key={chapter.id} className="rounded-xl border border-border/80 bg-white overflow-hidden shadow-2xs">
                      {/* Chapter Accordion Header */}
                      <button
                        type="button"
                        onClick={() => toggleChapter(chapter.id)}
                        className="flex w-full items-center justify-between bg-neutral-50/70 p-3 text-left transition-colors hover:bg-neutral-100"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-xs font-black text-foreground truncate">
                            {chapter.title}
                          </span>
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {completedInChapter}/{chapter.lessons.length} Selesai
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        )}
                      </button>

                      {/* Lesson Items */}
                      {isExpanded && (
                        <ul className="divide-y divide-border/60">
                          {chapter.lessons.map((lesson) => {
                            const isActive = lesson.id === activeLessonId

                            return (
                              <li key={lesson.id}>
                                <button
                                  type="button"
                                  onClick={() => handleSelectLesson(lesson.id)}
                                  className={cn(
                                    'flex w-full items-center justify-between gap-2.5 p-3 text-left transition-all',
                                    isActive
                                      ? 'bg-purple-50 text-purple-950 font-bold border-l-4 border-[#7c3aed]'
                                      : 'hover:bg-neutral-50 text-foreground font-medium',
                                  )}
                                >
                                  {/* Left: Status Icon & Title */}
                                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                    {lesson.status === 'completed' ? (
                                      <span
                                        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xs"
                                        title="Selesai"
                                      >
                                        <Check className="size-3 stroke-[3]" aria-hidden="true" />
                                      </span>
                                    ) : lesson.status === 'currently-learning' || isActive ? (
                                      <span
                                        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-2xs"
                                        title="Sedang Dipelajari"
                                      >
                                        <Play className="size-2.5 fill-current ml-0.5" aria-hidden="true" />
                                      </span>
                                    ) : (
                                      <span
                                        className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-neutral-300 text-neutral-400"
                                        title="Belum Dimulai"
                                      >
                                        <Play className="size-2 fill-current ml-0.5" aria-hidden="true" />
                                      </span>
                                    )}

                                    <span
                                      className={cn(
                                        'truncate text-xs',
                                        isActive ? 'font-extrabold text-purple-950' : 'text-foreground/90',
                                      )}
                                    >
                                      <span className="mr-1 text-muted-foreground font-semibold">{lesson.number}</span>
                                      {lesson.title}
                                    </span>
                                  </div>

                                  {/* Right: Duration */}
                                  <span
                                    className={cn(
                                      'shrink-0 text-[11px] font-bold',
                                      isActive ? 'text-purple-700' : 'text-muted-foreground',
                                    )}
                                  >
                                    {lesson.duration}
                                  </span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Exam Milestone Gateway in Sidebar */}
              <div
                className={cn(
                  'rounded-2xl border-2 p-4 transition-all space-y-2.5',
                  isLastChapter
                    ? 'border-lime bg-gradient-to-br from-lime/20 via-white to-purple-50/40 shadow-2xs'
                    : 'border-dashed border-border bg-neutral-50/80',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-black text-foreground">
                    <Award className="size-4 text-[#7c3aed]" aria-hidden="true" />
                    Ujian Evaluasi Modul
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-black',
                      isLastChapter ? 'bg-[#111] text-lime' : 'bg-neutral-200 text-neutral-700',
                    )}
                  >
                    {isLastLesson ? 'Bab Terakhir' : 'Tersedia'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                  {isLastLesson
                    ? 'Anda telah tiba di bab terakhir! Klik tombol di bawah untuk mengikuti ujian.'
                    : 'Selesaikan seluruh bab materi untuk membuka ujian evaluasi resmi.'}
                </p>
                <Link
                  href="/tunarungu/ujian"
                  className={cn(
                    'flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black transition-all',
                    isLastLesson
                      ? 'bg-lime text-black hover:bg-[#c7f42e] shadow-xs hover:scale-102'
                      : 'bg-[#111] text-lime hover:bg-neutral-800',
                  )}
                >
                  <GraduationCap className="size-3.5" aria-hidden="true" />
                  <span>{isLastLesson ? 'Ikuti Ujian Sekarang' : 'Buka Halaman Ujian'}</span>
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}

          {/* TAB 2: DISCUSSION TAB */}
          {sidebarTab === 'discussion' && (
            <div className="flex flex-1 flex-col overflow-y-auto p-4 space-y-4">
              {/* Form Input Pertanyaan */}
              <form onSubmit={handleAddComment} className="flex flex-col gap-2">
                <label htmlFor="discussion-input" className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Tanya Guru atau Teman
                </label>
                <textarea
                  id="discussion-input"
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Tuliskan pertanyaan seputar pelajaran ini..."
                  className="w-full resize-none rounded-xl border border-border p-3 text-xs sm:text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#111]"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#111] py-2 text-xs font-bold text-white transition-opacity disabled:opacity-40 hover:bg-neutral-800"
                >
                  <Send className="size-3.5" aria-hidden="true" />
                  <span>Kirim Pertanyaan</span>
                </button>
              </form>

              {/* Daftar Diskusi */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-extrabold text-foreground">
                  Diskusi Terkini ({discussions.length})
                </span>
                {discussions.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border p-3.5 space-y-2 bg-neutral-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('size-6 rounded-full flex items-center justify-center text-xs font-bold text-white', item.avatarColor)}>
                          {item.userName[0]}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-extrabold text-foreground">{item.userName}</span>
                          <span className="text-[10px] text-muted-foreground">{item.timestamp}</span>
                        </div>
                      </div>
                      <span className={cn(
                        'rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        item.role === 'Guru' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700',
                      )}>
                        {item.role}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-foreground/90 font-medium">
                      {item.content}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-muted-foreground">
                      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground">
                        <ThumbsUp className="size-3" aria-hidden="true" />
                        <span>{item.likes}</span>
                      </button>
                      <button type="button" className="hover:text-foreground">
                        Balas ({item.repliesCount})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FILES TAB */}
          {sidebarTab === 'files' && (
            <div className="flex flex-1 flex-col overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Lampiran & Sumber Belajar
                </span>
                <span className="text-[11px] font-bold text-muted-foreground">
                  {SAMPLE_FILES.length} Berkas
                </span>
              </div>

              <div className="space-y-2.5">
                {SAMPLE_FILES.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between rounded-xl border border-border p-3 bg-neutral-50/50 hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#111] text-lime">
                        <FileText className="size-4" aria-hidden="true" />
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-xs font-bold text-foreground">
                          {file.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {file.category} · {file.size}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownload(file.name)}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground hover:bg-[#111] hover:text-lime transition-colors"
                      title={`Unduh ${file.name}`}
                    >
                      <Download className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Backdrop for Sidebar */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Floating Notifications / Toasts */}
      {reportedToast && (
        <div className="fixed bottom-16 left-6 z-50 flex items-center gap-2 rounded-xl bg-[#111] px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-fade-up">
          <Check className="size-4 text-lime" aria-hidden="true" />
          <span>Laporan Anda telah dikirimkan ke tim pengajar. Terima kasih!</span>
        </div>
      )}

      {downloadToast && (
        <div className="fixed bottom-16 left-6 z-50 flex items-center gap-2 rounded-xl bg-[#111] px-4 py-2.5 text-xs font-bold text-white shadow-xl animate-fade-up">
          <Download className="size-4 text-lime" aria-hidden="true" />
          <span>Mengunduh: {downloadToast}</span>
        </div>
      )}
    </div>
  )
}
