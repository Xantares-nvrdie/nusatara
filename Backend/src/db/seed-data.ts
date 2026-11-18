import type { AnswerKey, DeafVisualSummary, ExamQuestionInput } from "@/backend/utils/model";

/** Shared password for every demo account (documented for judges in the proposal). */
export const DEMO_PASSWORD = "password123";

export type SeedModule = {
    title: string;
    rawContent: string;
    blindAudioScript: string;
    deafVisualSummary: DeafVisualSummary;
    exam: {
        title: string;
        /** Fixed so the demo script can say "masukkan PIN 1234". Falls back to a random PIN if taken. */
        pin: string;
        questions: ExamQuestionInput[];
        /** One entry per question in order; null = skipped. Scored by the real ExamService. */
        submissions: { studentName: string; answers: (AnswerKey | null)[] }[];
    };
};

export type SeedTeacher = {
    name: string;
    email: string;
    modules: SeedModule[];
};

const fotosintesis: SeedModule = {
    title: "Fotosintesis: Cara Tumbuhan Membuat Makanan",
    rawContent: `Fotosintesis adalah proses tumbuhan hijau membuat makanannya sendiri. Proses ini terjadi di daun, tepatnya di bagian yang mengandung klorofil atau zat hijau daun.

Bahan yang dibutuhkan untuk fotosintesis adalah air, karbon dioksida, dan cahaya matahari. Air diserap oleh akar dari dalam tanah, lalu diangkut ke daun melalui batang. Karbon dioksida masuk dari udara melalui stomata, yaitu lubang kecil di permukaan daun.

Hasil fotosintesis adalah glukosa (gula) dan oksigen. Glukosa digunakan tumbuhan sebagai sumber energi dan disimpan sebagai cadangan makanan, misalnya di umbi singkong atau ubi. Oksigen dilepaskan ke udara dan dihirup oleh manusia serta hewan.

Persamaan sederhana fotosintesis:
air + karbon dioksida + cahaya matahari → glukosa + oksigen

Tanpa cahaya matahari, fotosintesis tidak dapat berlangsung. Karena itu tumbuhan yang diletakkan di tempat gelap lama-kelamaan akan layu dan menguning.`,
    blindAudioScript: `Hari ini kita belajar tentang fotosintesis, yaitu cara tumbuhan membuat makanannya sendiri.

Fotosintesis terjadi di daun. Di dalam daun ada zat berwarna hijau yang bernama klorofil, atau zat hijau daun. Klorofil inilah yang menangkap cahaya matahari.

Untuk membuat makanan, tumbuhan membutuhkan tiga bahan. Bahan pertama adalah air, yang diserap akar dari dalam tanah lalu dialirkan ke daun melalui batang. Bahan kedua adalah karbon dioksida, yaitu gas dari udara yang masuk lewat lubang-lubang sangat kecil di permukaan daun. Lubang kecil itu bernama stomata. Bahan ketiga adalah cahaya matahari.

Jika ketiga bahan itu ada, tumbuhan menghasilkan dua hal. Yang pertama adalah glukosa, yaitu sejenis gula yang menjadi makanan dan sumber tenaga bagi tumbuhan. Sebagian glukosa disimpan sebagai cadangan makanan, misalnya di dalam umbi singkong dan ubi. Yang kedua adalah oksigen, gas yang dilepaskan ke udara dan kita hirup setiap saat.

Rumus sederhananya dapat diucapkan seperti ini: air ditambah karbon dioksida ditambah cahaya matahari, menghasilkan glukosa dan oksigen.

Tanpa cahaya matahari, fotosintesis tidak bisa terjadi. Itulah sebabnya tumbuhan yang lama disimpan di tempat gelap akan layu dan daunnya menguning.

Sebagai rangkuman, fotosintesis terjadi di daun dengan bantuan klorofil. Bahannya air, karbon dioksida, dan cahaya matahari. Hasilnya glukosa untuk makanan tumbuhan dan oksigen untuk kita bernapas.`,
    deafVisualSummary: {
        summary: "Fotosintesis adalah cara tumbuhan membuat makanan sendiri di daun.",
        sections: [
            {
                heading: "Tempat fotosintesis",
                points: ["Fotosintesis terjadi di daun.", "Daun punya zat hijau bernama klorofil."],
            },
            {
                heading: "Bahan fotosintesis",
                points: [
                    "Air diambil akar dari tanah.",
                    "Karbon dioksida masuk dari udara lewat stomata.",
                    "Cahaya matahari ditangkap klorofil.",
                ],
            },
            {
                heading: "Hasil fotosintesis",
                points: [
                    "Glukosa menjadi makanan tumbuhan.",
                    "Oksigen keluar ke udara.",
                    "Manusia dan hewan menghirup oksigen.",
                ],
            },
        ],
        conceptMap: {
            central: "Fotosintesis",
            branches: [
                { label: "Tempat", children: ["Daun", "Klorofil"] },
                { label: "Bahan", children: ["Air", "Karbon dioksida", "Cahaya matahari"] },
                { label: "Hasil", children: ["Glukosa", "Oksigen"] },
            ],
        },
        glossary: [
            { term: "Klorofil", definition: "Zat hijau di daun yang menangkap cahaya matahari." },
            { term: "Stomata", definition: "Lubang sangat kecil di daun untuk keluar masuk udara." },
            { term: "Glukosa", definition: "Gula yang menjadi makanan tumbuhan." },
            { term: "Karbon dioksida", definition: "Gas di udara yang dipakai tumbuhan untuk membuat makanan." },
        ],
    },
    exam: {
        title: "Ulangan Harian IPA: Fotosintesis",
        pin: "1234",
        questions: [
            {
                question: "Di bagian tumbuhan manakah fotosintesis terjadi?",
                options: { A: "Akar", B: "Daun", C: "Batang", D: "Bunga" },
                correctAnswer: "B",
            },
            {
                question: "Apa nama zat hijau daun yang menangkap cahaya matahari?",
                options: { A: "Klorofil", B: "Glukosa", C: "Stomata", D: "Oksigen" },
                correctAnswer: "A",
            },
            {
                question: "Gas apa yang diambil tumbuhan dari udara untuk fotosintesis?",
                options: { A: "Oksigen", B: "Nitrogen", C: "Karbon dioksida", D: "Uap air" },
                correctAnswer: "C",
            },
            {
                question: "Gas apa yang dilepaskan tumbuhan ke udara saat fotosintesis?",
                options: { A: "Karbon dioksida", B: "Asap", C: "Uap air", D: "Oksigen" },
                correctAnswer: "D",
            },
            {
                question: "Apa yang terjadi pada tumbuhan yang lama disimpan di tempat gelap?",
                options: {
                    A: "Tumbuh makin cepat",
                    B: "Berbunga lebih banyak",
                    C: "Layu dan menguning",
                    D: "Daunnya makin hijau",
                },
                correctAnswer: "C",
            },
        ],
        submissions: [
            { studentName: "Maria Ndun", answers: ["B", "A", "C", "D", "C"] },
            { studentName: "Yosef Bria", answers: ["B", "A", "A", "D", "C"] },
            { studentName: "Rina Seran", answers: ["B", "C", "C", null, "C"] },
        ],
    },
};

const siklusAir: SeedModule = {
    title: "Siklus Air di Bumi",
    rawContent: `Air di bumi selalu bergerak dan berputar. Perputaran ini disebut siklus air. Siklus air membuat air di bumi tidak pernah habis.

Tahapan siklus air:
| Tahap | Proses |
| Penguapan (evaporasi) | Panas matahari mengubah air laut, sungai, dan danau menjadi uap air |
| Pengembunan (kondensasi) | Uap air naik, mendingin, lalu menjadi titik-titik air yang membentuk awan |
| Hujan (presipitasi) | Awan yang berat menjatuhkan air ke bumi sebagai hujan |
| Peresapan (infiltrasi) | Air hujan meresap ke dalam tanah menjadi air tanah |

Air yang tidak meresap akan mengalir di permukaan tanah menuju sungai, lalu kembali ke laut. Setelah itu siklus dimulai lagi.

Menjaga siklus air dapat dilakukan dengan menanam pohon dan tidak membuang sampah ke sungai. Akar pohon membantu air hujan meresap ke dalam tanah sehingga mencegah banjir dan menjaga persediaan air sumur.`,
    blindAudioScript: `Kali ini kita belajar tentang siklus air, yaitu perjalanan air yang terus berputar di bumi.

Air di bumi tidak pernah diam. Air dari laut bisa menjadi awan, lalu turun sebagai hujan, kemudian kembali lagi ke laut. Perputaran inilah yang disebut siklus air, dan karena itu air di bumi tidak pernah habis.

Di dalam materi ada sebuah tabel yang menjelaskan empat tahap siklus air. Mari kita dengarkan satu per satu.

Tahap pertama adalah penguapan, atau evaporasi. Panas matahari memanaskan air di laut, sungai, dan danau sehingga berubah menjadi uap air yang naik ke udara.

Tahap kedua adalah pengembunan, atau kondensasi. Di tempat yang tinggi udaranya dingin, sehingga uap air berubah menjadi titik-titik air yang sangat kecil. Kumpulan titik air inilah yang membentuk awan.

Tahap ketiga adalah hujan, atau presipitasi. Ketika awan sudah berat oleh air, airnya jatuh ke bumi sebagai hujan.

Tahap keempat adalah peresapan, atau infiltrasi. Air hujan meresap ke dalam tanah dan menjadi air tanah, yang nantinya bisa kita ambil dari sumur.

Air hujan yang tidak meresap akan mengalir di permukaan tanah menuju sungai, lalu kembali ke laut. Setelah itu siklus dimulai lagi dari awal.

Kita bisa ikut menjaga siklus air dengan menanam pohon dan tidak membuang sampah ke sungai. Akar pohon membantu air hujan masuk ke dalam tanah, sehingga mencegah banjir dan menjaga air sumur tetap ada.

Sebagai rangkuman, siklus air punya empat tahap: penguapan, pengembunan, hujan, dan peresapan. Menanam pohon membantu siklus air tetap berjalan dengan baik.`,
    deafVisualSummary: {
        summary: "Air di bumi terus berputar dari laut ke awan, lalu turun lagi sebagai hujan.",
        sections: [
            {
                heading: "Empat tahap siklus air",
                points: [
                    "Penguapan: matahari mengubah air menjadi uap.",
                    "Pengembunan: uap air menjadi awan.",
                    "Hujan: air dari awan jatuh ke bumi.",
                    "Peresapan: air hujan masuk ke tanah.",
                ],
            },
            {
                heading: "Air kembali ke laut",
                points: ["Air hujan mengalir ke sungai.", "Sungai membawa air ke laut.", "Siklus dimulai lagi."],
            },
            {
                heading: "Cara menjaga siklus air",
                points: ["Menanam pohon.", "Tidak membuang sampah ke sungai.", "Akar pohon menahan air hujan."],
            },
        ],
        conceptMap: {
            central: "Siklus Air",
            branches: [
                { label: "Penguapan", children: ["Panas matahari", "Air menjadi uap"] },
                { label: "Pengembunan", children: ["Uap menjadi awan"] },
                { label: "Hujan", children: ["Air jatuh ke bumi"] },
                { label: "Peresapan", children: ["Air masuk ke tanah", "Menjadi air sumur"] },
            ],
        },
        glossary: [
            { term: "Evaporasi", definition: "Air berubah menjadi uap karena panas." },
            { term: "Kondensasi", definition: "Uap air berubah menjadi titik air, lalu menjadi awan." },
            { term: "Presipitasi", definition: "Air turun dari awan, misalnya hujan." },
            { term: "Infiltrasi", definition: "Air hujan meresap masuk ke dalam tanah." },
        ],
    },
    exam: {
        title: "Kuis IPA: Siklus Air",
        pin: "2345",
        questions: [
            {
                question: "Apa nama proses air berubah menjadi uap karena panas matahari?",
                options: { A: "Pengembunan", B: "Penguapan", C: "Peresapan", D: "Hujan" },
                correctAnswer: "B",
            },
            {
                question: "Uap air yang mendingin di udara akan membentuk apa?",
                options: { A: "Awan", B: "Sungai", C: "Tanah", D: "Batu" },
                correctAnswer: "A",
            },
            {
                question: "Apa nama lain dari tahap hujan dalam siklus air?",
                options: { A: "Evaporasi", B: "Infiltrasi", C: "Kondensasi", D: "Presipitasi" },
                correctAnswer: "D",
            },
            {
                question: "Air hujan yang masuk ke dalam tanah disebut proses apa?",
                options: { A: "Penguapan", B: "Pengembunan", C: "Peresapan", D: "Pencairan" },
                correctAnswer: "C",
            },
            {
                question: "Cara apa yang membantu air hujan meresap ke dalam tanah?",
                options: {
                    A: "Membuang sampah ke sungai",
                    B: "Menanam pohon",
                    C: "Menebang hutan",
                    D: "Menutup tanah dengan semen",
                },
                correctAnswer: "B",
            },
        ],
        submissions: [
            { studentName: "Maria Ndun", answers: ["B", "A", "D", "C", "B"] },
            { studentName: "Markus Tefa", answers: ["A", "A", "D", "C", "B"] },
        ],
    },
};

const pecahan: SeedModule = {
    title: "Mengenal Pecahan Sederhana",
    rawContent: `Pecahan adalah bilangan yang menunjukkan bagian dari satu benda utuh yang dibagi sama besar.

Pecahan ditulis dengan dua angka yang dipisah garis, misalnya 1/2. Angka di atas disebut pembilang, yaitu banyak bagian yang diambil. Angka di bawah disebut penyebut, yaitu banyak bagian seluruhnya.

Contoh: Ibu memotong satu kue sagu menjadi 4 bagian sama besar. Adik mengambil 1 bagian. Bagian yang diambil adik adalah 1/4 kue.

Pecahan yang sering dipakai:
- 1/2 dibaca setengah atau satu per dua
- 1/3 dibaca sepertiga atau satu per tiga
- 1/4 dibaca seperempat atau satu per empat

Membandingkan pecahan dengan pembilang 1: semakin besar penyebutnya, semakin kecil bagiannya. Jadi 1/2 lebih besar daripada 1/4.`,
    blindAudioScript: `Hari ini kita mengenal pecahan sederhana.

Pecahan adalah bilangan yang menunjukkan bagian dari satu benda utuh, yang dibagi menjadi beberapa bagian sama besar.

Pecahan punya dua angka. Angka yang ditulis di atas disebut pembilang, artinya berapa bagian yang diambil. Angka yang ditulis di bawah disebut penyebut, artinya benda itu dibagi menjadi berapa bagian semuanya. Kedua angka itu dipisahkan oleh sebuah garis.

Mari kita bayangkan sebuah contoh. Ibu memotong satu kue sagu menjadi empat bagian yang sama besar. Adik mengambil satu bagian. Maka bagian yang diambil adik adalah satu per empat kue, atau seperempat kue. Pembilangnya satu, penyebutnya empat.

Ada tiga pecahan yang sering kita pakai. Satu per dua, yang biasa disebut setengah. Satu per tiga, yang disebut sepertiga. Dan satu per empat, yang disebut seperempat.

Bagaimana cara membandingkan pecahan yang pembilangnya sama-sama satu? Ingat aturan ini: semakin besar penyebutnya, semakin kecil bagiannya. Jadi setengah kue lebih besar daripada seperempat kue, karena kue yang dibagi empat potongannya lebih kecil.

Sebagai rangkuman, pecahan menunjukkan bagian dari benda utuh. Pembilang adalah bagian yang diambil, penyebut adalah jumlah semua bagian.`,
    deafVisualSummary: {
        summary: "Pecahan menunjukkan bagian dari satu benda utuh yang dibagi sama besar.",
        sections: [
            {
                heading: "Bagian pecahan",
                points: [
                    "Pembilang: angka di atas, bagian yang diambil.",
                    "Penyebut: angka di bawah, jumlah semua bagian.",
                ],
            },
            {
                heading: "Contoh kue sagu",
                points: ["Kue dipotong 4 bagian sama besar.", "Adik mengambil 1 bagian.", "Adik mendapat 1/4 kue."],
            },
            {
                heading: "Membandingkan pecahan",
                points: ["Penyebut makin besar, bagian makin kecil.", "1/2 lebih besar dari 1/4."],
            },
        ],
        conceptMap: {
            central: "Pecahan",
            branches: [
                { label: "Pembilang", children: ["Angka di atas", "Bagian yang diambil"] },
                { label: "Penyebut", children: ["Angka di bawah", "Jumlah semua bagian"] },
                { label: "Contoh", children: ["1/2 setengah", "1/3 sepertiga", "1/4 seperempat"] },
            ],
        },
        glossary: [
            { term: "Pecahan", definition: "Bilangan yang menunjukkan bagian dari benda utuh." },
            { term: "Pembilang", definition: "Angka di atas garis, banyak bagian yang diambil." },
            { term: "Penyebut", definition: "Angka di bawah garis, banyak semua bagian." },
        ],
    },
    exam: {
        title: "Latihan Matematika: Pecahan",
        pin: "3456",
        questions: [
            {
                question: "Pada pecahan satu per empat, angka empat disebut apa?",
                options: { A: "Pembilang", B: "Penyebut", C: "Hasil", D: "Sisa" },
                correctAnswer: "B",
            },
            {
                question: "Satu kue dipotong dua bagian sama besar. Satu bagiannya disebut apa?",
                options: { A: "Seperempat", B: "Sepertiga", C: "Setengah", D: "Satu utuh" },
                correctAnswer: "C",
            },
            {
                question: "Mana yang lebih besar, setengah atau seperempat?",
                options: { A: "Setengah", B: "Seperempat", C: "Sama besar", D: "Tidak bisa dibandingkan" },
                correctAnswer: "A",
            },
            {
                question: "Pada pecahan satu per tiga, angka satu disebut apa?",
                options: { A: "Penyebut", B: "Pembagi", C: "Hasil", D: "Pembilang" },
                correctAnswer: "D",
            },
            {
                question: "Kue dipotong empat bagian sama besar dan kamu mengambil satu. Berapa bagianmu?",
                options: { A: "Setengah", B: "Seperempat", C: "Sepertiga", D: "Satu utuh" },
                correctAnswer: "B",
            },
        ],
        submissions: [
            { studentName: "Siti Wenda", answers: ["B", "C", "A", "D", "B"] },
            { studentName: "Agus Kogoya", answers: ["A", "C", "A", "D", null] },
        ],
    },
};

const keragamanBudaya: SeedModule = {
    title: "Keragaman Budaya Indonesia",
    rawContent: `Indonesia memiliki lebih dari 1.300 suku bangsa yang tersebar dari Sabang sampai Merauke. Setiap suku memiliki budaya yang berbeda, seperti bahasa daerah, rumah adat, pakaian adat, tarian, dan makanan khas.

Contoh keragaman budaya:
- Papua: rumah adat Honai dan makanan khas papeda dari sagu.
- Nusa Tenggara Timur: kain tenun ikat yang dibuat dengan tangan.
- Maluku: tari Cakalele yang menggambarkan semangat keberanian.

Keragaman budaya adalah kekayaan bangsa. Semboyan Bhinneka Tunggal Ika berarti berbeda-beda tetapi tetap satu jua.

Sikap yang baik terhadap keragaman budaya adalah saling menghormati, tidak mengejek budaya lain, dan bangga terhadap budaya sendiri.`,
    blindAudioScript: `Hari ini kita belajar tentang keragaman budaya Indonesia.

Indonesia memiliki lebih dari seribu tiga ratus suku bangsa, yang tinggal dari Sabang di ujung barat sampai Merauke di ujung timur. Setiap suku punya budaya sendiri, seperti bahasa daerah, rumah adat, pakaian adat, tarian, dan makanan khas.

Mari kita kenali beberapa contohnya. Di Papua ada rumah adat bernama Honai, rumah berbentuk bulat dengan atap jerami yang menjaga penghuninya tetap hangat. Makanan khas Papua adalah papeda, bubur kental yang dibuat dari sagu.

Di Nusa Tenggara Timur ada kain tenun ikat. Kain ini ditenun dengan tangan dan setiap daerah punya motifnya sendiri.

Di Maluku ada tari Cakalele, tarian perang yang menggambarkan semangat dan keberanian.

Semua perbedaan itu adalah kekayaan bangsa kita. Indonesia punya semboyan Bhinneka Tunggal Ika, yang artinya berbeda-beda tetapi tetap satu jua.

Sikap yang baik terhadap keragaman budaya adalah saling menghormati, tidak mengejek budaya orang lain, dan bangga terhadap budaya sendiri.

Sebagai rangkuman, Indonesia kaya akan suku dan budaya. Kita menjaga persatuan dengan saling menghormati, sesuai semboyan Bhinneka Tunggal Ika.`,
    deafVisualSummary: {
        summary: "Indonesia punya banyak suku dengan budaya yang berbeda, tetapi tetap satu bangsa.",
        sections: [
            {
                heading: "Bentuk budaya",
                points: ["Bahasa daerah.", "Rumah adat dan pakaian adat.", "Tarian dan makanan khas."],
            },
            {
                heading: "Contoh budaya",
                points: ["Papua: rumah Honai dan papeda.", "NTT: kain tenun ikat.", "Maluku: tari Cakalele."],
            },
            {
                heading: "Sikap yang baik",
                points: ["Saling menghormati.", "Tidak mengejek budaya lain.", "Bangga pada budaya sendiri."],
            },
        ],
        conceptMap: {
            central: "Keragaman Budaya",
            branches: [
                { label: "Papua", children: ["Honai", "Papeda"] },
                { label: "Nusa Tenggara Timur", children: ["Tenun ikat"] },
                { label: "Maluku", children: ["Tari Cakalele"] },
                { label: "Persatuan", children: ["Bhinneka Tunggal Ika", "Saling menghormati"] },
            ],
        },
        glossary: [
            { term: "Suku bangsa", definition: "Kelompok orang dengan bahasa dan adat yang sama." },
            { term: "Honai", definition: "Rumah adat Papua yang berbentuk bulat." },
            { term: "Bhinneka Tunggal Ika", definition: "Berbeda-beda tetapi tetap satu." },
        ],
    },
    exam: {
        title: "Kuis IPS: Keragaman Budaya",
        pin: "4567",
        questions: [
            {
                question: "Apa nama rumah adat dari Papua?",
                options: { A: "Joglo", B: "Gadang", C: "Honai", D: "Tongkonan" },
                correctAnswer: "C",
            },
            {
                question: "Papeda adalah makanan khas yang dibuat dari apa?",
                options: { A: "Sagu", B: "Beras", C: "Jagung", D: "Singkong" },
                correctAnswer: "A",
            },
            {
                question: "Apa arti semboyan Bhinneka Tunggal Ika?",
                options: {
                    A: "Bersatu kita teguh",
                    B: "Berbeda-beda tetapi tetap satu",
                    C: "Gotong royong",
                    D: "Maju terus pantang mundur",
                },
                correctAnswer: "B",
            },
            {
                question: "Tari Cakalele berasal dari daerah mana?",
                options: { A: "Bali", B: "Aceh", C: "Papua", D: "Maluku" },
                correctAnswer: "D",
            },
            {
                question: "Apa sikap yang baik terhadap budaya daerah lain?",
                options: {
                    A: "Mengejeknya",
                    B: "Saling menghormati",
                    C: "Tidak peduli",
                    D: "Melarangnya",
                },
                correctAnswer: "B",
            },
        ],
        submissions: [{ studentName: "Siti Wenda", answers: ["C", "A", "B", "D", "B"] }],
    },
};

export const SEED_TEACHERS: SeedTeacher[] = [
    {
        name: "Sari Wulandari, S.Pd.",
        email: "guru@nusatara.id",
        modules: [fotosintesis, siklusAir],
    },
    {
        name: "Yohanes Kambu, S.Pd.",
        email: "guru2@nusatara.id",
        modules: [pecahan, keragamanBudaya],
    },
];
