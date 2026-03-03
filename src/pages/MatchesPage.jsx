import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { getAllMatches, getPrediction, savePrediction } from '../utils/db.js'
import { describePoints } from '../utils/scoring.js'

function TeamLogo({ src, name, size = 'md' }) {
  const s = size === 'sm' ? 'w-6 h-6' : 'w-10 h-10'
  if (!src) return <div className={`${s} rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400`}>{name?.[0]}</div>
  return <img src={src} alt={name} className={`${s} object-contain`} onError={e => { e.target.style.display = 'none' }} />
}

function PredictionForm({ match, userId, existing, onSaved }) {
  const [home, setHome] = useState(existing?.home_score_prediction ?? '')
  const [away, setAway] = useState(existing?.away_score_prediction ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const pred = {
      id: existing?.id || crypto.randomUUID(),
      user_id: userId,
      match_id: match.id,
      matchday: match.matchday ?? null,
      home_score_prediction: parseInt(home),
      away_score_prediction: parseInt(away),
      points_earned: existing?.points_earned ?? null,
      submitted_at: new Date().toISOString(),
    }
    await savePrediction(pred)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 2000)
    if (onSaved) onSaved(pred)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-gray-700">
      <p className="text-xs text-gray-400 mb-2">Your prediction</p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{match.home_team.split(' ').pop()}</span>
          <input
            type="number"
            min="0"
            max="20"
            required
            value={home}
            onChange={e => setHome(e.target.value)}
            className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
        <span className="text-gray-500">–</span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="20"
            required
            value={away}
            onChange={e => setAway(e.target.value)}
            className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center text-sm focus:outline-none focus:border-purple-500"
          />
          <span className="text-xs text-gray-400">{match.away_team.split(' ').pop()}</span>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="ml-auto px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors disabled:opacity-60"
        >
          {saved ? 'Saved!' : existing ? 'Update' : 'Predict'}
        </button>
      </div>
    </form>
  )
}

function MatchCard({ match, userId }) {
  const now = new Date()
  const kickoff = new Date(match.kickoff_time)
  const isPast = match.is_completed
  const [prediction, setPrediction] = useState(null)

  useEffect(() => {
    getPrediction(userId, match.id).then(setPrediction)
  }, [userId, match.id])

  const kickoffStr = kickoff.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{match.round}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isPast ? 'bg-green-900/50 text-green-400' :
          kickoff <= now ? 'bg-yellow-900/50 text-yellow-400' :
          'bg-gray-800 text-gray-400'
        }`}>
          {isPast ? 'Finished' : kickoff <= now ? 'In progress' : kickoffStr}
        </span>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3 flex-1">
          <TeamLogo src={match.home_team_logo} name={match.home_team} />
          <span className="font-semibold text-white">{match.home_team}</span>
        </div>

        <div className="px-4 text-center">
          {isPast ? (
            <span className="text-2xl font-bold text-white">
              {match.home_score} – {match.away_score}
            </span>
          ) : (
            <span className="text-gray-500 font-medium">vs</span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end">
          <span className="font-semibold text-white">{match.away_team}</span>
          <TeamLogo src={match.away_team_logo} name={match.away_team} />
        </div>
      </div>

      {isPast && prediction && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Your prediction: <span className="text-white font-medium">
                {prediction.home_score_prediction} – {prediction.away_score_prediction}
              </span>
            </span>
            {prediction.points_earned !== null ? (
              <div className="text-right">
                <span className="text-lg font-bold text-purple-400">{prediction.points_earned} pts</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {describePoints(
                    { home: prediction.home_score_prediction, away: prediction.away_score_prediction },
                    { home: match.home_score, away: match.away_score }
                  )}
                </p>
              </div>
            ) : (
              <span className="text-xs text-gray-500">Points pending</span>
            )}
          </div>
        </div>
      )}

      {isPast && !prediction && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <span className="text-sm text-gray-500 italic">No prediction submitted</span>
        </div>
      )}

      {!isPast && kickoff > now && (
        <PredictionForm match={match} userId={userId} existing={prediction} onSaved={setPrediction} />
      )}

      {!isPast && kickoff <= now && prediction && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <span className="text-sm text-gray-400">
            Prediction locked: <span className="text-white font-medium">
              {prediction.home_score_prediction} – {prediction.away_score_prediction}
            </span>
          </span>
        </div>
      )}

      {!isPast && kickoff <= now && !prediction && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <span className="text-sm text-gray-500 italic">Prediction window closed</span>
        </div>
      )}
    </div>
  )
}

export default function MatchesPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('upcoming')
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllMatches().then(data => {
      setMatches(data)
      setLoading(false)
    })
  }, [])

  const now = new Date()
  const upcoming = matches
    .filter(m => !m.is_completed && new Date(m.kickoff_time) > now)
    .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
  const past = matches
    .filter(m => m.is_completed || new Date(m.kickoff_time) <= now)
    .sort((a, b) => new Date(b.kickoff_time) - new Date(a.kickoff_time))

  const displayed = tab === 'upcoming' ? upcoming : past

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Matches</h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('upcoming')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'upcoming' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          onClick={() => setTab('past')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'past' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Past ({past.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading matches...</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No {tab} matches</p>
          <p className="text-sm mt-2">
            {tab === 'upcoming' ? 'Check back later or ask an admin to sync fixtures.' : 'No past matches yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map(match => (
            <MatchCard key={match.id} match={match} userId={user.id} />
          ))}
        </div>
      )}
    </div>
  )
}
