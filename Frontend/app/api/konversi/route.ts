export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.BACKEND_URL ||
      'http://localhost:3001'

    // Forward to Elysia Backend /api/modules/convert
    const res = await fetch(`${backendUrl}/api/modules/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') ?? '',
      },
      body: JSON.stringify({
        title: body.title,
        content: body.text || body.content,
        questionCount: body.questionCount ?? 5,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      // Map to frontend expected shape
      return Response.json({
        ...data,
        questions: (data.questions || []).map((q: any, i: number) => ({
          id: q.id ?? i + 1,
          text: q.question ?? q.text,
          options: q.options,
          answer: q.correctAnswer ?? q.answer,
        })),
      })
    }

    const errData = await res.json().catch(() => ({}))
    return Response.json(
      { code: errData.code || 'AI_FAILED', message: errData.message || 'Konversi gagal.' },
      { status: res.status },
    )
  } catch (err) {
    console.error('[konversi] gagal:', err)
    return Response.json({ code: 'AI_FAILED', message: 'Gagal terhubung ke backend konversi.' }, { status: 502 })
  }
}
