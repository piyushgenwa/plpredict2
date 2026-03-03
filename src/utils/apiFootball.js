import {
  getMatchByApiId,
  saveMatch,
  getAllMatches,
  getAllUsers,
  savePrediction,
  getPrediction,
  logApiCall,
  setLastFixtureSync,
} from './storage.js'
import { calculatePoints } from './scoring.js'

const BASE_URL = 'https://v3.football.api-sports.io'
const LEAGUE_ID = import.meta.env.VITE_PREMIER_LEAGUE_ID || '39'
const SEASON = import.meta.env.VITE_CURRENT_SEASON || '2025'

export const TRACKED_TEAMS = [
  { id: 40, name: 'Liverpool' },
  { id: 50, name: 'Manchester City' },
  { id: 33, name: 'Manchester United' },
  { id: 47, name: 'Tottenham' },
  { id: 42, name: 'Arsenal' },
  { id: 49, name: 'Chelsea' },
]

function getHeaders() {
  return {
    'x-rapidapi-key': import.meta.env.VITE_API_FOOTBALL_KEY || '',
    'x-rapidapi-host': 'v3.football.api-sports.io',
  }
}

function parseMatchday(round) {
  const m = round?.match(/\d+/)
  return m ? parseInt(m[0]) : null
}

function formatDate(date) {
  return date.toISOString().split('T')[0]
}

async function apiFetch(path, params) {
  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  let status = 0
  let body = null
  try {
    const res = await fetch(url.toString(), { headers: getHeaders() })
    status = res.status
    body = await res.json()
    logApiCall(path, params, status, body)
    return body
  } catch (err) {
    logApiCall(path, params, status, { error: err.message })
    throw err
  }
}

export async function fetchFixtures(teamId, fromDate, toDate) {
  return apiFetch('/fixtures', {
    league: LEAGUE_ID,
    season: SEASON,
    team: teamId,
    from: fromDate,
    to: toDate,
  })
}

export async function fetchResult(fixtureId) {
  return apiFetch('/fixtures', { id: fixtureId })
}

export async function syncFixtures() {
  const today = new Date()
  const in30 = new Date(today)
  in30.setDate(today.getDate() + 30)
  const from = formatDate(today)
  const to = formatDate(in30)

  const errors = []
  let added = 0
  let updated = 0
  const seen = new Set()

  for (const team of TRACKED_TEAMS) {
    try {
      const data = await fetchFixtures(team.id, from, to)
      const fixtures = data?.response || []

      for (const item of fixtures) {
        const apiId = item.fixture.id
        if (seen.has(apiId)) continue
        seen.add(apiId)

        const existing = getMatchByApiId(apiId)
        const matchData = {
          id: existing?.id || crypto.randomUUID(),
          api_fixture_id: apiId,
          home_team: item.teams.home.name,
          away_team: item.teams.away.name,
          home_team_logo: item.teams.home.logo,
          away_team_logo: item.teams.away.logo,
          kickoff_time: item.fixture.date,
          matchday: parseMatchday(item.league.round),
          round: item.league.round,
          home_score: item.goals.home,
          away_score: item.goals.away,
          is_completed: ['FT', 'AET', 'PEN'].includes(item.fixture.status.short),
          api_status: item.fixture.status.short,
          last_api_sync: new Date().toISOString(),
          created_at: existing?.created_at || new Date().toISOString(),
        }

        saveMatch(matchData)
        if (existing) updated++
        else added++
      }
    } catch (err) {
      errors.push(`Team ${team.name}: ${err.message}`)
    }
  }

  setLastFixtureSync(new Date().toISOString())
  return { added, updated, errors }
}

export function recalcPointsForMatch(match) {
  if (!match.is_completed || match.home_score === null || match.away_score === null) return

  const users = getAllUsers()
  for (const user of users) {
    const pred = getPrediction(user.id, match.id)
    if (!pred) continue
    const points = calculatePoints(
      { home: pred.home_score_prediction, away: pred.away_score_prediction },
      { home: match.home_score, away: match.away_score }
    )
    savePrediction({ ...pred, points_earned: points })
  }
}

export async function fetchAndSaveResult(match) {
  const data = await fetchResult(match.api_fixture_id)
  const fixture = data?.response?.[0]
  if (!fixture) return null

  const status = fixture.fixture.status.short
  if (!['FT', 'AET', 'PEN'].includes(status)) return null

  const homeScore = fixture.score.fulltime.home
  const awayScore = fixture.score.fulltime.away
  if (homeScore === null || awayScore === null) return null

  const updated = {
    ...match,
    home_score: homeScore,
    away_score: awayScore,
    is_completed: true,
    api_status: status,
    last_api_sync: new Date().toISOString(),
  }
  saveMatch(updated)
  recalcPointsForMatch(updated)
  return updated
}

export async function checkPendingResults() {
  const now = Date.now()
  const matches = getAllMatches().filter(m => {
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
