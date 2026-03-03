import { db } from './firebase.js'
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  query, where, orderBy, addDoc,
} from 'firebase/firestore'

// ── Users / Profiles ──────────────────────────────────────────────────────────

export async function saveUser(user) {
  await setDoc(doc(db, 'profiles', user.id), {
    username: user.username,
    is_admin: user.is_admin ?? false,
    created_at: user.created_at || new Date().toISOString(),
  }, { merge: true })
}

export async function getUserById(userId) {
  const snap = await getDoc(doc(db, 'profiles', userId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function getUserByEmail() {
  // Handled by Firebase Auth directly — stub for compatibility
  return null
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'profiles'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── Matches ───────────────────────────────────────────────────────────────────

export async function saveMatch(match) {
  await setDoc(doc(db, 'matches', match.id), {
    api_fixture_id: match.api_fixture_id ?? null,
    home_team: match.home_team,
    away_team: match.away_team,
    home_team_logo: match.home_team_logo ?? null,
    away_team_logo: match.away_team_logo ?? null,
    kickoff_time: match.kickoff_time,
    matchday: match.matchday ?? null,
    round: match.round ?? null,
    home_score: match.home_score ?? null,
    away_score: match.away_score ?? null,
    is_completed: match.is_completed ?? false,
    api_status: match.api_status ?? 'NS',
    last_api_sync: match.last_api_sync ?? null,
    created_at: match.created_at || new Date().toISOString(),
  })
}

export async function getMatchById(matchId) {
  const snap = await getDoc(doc(db, 'matches', matchId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function getMatchByApiId(apiFixtureId) {
  const snap = await getDocs(
    query(collection(db, 'matches'), where('api_fixture_id', '==', apiFixtureId))
  )
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

export async function getAllMatches() {
  const snap = await getDocs(
    query(collection(db, 'matches'), orderBy('kickoff_time'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function deleteMatch(matchId) {
  await deleteDoc(doc(db, 'matches', matchId))
}

// ── Predictions ───────────────────────────────────────────────────────────────

export async function savePrediction(prediction) {
  await setDoc(doc(db, 'predictions', prediction.id), {
    user_id: prediction.user_id,
    match_id: prediction.match_id,
    matchday: prediction.matchday ?? null,
    home_score_prediction: prediction.home_score_prediction,
    away_score_prediction: prediction.away_score_prediction,
    points_earned: prediction.points_earned ?? null,
    submitted_at: prediction.submitted_at || new Date().toISOString(),
  })
}

export async function getPrediction(userId, matchId) {
  const snap = await getDocs(
    query(
      collection(db, 'predictions'),
      where('user_id', '==', userId),
      where('match_id', '==', matchId)
    )
  )
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

export async function getAllPredictionsForMatch(matchId) {
  const snap = await getDocs(
    query(collection(db, 'predictions'), where('match_id', '==', matchId))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getUserPredictions(userId) {
  const snap = await getDocs(
    query(collection(db, 'predictions'), where('user_id', '==', userId))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboard(matchday = null) {
  const predsQuery = matchday !== null
    ? query(collection(db, 'predictions'), where('matchday', '==', matchday))
    : collection(db, 'predictions')

  const [profilesSnap, predsSnap] = await Promise.all([
    getDocs(collection(db, 'profiles')),
    getDocs(predsQuery),
  ])

  const profiles = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const preds = predsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

  const byUser = {}
  for (const p of preds) {
    if (!byUser[p.user_id]) byUser[p.user_id] = []
    byUser[p.user_id].push(p)
  }

  return profiles
    .map(u => {
      const userPreds = byUser[u.id] || []
      const total_points = userPreds.reduce((s, p) => s + (p.points_earned || 0), 0)
      const exact_scores = userPreds.filter(p => p.points_earned === 10).length
      return {
        user_id: u.id,
        username: u.username,
        total_points,
        predictions_count: userPreds.length,
        exact_scores_count: exact_scores,
      }
    })
    .sort((a, b) => b.total_points - a.total_points)
    .map((entry, i) => ({ ...entry, rank: i + 1 }))
}

// ── API Logs ──────────────────────────────────────────────────────────────────

export async function logApiCall(endpoint, params, status, body) {
  try {
    await addDoc(collection(db, 'api_logs'), {
      endpoint,
      request_params: params,
      response_status: status,
      response_body: body,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('logApiCall error:', err.message)
  }
}

// ── Settings (last fixture sync) ──────────────────────────────────────────────

export async function getLastFixtureSync() {
  const snap = await getDoc(doc(db, 'settings', 'last_fixture_sync'))
  if (!snap.exists()) return null
  return snap.data().value
}

export async function setLastFixtureSync(date) {
  await setDoc(doc(db, 'settings', 'last_fixture_sync'), { value: date })
}
