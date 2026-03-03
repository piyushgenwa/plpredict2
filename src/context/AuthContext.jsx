import { createContext, useContext, useState, useEffect } from 'react'
import {
  saveUser,
  getUserByEmail,
  getUserByUsername,
  getUserById,
  getSession,
  setSession,
  clearSession,
} from '../utils/storage.js'
import { hashPassword, verifyPassword } from '../utils/crypto.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = getSession()
    if (session?.userId) {
      const u = getUserById(session.userId)
      if (u) setUser(u)
    }
    setLoading(false)
  }, [])

  async function register({ email, username, password }) {
    if (getUserByEmail(email)) throw new Error('Email already registered')
    if (getUserByUsername(username)) throw new Error('Username already taken')

    const hashed = await hashPassword(password)
    const newUser = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      username,
      password: hashed,
      is_admin: false,
      created_at: new Date().toISOString(),
    }
    saveUser(newUser)
    setSession({ userId: newUser.id })
    setUser(newUser)
    return newUser
  }

  async function login({ email, password }) {
    const found = getUserByEmail(email)
    if (!found) throw new Error('Invalid email or password')
    const valid = await verifyPassword(password, found.password)
    if (!valid) throw new Error('Invalid email or password')
    setSession({ userId: found.id })
    setUser(found)
    return found
  }

  function logout() {
    clearSession()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
