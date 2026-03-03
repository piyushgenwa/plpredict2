import { createContext, useContext, useState, useEffect } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '../utils/firebase.js'
import { saveUser, getUserById } from '../utils/db.js'

// Users that should always have admin access
const ADMIN_USER_IDS = [
  '847f5826-f0a9-49eb-ba4e-456d272c4918',
]

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser) {
        const profile = await getUserById(firebaseUser.uid)
        setUser(profile)
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function register({ email, username, password }) {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)
    const newUser = {
      id: firebaseUser.uid,
      username,
      is_admin: ADMIN_USER_IDS.includes(firebaseUser.uid),
      created_at: new Date().toISOString(),
    }
    await saveUser(newUser)
    setUser(newUser)
    return newUser
  }

  async function login({ email, password }) {
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password)
    let profile = await getUserById(firebaseUser.uid)
    if (ADMIN_USER_IDS.includes(firebaseUser.uid) && profile && !profile.is_admin) {
      await saveUser({ ...profile, is_admin: true })
      profile = { ...profile, is_admin: true }
    }
    setUser(profile)
    return profile
  }

  async function logout() {
    await signOut(auth)
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
