import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAllMatches, getAllUsers, getLastFixtureSync } from '../../utils/db.js'

export default function AdminPage() {
  const [matches, setMatches] = useState([])
  const [users, setUsers] = useState([])
  const [lastSync, setLastSync] = useState(null)

  useEffect(() => {
    Promise.all([getAllMatches(), getAllUsers(), getLastFixtureSync()]).then(([m, u, sync]) => {
      setMatches(m)
      setUsers(u)
      setLastSync(sync)
    })
  }, [])

  const completedMatches = matches.filter(m => m.is_completed)
  const pendingResults = matches.filter(m => {
    if (m.is_completed) return false
    const kickoff = new Date(m.kickoff_time).getTime()
    return kickoff + 120 * 60 * 1000 <= Date.now()
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-8">Admin Panel</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Matches', value: matches.length },
          { label: 'Completed', value: completedMatches.length },
          { label: 'Pending Results', value: pendingResults.length, alert: pendingResults.length > 0 },
          { label: 'Users', value: users.length },
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl p-4 border text-center ${stat.alert ? 'bg-yellow-900/20 border-yellow-700' : 'bg-gray-900 border-gray-800'}`}>
            <p className={`text-2xl font-bold ${stat.alert ? 'text-yellow-400' : 'text-white'}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/admin/fixtures"
          className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-purple-700 transition-colors group"
        >
          <h2 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">Fixture Management</h2>
          <p className="text-sm text-gray-400 mt-2">Sync fixtures from API-Football, manage match list</p>
          {lastSync && (
            <p className="text-xs text-gray-600 mt-3">
              Last sync: {new Date(lastSync).toLocaleString('en-GB')}
            </p>
          )}
        </Link>

        <Link
          to="/admin/results"
          className={`rounded-xl p-6 border transition-colors group ${
            pendingResults.length > 0
              ? 'bg-yellow-900/10 border-yellow-800 hover:border-yellow-600'
              : 'bg-gray-900 border-gray-800 hover:border-purple-700'
          }`}
        >
          <h2 className={`text-lg font-semibold transition-colors ${pendingResults.length > 0 ? 'text-yellow-400' : 'text-white group-hover:text-purple-400'}`}>
            Results Management
            {pendingResults.length > 0 && (
              <span className="ml-2 text-xs bg-yellow-500 text-gray-900 px-2 py-0.5 rounded-full font-bold">
                {pendingResults.length} pending
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-400 mt-2">Fetch results, manually enter scores, recalculate points</p>
        </Link>
      </div>
    </div>
  )
}
