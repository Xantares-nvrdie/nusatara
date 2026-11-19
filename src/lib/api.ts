export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== 'undefined' ? '' : 'http://localhost:3001')

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BACKEND_URL}/api${path.startsWith('/') ? path : `/${path}`}`

  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const headers = new Headers(init?.headers)

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include', // Ensures Better Auth session cookies are sent
  })

  if (!res.ok) {
    let body: any = null
    try {
      body = await res.json()
    } catch {
      // not JSON
    }

    const message = body?.message || `Permintaan gagal (status ${res.status})`
    const code = body?.code || (res.status === 401 ? 'UNAUTHORIZED' : res.status === 404 ? 'NOT_FOUND' : 'API_ERROR')

    throw new ApiError(code, message, res.status)
  }

  // Handle empty responses (like 204 No Content)
  if (res.status === 204) {
    return {} as T
  }

  return (await res.json()) as T
}
