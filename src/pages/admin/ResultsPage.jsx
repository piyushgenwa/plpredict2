import { useState, useEffect } from 'react'
import {
  getAllMatches,
  saveMatch,
  getAllPredictionsForMatch,
  getUserById,
} from '../../utils/storage.js'
import { fetchAndSaveResult, recalcPointsForMatch } from '../../utils/apiFootball.js'

function formatKickoff(dt) {
  return new Date(dt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

function ManualScoreForm({ match, onSaved }) {
  const [home, setHome] = useState(match.home_score ?? '')
  const [away, setAway] = useState(match.away_score ?? '')
  const [saving, setSaving] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const updated = {
      ...match,
      home_score: parseInt(home),
      away_score: parseInt(away),
      is_completed: true,
      api_status: 'FT',
    }
    saveMatch(updated)
    recalcPointsForMatch(updated)
    setSaving(false)
    onSaved(updated)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
      <input
        type="number" min="0" max="20" required
        value={home}
        onChange={e => setHome(e.target.value)}
        className="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center text-sm focus:outline-none focus:border-purple-500"
      />
      <span className="text-gray-400">–</span>
      <input
        type="number" min="0" max="20" required
        value={away}
        onChange={e => setAway(e.target.value)}
        className="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center text-sm focus:outline-none focus:border-purple-500"
      />
      <button
        type="submit"
        disabled={saving}
        className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded transition-colors"
      >
        Save
      </button>
    </form>
  )
}

function MatchRow({ match: initialMatch, onUpdate }) {
  const [match, setMatch] = useState(initialMatch)
  const [fetching, setFetching] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [showPredictions, setShowPredictions] = useState(false)
  const [predictions, setPredictions] = useState([])
  const [fetchError, setFetchError] = useState('')

  async function handleFetch() {
    setFetching(true)
    setFetchError('')
    try {
      const updated = await fetchAndSaveResult(match)
      if (updated) {
        setMatch(updated)
        onUpdate(updated)
      } else {
        setFetchError('Match not finished yet (status not FT/AET/PEN)')
      }
    } catch (err) {
      setFetchError(err.message)
    } finally {
      setFetching(false)
    }
  }

  function handleManualSaved(updated) {
    setMatch(updated)
    setShowManual(false)
    onUpdate(updated)
  }

  function togglePredictions() {
    if (!showPredictions) {
      setPredictions(getAllPredictionsForMatch(match.id)
        .map(p => ({ ...p, user: getUserById(p.user_id) }))
        .sort((a, b) => (b.points_earned || 0) - (a.points_earned || 0))
      )
    }
    setShowPredictions(v => !v)
  }

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-white font-semibold">{match.home_team} vs {match.away_team}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatKickoff(match.kickoff_time)} · MD {match.matchday || '?'}
          </p>
          {match.is_completed && (
            <p className="text-sm text-green-400 font-medium mt-1">
              Result: {match.home_score}–{match.away_score}
            </p>
          )}
          {fetchError && (
            <p className="text-xs text-red-400 mt-1">{fetchError}</p>
          )}
          {showManual && !match.is_completed && (
            <ManualScoreForm match={match} onSaved={handleManualSaved} />
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {!match.is_completed && match.api_fixture_id && (
            <button
              onClick={handleFetch}
              disabled={fetching}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white text-xs rounded-lg transition-colors"
            >
              {fetching ? 'Fetching...' : 'Fetch Result'}
            </button>
          )}
          {!match.is_completed && (
            <button
              onClick={() => setShowManual(v => !v)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors"
            >
              {showManual ? 'Cancel' : 'Enter Manually'}
            </button>
          )}
          {match.is_completed && (
            <button
              onClick={() => setShowManual(v => !v)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors"
            >
              Override Score
            </button>
          )}
          {match.is_completed && showManual && (
            <ManualScoreForm match={match} onSaved={handleManualSaved} />
          )}
        </div>
      </div>

      <button
        onClick={togglePredictions}
        className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        {showPredictions ? 'Hide' : 'View'} predictions
      </button>

      {showPredictions && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          {predictions.length === 0 ? (
            <p className="text-xs text-gray-600">No predictions for this match</p>
          ) : (
            <div className="space-y-1">
              {predictions.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{p.user?.username || 'Unknown'}</span>
                  <span className="text-gray-300">{p.home_score_prediction}–{p.away_score_prediction}</span>
                  <span className={`font-medium ${p.points_earned !== null ? 'text-purple-400' : 'text-gray-600'}`}>
                    {p.points_earned !== null ? `${p.points_earned} pts` : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ResultsPage() {
  const [matches, setMatches] = useState([])
  const [fetchingAll, setFetchingAll] = useState(false)
  const [tab, setTab] = useState('pending')

  function reload() {
    const now = Date.now()
    const all = getAllMatches().sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
    setMatches(all)
  }

  useEffect(() => { reload() }, [])

  const now = Date.now()
  const pending = matches.filter(m => {
    if (m.is_completed) return false
    const kickoff = new Date(m.kickoff_time).getTime()
    return kickoff + 120 * 60 * 1000 <= now
  })
  const completed = matches.filter(m => m.is_completed)
    .sort((a, b) => new Date(b.kickoff_time) - new Date(a.kickoff_time))

  const displayed = tab === 'pending' ? pending : completed

  async function handleFetchAll() {
    setFetchingAll(true)
    for (const match of pending) {
      try { await fetchAndSaveResult(match) } catch { /* continue */ }
    }
    reload()
    setFetchingAll(false)
  }

  function handleUpdate() {
    reload()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Results Management</h1>
        {tab === 'pending' && pending.length > 0 && (
          <button
            onClick={handleFetchAll}
            disabled={fetchingAll}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {fetchingAll ? 'Fetching...' : `Fetch All (${pending.length})`}
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'completed' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Completed ({completed.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          {tab === 'pending' ? 'No matches pending results.' : 'No completed matches yet.'}
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map(match => (
            <MatchRow key={match.id} match={match} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
