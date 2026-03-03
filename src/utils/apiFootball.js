import {
  getMatchByApiId,
  saveMatch,
  getAllMatches,
  getAllUsers,
  savePrediction,
  getPrediction,
  logApiCall,
  setLastFixtureSync,
} from './db.js'
import { calculatePoints } from './scoring.js'

// football-data.org team IDs for tracked clubs
export const TRACKED_TEAMS = [
  { id: 57,  name: 'Arsenal' },
  { id: 61,  name: 'Chelsea' },
  { id: 64,  name: 'Liverpool' },
  { id: 65,  name: 'Manchester City' },
  { id: 66,  name: 'Manchester United' },
  { id: 73,  name: 'Tottenham Hotspur' },
]

const TRACKED_TEAM_IDS = new Set(TRACKED_TEAMS.map(t => t.id))

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

// Calls our Vercel serverless proxy — API key never leaves the server
async function proxyFetch(path, params = {}) {
  const qs = new URLSearchParams(params).toString()
  const url = qs ? `${path}?${qs}` : path

  let status = 0
  let body = null
  try {
    const res = await fetch(url)
    status = res.status
    body = await res.json()
    await logApiCall(path, params, status, body)
    return body
  } catch (err) {
    await logApiCall(path, params, status, { error: err.message })
    throw err
  }
}

export async function syncFixtures() {
  const today = new Date()
  const in30 = new Date(today)
  in30.setDate(today.getDate() + 30)

  const data = await proxyFetch('/api/fixtures', {
    dateFrom: formatDate(today),
    dateTo: formatDate(in30),
    status: 'SCHEDULED',
  })

  const allFixtures = data?.matches || []

  // Keep only matches involving at least one tracked team
  const fixtures = allFixtures.filter(
    item =>
      TRACKED_TEAM_IDS.has(item.homeTeam.id) ||
      TRACKED_TEAM_IDS.has(item.awayTeam.id)
  )

  let added = 0
  let updated = 0
  const errors = []

  for (const item of fixtures) {
    try {
      const apiId = item.id
      const existing = await getMatchByApiId(apiId)
      const matchData = {
        id: existing?.id || crypto.randomUUID(),
        api_fixture_id: apiId,
        home_team: item.homeTeam.name,
        away_team: item.awayTeam.name,
        home_team_logo: item.homeTeam.crest || null,
        away_team_logo: item.awayTeam.crest || null,
        kickoff_time: item.utcDate,
        matchday: item.matchday ?? null,
        round: item.matchday ? `Matchday ${item.matchday}` : null,
        home_score: item.score?.fullTime?.home ?? null,
        away_score: item.score?.fullTime?.away ?? null,
        is_completed: item.status === 'FINISHED',
        api_status: item.status,
        last_api_sync: new Date().toISOString(),
      }
      await saveMatch(matchData)
      if (existing) updated++
      else added++
    } catch (err) {
      errors.push(`Match ${item.id}: ${err.message}`)
    }
  }

  await setLastFixtureSync(new Date().toISOString())
  return { added, updated, errors }
}

export async function recalcPointsForMatch(match) {
  if (!match.is_completed || match.home_score === null || match.away_score === null) return

  const users = await getAllUsers()
  for (const user of users) {
    const pred = await getPrediction(user.id, match.id)
    if (!pred) continue
    const points = calculatePoints(
      { home: pred.home_score_prediction, away: pred.away_score_prediction },
      { home: match.home_score, away: match.away_score }
    )
    await savePrediction({ ...pred, points_earned: points })
  }
}

export async function fetchAndSaveResult(match) {
  const data = await proxyFetch(`/api/match/${match.api_fixture_id}`)
  if (!data || data.status !== 'FINISHED') return null

  const homeScore = data.score?.fullTime?.home
  const awayScore = data.score?.fullTime?.away
  if (homeScore === null || awayScore === null) return null

  const updated = {
    ...match,
    home_score: homeScore,
    away_score: awayScore,
    is_completed: true,
    api_status: data.status,
    last_api_sync: new Date().toISOString(),
  }
  await saveMatch(updated)
  await recalcPointsForMatch(updated)
  return updated
}

export async function checkPendingResults() {
  const now = Date.now()
  const matches = (await getAllMatches()).filter(m => {
    if (m.is_completed) return false
    const kickoff = new Date(m.kickoff_time).getTime()
    return kickoff + 120 * 60 * 1000 <= now
  })

  const results = []
  for (const match of matches) {
    try {
      const updated = await fetchAndSaveResult(match)
      if (updated) results.push(updated)
    } catch {
      // admin can retry manually
    }
  }
  return results
}
