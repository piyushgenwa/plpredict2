import { supabase } from './supabase.js'

// ── Users / Profiles ──────────────────────────────────────────────────────────

export async function saveUser(user) {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      username: user.username,
      is_admin: user.is_admin ?? false,
    })
  if (error) throw error
}

export async function getUserById(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

export async function getUserByEmail(email) {
  // Email lives in auth.users only; this is used by AuthContext which now uses
  // Supabase Auth directly. Kept as a no-op stub for compatibility.
  return null
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

// ── Matches ───────────────────────────────────────────────────────────────────

export async function saveMatch(match) {
  const payload = {
    id: match.id,
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
  }
  const { error } = await supabase.from('matches').upsert(payload)
  if (error) throw error
}

export async function getMatchById(matchId) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()
  if (error) return null
  return data
}

export async function getMatchByApiId(apiFixtureId) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('api_fixture_id', apiFixtureId)
    .single()
  if (error) return null
  return data
}

export async function getAllMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('kickoff_time', { ascending: true })
  if (error) throw error
  return data || []
}

export async function deleteMatch(matchId) {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId)
  if (error) throw error
}

// ── Predictions ───────────────────────────────────────────────────────────────

export async function savePrediction(prediction) {
  const payload = {
    id: prediction.id,
    user_id: prediction.user_id,
    match_id: prediction.match_id,
    home_score_prediction: prediction.home_score_prediction,
    away_score_prediction: prediction.away_score_prediction,
    points_earned: prediction.points_earned ?? null,
    submitted_at: prediction.submitted_at ?? new Date().toISOString(),
  }
  const { error } = await supabase.from('predictions').upsert(payload)
  if (error) throw error
}

export async function getPrediction(userId, matchId) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
    .eq('match_id', matchId)
    .single()
  if (error) return null
  return data
}

export async function getAllPredictionsForMatch(matchId) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('match_id', matchId)
  if (error) throw error
  return data || []
}

export async function getUserPredictions(userId) {
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data || []
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboard(matchday = null) {
  // Fetch profiles and predictions (with match data for matchday filtering)
  let predQuery = supabase
    .from('predictions')
    .select('user_id, points_earned, matches(matchday)')

  if (matchday !== null) {
    predQuery = predQuery.eq('matches.matchday', matchday)
  }

  const [profilesRes, predsRes] = await Promise.all([
    supabase.from('profiles').select('id, username'),
    predQuery,
  ])

  if (profilesRes.error) throw profilesRes.error
  if (predsRes.error) throw predsRes.error

  const profiles = profilesRes.data || []
  let preds = predsRes.data || []

  // When filtering by matchday, the join returns all rows but non-matching
  // matches will have matches=null — filter those out.
  if (matchday !== null) {
    preds = preds.filter(p => p.matches !== null)
  }

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
  const { error } = await supabase.from('api_logs').insert({
    endpoint,
    request_params: params,
    response_status: status,
    response_body: body,
  })
  // Silently ignore log failures — don't break callers
  if (error) console.warn('logApiCall error:', error.message)
}

// ── Settings (last fixture sync) ──────────────────────────────────────────────

export async function getLastFixtureSync() {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'last_fixture_sync')
    .single()
  if (error || !data) return null
  return data.value
}

export async function setLastFixtureSync(date) {
  const { error } = await supabase
    .from('settings')
    .update({ value: date })
    .eq('key', 'last_fixture_sync')
  if (error) throw error
}
