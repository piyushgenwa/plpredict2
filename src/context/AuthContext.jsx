import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../utils/supabase.js'
import { saveUser, getUserById } from '../utils/db.js'

// Users that should always have admin access
const ADMIN_USER_IDS = [
  '847f5826-f0a9-49eb-ba4e-456d272c4918',
]

async function ensureAdminSeeded(userId) {
  if (!ADMIN_USER_IDS.includes(userId)) return
  const profile = await getUserById(userId)
  if (profile && !profile.is_admin) {
    await saveUser({ ...profile, is_admin: true })
  }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await getUserById(session.user.id)
        setUser(profile)
        await ensureAdminSeeded(session.user.id)
      }
      setLoading(false)
    })

    // Keep session in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await getUserById(session.user.id)
        setUser(profile)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function register({ email, username, password }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw new Error(error.message)

    const newUser = {
      id: data.user.id,
      username,
      is_admin: ADMIN_USER_IDS.includes(data.user.id),
    }
    await saveUser(newUser)
    setUser(newUser)
    return newUser
  }

  async function login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)

    const profile = await getUserById(data.user.id)
    await ensureAdminSeeded(data.user.id)
    setUser(profile)
    return profile
  }

  async function logout() {
    await supabase.auth.signOut()
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
