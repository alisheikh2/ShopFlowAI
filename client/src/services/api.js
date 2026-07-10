const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

const LEGACY_TOKEN_KEY = 'shopflowai_access_token'
export const AUTH_EXPIRED_EVENT = 'shopflowai:auth-expired'
let memoryAccessToken = null
let refreshPromise = null

const removeLegacyToken = () => {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    // Storage may be unavailable in privacy-restricted browsers.
  }
}

export const tokenStore = {
  get: () => memoryAccessToken,
  set: (token) => {
    memoryAccessToken = token || null
    removeLegacyToken()
  },
  clear: () => {
    memoryAccessToken = null
    removeLegacyToken()
  },
}

const notifyAuthExpired = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
  }
}

const buildUrl = (endpoint, query) => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = new URL(`${API_BASE_URL}${path}`)

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }

  return url.toString()
}

const readPayload = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/pdf')) return response.blob()
  return contentType.includes('application/json')
    ? await response.json()
    : await response.text()
}

export class ApiError extends Error {
  constructor(message, statusCode, payload) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.payload = payload
  }
}

export const refreshSession = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(buildUrl('/users/refresh-token'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const payload = await readPayload(response)
      if (!response.ok) {
        tokenStore.clear()
        throw new ApiError(
          payload?.message || 'Your session has expired. Please sign in again.',
          response.status,
          payload,
        )
      }

      const token = payload.data?.accessToken
      if (!token) {
        tokenStore.clear()
        throw new ApiError('Refresh response did not include an access token', 500, payload)
      }
      tokenStore.set(token)
      return token
    })().finally(() => {
      refreshPromise = null
    })
  }

  return await refreshPromise
}

export const apiRequest = async (endpoint, options = {}) => {
  const { query, body, headers, skipAuthRefresh = false, ...rest } = options
  const token = tokenStore.get()
  const requestOptions = {
    credentials: 'include',
    headers: {
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body instanceof FormData
      ? body
      : body !== undefined && body !== null
        ? JSON.stringify(body)
        : undefined,
    ...rest,
  }

  let response = await fetch(buildUrl(endpoint, query), requestOptions)

  if (
    response.status === 401 &&
    token &&
    !skipAuthRefresh &&
    endpoint !== '/users/refresh-token'
  ) {
    try {
      const refreshedToken = await refreshSession()
      response = await fetch(buildUrl(endpoint, query), {
        ...requestOptions,
        headers: {
          ...requestOptions.headers,
          Authorization: `Bearer ${refreshedToken}`,
        },
      })
    } catch {
      notifyAuthExpired()
    }
  }

  const contentType = response.headers.get('content-type') || ''
  const payload = await readPayload(response)

  if (!response.ok) {
    if (response.status === 401 && token) {
      tokenStore.clear()
      notifyAuthExpired()
    }
    const fallback = contentType.includes('application/pdf')
      ? 'Failed to download PDF'
      : 'Something went wrong'
    throw new ApiError(payload?.message || fallback, response.status, payload)
  }

  return payload
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => apiRequest(endpoint, { method: 'POST', body, ...options }),
  put: (endpoint, body, options) => apiRequest(endpoint, { method: 'PUT', body, ...options }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { method: 'PATCH', body, ...options }),
  delete: (endpoint, options) => apiRequest(endpoint, { method: 'DELETE', ...options }),
}

export default api
