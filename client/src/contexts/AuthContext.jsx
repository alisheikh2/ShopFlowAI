/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { tokenStore } from '../services/api'
import { signInWithGooglePopup } from '../services/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(() => tokenStore.get())
  const [isLoading, setIsLoading] = useState(Boolean(tokenStore.get()))
  const [authError, setAuthError] = useState('')

  const refreshCurrentUser = useCallback(async () => {
    if (!tokenStore.get()) {
      setIsLoading(false)
      return null
    }

    try {
      setIsLoading(true)
      const response = await api.get('/users/me')
      const currentUser = response.data?.user
      setUser(currentUser)
      return currentUser
    } catch {
      tokenStore.clear()
      setAccessToken(null)
      setUser(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshCurrentUser()
  }, [refreshCurrentUser])

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

  const logout = async () => {
    try {
      await api.post('/users/logout')
    } catch {
      // Ignore logout API errors and clear local auth state anyway.
    }
    tokenStore.clear()
    setAccessToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({
      accessToken,
      authError,
      isAuthenticated: Boolean(user && accessToken),
      isLoading,
      isAdmin: user?.role === 'admin',
      googleLogin,
      login,
      logout,
      refreshCurrentUser,
      register,
      setAuthError,
      user,
    }),
    [accessToken, authError, isLoading, user, refreshCurrentUser],
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
