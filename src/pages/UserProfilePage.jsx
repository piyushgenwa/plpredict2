import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getUserById, getUserPredictions, getMatchById } from '../utils/storage.js'
import { describePoints } from '../utils/scoring.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function UserProfilePage() {
  const { userId } = useParams()
  const { user: currentUser } = useAuth()
  const [profileUser, setProfileUser] = useState(null)
  const [items, setItems] = useState([])

  useEffect(() => {
    const u = getUserById(userId)
    setProfileUser(u)
    if (u) {
      const preds = getUserPredictions(userId)
      const enriched = preds
        .map(p => ({ prediction: p, match: getMatchById(p.match_id) }))
        .filter(({ match }) => match && match.is_completed)
        .sort((a, b) => new Date(b.match.kickoff_time) - new Date(a.match.kickoff_time))
      setItems(enriched)
    }
  }, [userId])

  if (!profileUser) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center text-gray-500">
        User not found. <Link to="/leaderboard" className="text-purple-400 hover:underline">Back to leaderboard</Link>
      </div>
    )
  }

  const totalPoints = items.reduce((sum, { prediction: p }) => sum + (p.points_earned || 0), 0)
  const exactCount = items.filter(({ prediction: p }) => p.points_earned === 10).length
  const isMe = currentUser?.id === userId

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center text-xl font-bold text-white">
          {profileUser.username[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {profileUser.username}
            {isMe && <span className="ml-2 text-sm text-purple-400">(you)</span>}
          </h1>
          <p className="text-sm text-gray-400">Joined {new Date(profileUser.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold text-purple-400">{totalPoints}</p>
          <p className="text-xs text-gray-400 mt-1">Total Points</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold text-white">{items.length}</p>
          <p className="text-xs text-gray-400 mt-1">Predictions</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-center">
          <p className="text-2xl font-bold text-yellow-400">{exactCount}</p>
          <p className="text-xs text-gray-400 mt-1">Exact Scores</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white mb-4">Prediction History</h2>
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">No completed predictions yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map(({ prediction: p, match: m }) => (
            <div key={p.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">{m.home_team} vs {m.away_team}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Result: {m.home_score}–{m.away_score} · Predicted: {p.home_score_prediction}–{p.away_score_prediction}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {describePoints(
                    { home: p.home_score_prediction, away: p.away_score_prediction },
                    { home: m.home_score, away: m.away_score }
                  )}
                </p>
              </div>
              <span className="text-lg font-bold text-purple-400 shrink-0">{p.points_earned} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
