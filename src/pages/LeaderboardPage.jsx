import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getLeaderboard, getAllMatches } from '../utils/db.js'
import { useAuth } from '../context/AuthContext.jsx'

function getMedal(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [matchday, setMatchday] = useState('')
  const [entries, setEntries] = useState([])
  const [matchdays, setMatchdays] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllMatches().then(matches => {
      const days = [...new Set(matches.map(m => m.matchday).filter(Boolean))].sort((a, b) => a - b)
      setMatchdays(days)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    getLeaderboard(matchday ? parseInt(matchday) : null).then(data => {
      setEntries(data)
      setLoading(false)
    })
  }, [matchday])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <select
          value={matchday}
          onChange={e => setMatchday(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
        >
          <option value="">Overall</option>
          {matchdays.map(d => (
            <option key={d} value={d}>Matchday {d}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>No data yet. Start predicting!</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide w-12">#</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Player</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide text-right">Points</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide text-right hidden sm:table-cell">Predictions</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide text-right hidden sm:table-cell">Exact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {entries.map(entry => {
                const isMe = entry.user_id === user?.id
                const medal = getMedal(entry.rank)
                return (
                  <tr
                    key={entry.user_id}
                    className={`${isMe ? 'bg-purple-900/20' : 'hover:bg-gray-800/50'} transition-colors`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {medal ? <span>{medal}</span> : entry.rank}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/profile/${entry.user_id}`}
                        className={`text-sm font-medium hover:text-purple-400 transition-colors ${isMe ? 'text-purple-300' : 'text-white'}`}
                      >
                        {entry.username}
                        {isMe && <span className="ml-2 text-xs text-purple-500">(you)</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold text-white">{entry.total_points}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400 hidden sm:table-cell">
                      {entry.predictions_count}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-400 hidden sm:table-cell">
                      {entry.exact_scores_count}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
