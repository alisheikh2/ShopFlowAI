import { beforeEach, expect, it, vi } from 'vitest'

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

beforeEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })
  vi.stubGlobal('window', new EventTarget())
})

it('keeps the access token in memory and refreshes/retries one 401 request', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
    .mockResolvedValueOnce(jsonResponse({ data: { accessToken: 'fresh-token' } }))
    .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }))
  vi.stubGlobal('fetch', fetchMock)

  const { api, tokenStore } = await import('./api.js')
  tokenStore.set('expired-token')
  const result = await api.get('/users/me')

  expect(result.data.ok).toBe(true)
  expect(fetchMock).toHaveBeenCalledTimes(3)
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer expired-token')
  expect(fetchMock.mock.calls[1][0]).toContain('/users/refresh-token')
  expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer fresh-token')
  expect(localStorage.setItem).not.toHaveBeenCalled()
  expect(tokenStore.get()).toBe('fresh-token')
})

it('deduplicates concurrent refresh requests', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    jsonResponse({ data: { accessToken: 'single-refresh-token' } }),
  )
  vi.stubGlobal('fetch', fetchMock)

  const { refreshSession, tokenStore } = await import('./api.js')
  const [first, second] = await Promise.all([refreshSession(), refreshSession()])

  expect(first).toBe('single-refresh-token')
  expect(second).toBe('single-refresh-token')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(tokenStore.get()).toBe('single-refresh-token')
})
