import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('diacare_token')
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const me = await api.me()
      setUser(me)
    } catch (_) {
      localStorage.removeItem('diacare_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (email, password) => {
    const data = await api.login({ email, password })
    if (data.requires_otp) {
      return data
    }
    localStorage.setItem('diacare_token', data.access_token)
    setUser(data.user)
    return data.user
  }

  const verifyOtpLogin = async (email, otp_code) => {
    const data = await api.verifyOtp({ email, otp_code })
    localStorage.setItem('diacare_token', data.access_token)
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    const data = await api.register(payload)
    if (data.status === 'pending') {
      return data
    }
    localStorage.setItem('diacare_token', data.access_token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('diacare_token')
    setUser(null)
  }


  const refreshUser = async () => {
    const me = await api.me()
    setUser(me)
    return me
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, verifyOtpLogin }}>
      {children}
    </AuthContext.Provider>
  )

}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
