// Key patterns:
// user:{user_id} → user object
// match:{match_id} → match object
// match-api:{api_fixture_id} → match_id
// prediction:{user_id}:{match_id} → prediction object
// email-index:{email} → user_id
// username-index:{username} → user_id
// api-log:{timestamp} → API log entry
// matches-index → array of match_ids
// users-index → array of user_ids

export function getItem(key) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : null
  } catch {
    return null
  }
}

export function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function removeItem(key) {
  localStorage.removeItem(key)
}

// Users
export function saveUser(user) {
  setItem(`user:${user.id}`, user)
  setItem(`email-index:${user.email.toLowerCase()}`, user.id)
  setItem(`username-index:${user.username.toLowerCase()}`, user.id)
  const index = getItem('users-index') || []
  if (!index.includes(user.id)) {
    setItem('users-index', [...index, user.id])
  }
}

export function getUserById(userId) {
  return getItem(`user:${userId}`)
}

export function getUserByEmail(email) {
  const userId = getItem(`email-index:${email.toLowerCase()}`)
  return userId ? getUserById(userId) : null
}

export function getUserByUsername(username) {
  const userId = getItem(`username-index:${username.toLowerCase()}`)
  return userId ? getUserById(userId) : null
}

export function getAllUsers() {
  const index = getItem('users-index') || []
  return index.map(getUserById).filter(Boolean)
}

// Matches
export function saveMatch(match) {
  setItem(`match:${match.id}`, match)
  if (match.api_fixture_id) {
    setItem(`match-api:${match.api_fixture_id}`, match.id)
  }
  const index = getItem('matches-index') || []
  if (!index.includes(match.id)) {
    setItem('matches-index', [...index, match.id])
  }
}

export function getMatchById(matchId) {
  return getItem(`match:${matchId}`)
}

export function getMatchByApiId(apiFixtureId) {
  const matchId = getItem(`match-api:${apiFixtureId}`)
  return matchId ? getMatchById(matchId) : null
}

export function getAllMatches() {
  const index = getItem('matches-index') || []
  return index.map(getMatchById).filter(Boolean)
}

export function deleteMatch(matchId) {
  const match = getMatchById(matchId)
  if (!match) return
  removeItem(`match:${matchId}`)
  if (match.api_fixture_id) {
    removeItem(`match-api:${match.api_fixture_id}`)
  }
  const index = (getItem('matches-index') || []).filter(id => id !== matchId)
  setItem('matches-index', index)
}

// Predictions
export function savePrediction(prediction) {
  setItem(`prediction:${prediction.user_id}:${prediction.match_id}`, prediction)
}

export function getPrediction(userId, matchId) {
  return getItem(`prediction:${userId}:${matchId}`)
}

export function getAllPredictionsForMatch(matchId) {
  const users = getAllUsers()
  return users
    .map(u => getPrediction(u.id, matchId))
    .filter(Boolean)
}

export function getUserPredictions(userId) {
  const matches = getAllMatches()
  return matches
    .map(m => getPrediction(userId, m.id))
    .filter(Boolean)
}

// API Logs
export function logApiCall(endpoint, params, status, body) {
  const entry = {
    id: crypto.randomUUID(),
    endpoint,
    request_params: params,
    response_status: status,
    response_body: body,
    created_at: new Date().toISOString(),
  }
  setItem(`api-log:${entry.id}`, entry)
  const index = getItem('api-logs-index') || []
  setItem('api-logs-index', [...index, entry.id])
  return entry
}

export function getAllApiLogs() {
  const index = getItem('api-logs-index') || []
  return index.map(id => getItem(`api-log:${id}`)).filter(Boolean)
}

// Leaderboard
export function getLeaderboard(matchday = null) {
  const users = getAllUsers()
  const matches = getAllMatches()

  const filtered = matchday
    ? matches.filter(m => m.matchday === matchday)
    : matches

  return users
    .map(user => {
      const predictions = filtered
        .map(m => getPrediction(user.id, m.id))
        .filter(Boolean)

      const total_points = predictions.reduce((sum, p) => sum + (p.points_earned || 0), 0)
      const exact_scores = predictions.filter(p => p.points_earned === 10).length

      return {
        user_id: user.id,
        username: user.username,
        total_points,
        predictions_count: predictions.length,
        exact_scores_count: exact_scores,
      }
    })
    .sort((a, b) => b.total_points - a.total_points)
    .map((entry, i) => ({ ...entry, rank: i + 1 }))
}

// Session
export function getSession() {
  return getItem('session')
}

export function setSession(session) {
  setItem('session', session)
}

export function clearSession() {
  removeItem('session')
}

// Last sync tracking
export function getLastFixtureSync() {
  return getItem('last-fixture-sync')
}

export function setLastFixtureSync(date) {
  setItem('last-fixture-sync', date)
}
