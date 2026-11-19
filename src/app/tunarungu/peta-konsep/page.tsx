'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Network, ChevronRight, Eye, CheckCircle2, BookOpen, Layers } from 'lucide-react'
import { StudentShell } from '@/components/student/student-shell'
import { btnLime } from '@/components/site/form'

interface ConceptNode {
  id: string
  title: string
  tag: string
  desc: string
  examples: string[]
  children?: ConceptNode[]
}

const CONCEPT_TREES: { subject: string; root: ConceptNode }[] = [
  {
    subject: 'Ilmu Pengetahuan Alam (IPA)',
    root: {
      id: 'root-1',
      title: 'Ekosistem Alam',
      tag: 'Konsep Utama',
      desc: 'Hubungan timbal balik antara makhluk hidup dengan lingkungan sekitarnya.',
      examples: ['Hutan tropis', 'Padang rumput', 'Terumbu karang laut'],
      children: [
        {
          id: 'child-1',
          title: 'Komponen Biotik (Hidup)',
          tag: 'Sub-Konsep',
          desc: 'Semua makhluk bernyawa yang ada di dalam lingkungan.',
          examples: ['Produsen (Tumbuhan)', 'Konsumen (Hewan)', 'Pengurai (Bakteri & Jamur)'],
          children: [
            {
              id: 'leaf-1',
              title: 'Rantai Makanan',
              tag: 'Tingkat Lanjut',
              desc: 'Alur perpindahan energi makanan dari produsen ke konsumen puncak.',
              examples: ['Rumput → Belalang → Burung → Elang'],
            },
          ],
        },
        {
          id: 'child-2',
          title: 'Komponen Abiotik (Tak Hidup)',
          tag: 'Sub-Konsep',
          desc: 'Faktor fisik dan kimia yang mempengaruhi kehidupan makhluk hidup.',
          examples: ['Sinar Matahari', 'Air & Udara', 'Tanah & Suhu Lingkungan'],
        },
      ],
    },
  },
  {
    subject: 'Pendidikan Pancasila (PPKN)',
    root: {
      id: 'root-2',
      title: 'Pancasila Dasar Negara',
      tag: 'Konsep Utama',
      desc: 'Lima fondasi prinsip nilai moral dan hukum bagi seluruh rakyat Indonesia.',
      examples: ['Persatuan', 'Keadilan sosial', 'Musyawarah mufakat'],
      children: [
        {
          id: 'child-3',
          title: 'Nilai Ketuhanan & Kemanusiaan',
          tag: 'Sila 1 & 2',
          desc: 'Menghormati keyakinan beragama dan menjunjung hak asasi setiap individu.',
          examples: ['Toleransi ibadah', 'Tolong-menolong sesama manusia'],
        },
        {
          id: 'child-4',
          title: 'Persatuan & Demokrasi',
          tag: 'Sila 3 & 4',
          desc: 'Cinta tanah air dan mengutamakan musyawarah untuk mencapai mufakat.',
          examples: ['Gotong royong', 'Pemilihan umum adil', 'Mufakat'],
        },
      ],
    },
  },
]

export default function PetaKonsepPage() {
  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0)
  const [selectedNode, setSelectedNode] = useState<ConceptNode>(CONCEPT_TREES[0].root)

  const activeTree = CONCEPT_TREES[activeSubjectIdx]

  return (
    <StudentShell>
      <div className="space-y-8">
        {/* Banner */}
        <div className="flex flex-col gap-3 rounded-3xl bg-black p-6 text-white md:p-8">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-lime px-3.5 py-1 text-xs font-black uppercase text-black">
              <Network className="size-3.5" />
              Eksplorasi Konsep Bertingkat
            </span>
            <span className="text-xs text-white/70">100% Visual & Diagrammatic</span>
          </div>
          <h1 className="text-2xl font-black md:text-4xl">Peta Konsep Interaktif</h1>
          <p className="text-sm text-neutral-300 max-w-2xl leading-relaxed">
            Pahami materi pelajaran melalui hierarki diagram yang jelas. Klik pada cabang konsep mana pun untuk membuka ringkasan visual dan contoh nyatanya.
          </p>

          {/* Subject Pills */}
          <div className="mt-2 flex flex-wrap gap-2">
            {CONCEPT_TREES.map((tree, i) => (
              <button
                key={tree.subject}
                type="button"
                onClick={() => {
                  setActiveSubjectIdx(i)
                  setSelectedNode(tree.root)
                }}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
                  activeSubjectIdx === i
                    ? 'bg-lime text-black font-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {tree.subject}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Mindmap Layout: Left Tree + Right Detail */}
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {/* Tree View Canvas */}
          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                <Layers className="size-4" /> Pohon Relasi Konsep
              </span>
              <span className="text-xs text-neutral-400">Klik node untuk melihat detail</span>
            </div>

            {/* Tree nodes renderer */}
            <div className="space-y-6">
              {/* Root Node */}
              <div
                onClick={() => setSelectedNode(activeTree.root)}
                className={`cursor-pointer rounded-2xl border-2 p-4 transition-all ${
                  selectedNode.id === activeTree.root.id
                    ? 'border-black bg-lime/10 shadow-md scale-[1.02]'
                    : 'border-neutral-200 bg-neutral-50 hover:border-black'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-black px-2.5 py-0.5 text-[10px] font-black uppercase text-lime">
                    {activeTree.root.tag}
                  </span>
                  <ChevronRight className="size-4 text-neutral-400" />
                </div>
                <h3 className="mt-2 text-lg font-black text-neutral-900">{activeTree.root.title}</h3>
                <p className="mt-1 text-xs text-neutral-600 line-clamp-1">{activeTree.root.desc}</p>
              </div>

              {/* Children Nodes Level 1 */}
              <div className="ml-6 pl-6 border-l-2 border-dashed border-neutral-300 space-y-4">
                {activeTree.root.children?.map((child) => (
                  <div key={child.id} className="space-y-3">
                    <div
                      onClick={() => setSelectedNode(child)}
                      className={`cursor-pointer rounded-2xl border-2 p-3.5 transition-all ${
                        selectedNode.id === child.id
                          ? 'border-black bg-lime/10 shadow-md scale-[1.02]'
                          : 'border-neutral-200 bg-white hover:border-neutral-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-[10px] font-bold text-neutral-800">
                          {child.tag}
                        </span>
                        <ChevronRight className="size-4 text-neutral-400" />
                      </div>
                      <h4 className="mt-1.5 text-base font-extrabold text-neutral-900">{child.title}</h4>
                      <p className="mt-0.5 text-xs text-neutral-600 line-clamp-1">{child.desc}</p>
                    </div>

                    {/* Children Level 2 */}
                    {child.children && (
                      <div className="ml-6 pl-6 border-l-2 border-dashed border-neutral-300 space-y-2">
                        {child.children.map((subchild) => (
                          <div
                            key={subchild.id}
                            onClick={() => setSelectedNode(subchild)}
                            className={`cursor-pointer rounded-xl border-2 p-3 transition-all ${
                              selectedNode.id === subchild.id
                                ? 'border-black bg-lime/10 shadow-md'
                                : 'border-neutral-200 bg-neutral-50 hover:border-neutral-400'
                            }`}
                          >
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">{subchild.tag}</span>
                            <h5 className="text-sm font-bold text-neutral-900">{subchild.title}</h5>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Detail Panel */}
          <div className="rounded-3xl border border-black/10 bg-[#111] p-6 text-white shadow-xl flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-lime px-3 py-0.5 text-xs font-black uppercase text-black">
                  {selectedNode.tag}
                </span>
                <span className="text-xs text-neutral-400 flex items-center gap-1">
                  <Eye className="size-3.5" /> Pratinjau Terpilih
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black tracking-tight text-white">{selectedNode.title}</h3>
                <p className="mt-3 text-sm text-neutral-300 leading-relaxed font-medium">
                  {selectedNode.desc}
                </p>
              </div>

              {/* Examples List */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2.5">
                <span className="text-xs font-bold text-lime uppercase tracking-wider block">
                  Contoh & Komponen Visual:
                </span>
                <ul className="space-y-2">
                  {selectedNode.examples.map((ex, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs font-medium text-neutral-200">
                      <CheckCircle2 className="size-3.5 shrink-0 text-lime" />
                      <span>{ex}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 mt-6 flex gap-3">
              <Link
                href="/tunarungu/kartu"
                className="flex-1 rounded-2xl bg-white px-4 py-3 text-center text-xs font-bold text-black hover:bg-lime transition-all"
              >
                Lihat Semua Kartu
              </Link>
              <Link
                href="/tunarungu/ujian"
                className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-center text-xs font-bold text-white hover:bg-white/20 transition-all"
              >
                Mulai Ujian Terkait
              </Link>
            </div>
          </div>
        </div>
      </div>
    </StudentShell>
  )
}
