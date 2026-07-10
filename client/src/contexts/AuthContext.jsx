/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { AUTH_EXPIRED_EVENT, refreshSession, tokenStore } from '../services/api'
import { signInWithGooglePopup } from '../services/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  const clearAuthState = useCallback(() => {
    tokenStore.clear()
    setAccessToken(null)
    setUser(null)
  }, [])

  const refreshCurrentUser = useCallback(async () => {
    try {
      setIsLoading(true)
      let token = tokenStore.get()
      if (!token) {
        token = await refreshSession()
        setAccessToken(token)
      }

      const response = await api.get('/users/me')
      const currentUser = response.data?.user
      setUser(currentUser)
      return currentUser
    } catch {
      clearAuthState()
      return null
    } finally {
      setIsLoading(false)
    }
  }, [clearAuthState])

  useEffect(() => {
    refreshCurrentUser()
  }, [refreshCurrentUser])

  useEffect(() => {
    const handleExpiredSession = () => {
      clearAuthState()
      setAuthError('Your session expired. Please sign in again.')
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession)
  }, [clearAuthState])

  const login = async (credentials) => {
    setAuthError('')
    const response = await api.post('/users/login', credentials)
    const token = response.data?.accessToken
    const loggedInUser = response.data?.user

    tokenStore.set(token)
    setAccessToken(token)
    setUser(loggedInUser)
    return loggedInUser
  }

  const register = async (payload) => {
    setAuthError('')
    return await api.post('/users/register', payload)
  }

  const googleLogin = async () => {
    setAuthError('')
    const idToken = await signInWithGooglePopup()
    const response = await api.post('/users/google-login', { idToken })
    const token = response.data?.accessToken
    const loggedInUser = response.data?.user

    tokenStore.set(token)
    setAccessToken(token)
    setUser(loggedInUser)
    return loggedInUser
  }

  const logout = useCallback(async () => {
    try {
      await api.post('/users/logout')
    } catch {
      // Ignore logout API errors and clear local auth state anyway.
    }
    clearAuthState()
  }, [clearAuthState])

  const value = useMemo(
    () => ({
      accessToken,
      authError,
      isAuthenticated: Boolean(user && accessToken),
      isLoading,
      isAdmin: user?.role === 'admin',
      isCustomer: user?.role === 'customer',
      googleLogin,
      login,
      logout,
      refreshCurrentUser,
      register,
      setAuthError,
      user,
    }),
    [accessToken, authError, isLoading, user, refreshCurrentUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
