import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { getUserPredictions, getMatchById } from '../utils/db.js'
import { describePoints } from '../utils/scoring.js'

export default function PredictionsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const preds = await getUserPredictions(user.id)
      const enriched = (
        await Promise.all(preds.map(async p => ({ prediction: p, match: await getMatchById(p.match_id) })))
      )
        .filter(({ match }) => match)
        .sort((a, b) => new Date(b.match.kickoff_time) - new Date(a.match.kickoff_time))
      setItems(enriched)
      setLoading(false)
    }
    load()
  }, [user.id])

  const totalPoints = items.reduce((sum, { prediction: p }) => sum + (p.points_earned || 0), 0)
  const exactCount = items.filter(({ prediction: p }) => p.points_earned === 10).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">My Predictions</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold text-purple-400">{totalPoints}</p>
          <p className="text-xs text-gray-400 mt-1">Total Points</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold text-white">{items.filter(({ match: m }) => m.is_completed).length}</p>
          <p className="text-xs text-gray-400 mt-1">Predictions</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold text-yellow-400">{exactCount}</p>
          <p className="text-xs text-gray-400 mt-1">Exact Scores</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>No predictions yet. Go to Matches to start predicting!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(({ prediction: p, match: m }) => {
            const kickoff = new Date(m.kickoff_time)
            return (
              <div key={p.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {m.home_team} vs {m.away_team}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {kickoff.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}{m.round}
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      Your pick:{' '}
                      <span className="text-white font-medium">
                        {p.home_score_prediction} – {p.away_score_prediction}
                      </span>
                    </p>
                    {m.is_completed && (
                      <p className="text-sm text-gray-400">
                        Result:{' '}
                        <span className="text-white font-medium">
                          {m.home_score} – {m.away_score}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {m.is_completed && p.points_earned !== null ? (
                      <>
                        <p className="text-xl font-bold text-purple-400">{p.points_earned} pts</p>
                        <p className="text-xs text-gray-500 mt-1 max-w-32">
                          {describePoints(
                            { home: p.home_score_prediction, away: p.away_score_prediction },
                            { home: m.home_score, away: m.away_score }
                          )}
                        </p>
                      </>
                    ) : m.is_completed ? (
                      <span className="text-xs text-gray-500">Pending</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-blue-900/40 text-blue-400 text-xs font-medium">Upcoming</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
