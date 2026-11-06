export const API_BASE = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000'

export async function apiHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/v1/health`)
    return res.ok
  } catch {
    return false
  }
}
