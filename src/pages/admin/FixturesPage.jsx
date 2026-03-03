import { useState, useEffect } from 'react'
import { getAllMatches, deleteMatch, saveMatch, getLastFixtureSync } from '../../utils/storage.js'
import { syncFixtures } from '../../utils/apiFootball.js'

function formatKickoff(dt) {
  return new Date(dt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export default function FixturesPage() {
  const [matches, setMatches] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  function reload() {
    setMatches(getAllMatches().sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time)))
    setLastSync(getLastFixtureSync())
  }

  useEffect(() => { reload() }, [])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await syncFixtures()
      setSyncResult(result)
      reload()
    } catch (err) {
      setSyncResult({ errors: [err.message] })
    } finally {
      setSyncing(false)
    }
  }

  function handleDelete(matchId) {
    deleteMatch(matchId)
    setDeleteConfirm(null)
    reload()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Fixture Management</h1>
          {lastSync && (
            <p className="text-xs text-gray-500 mt-1">Last sync: {new Date(lastSync).toLocaleString('en-GB')}</p>
          )}
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {syncing ? 'Syncing...' : 'Sync Fixtures'}
        </button>
      </div>

      {syncResult && (
        <div className={`mb-6 p-4 rounded-lg border text-sm ${
          syncResult.errors?.length ? 'bg-red-900/30 border-red-700' : 'bg-green-900/30 border-green-700'
        }`}>
          {syncResult.errors?.length === 0 || !syncResult.errors ? (
            <p className="text-green-400">
              Sync complete: {syncResult.added} added, {syncResult.updated} updated
            </p>
          ) : (
            <>
              <p className="text-yellow-400 mb-1">
                Sync partial: {syncResult.added} added, {syncResult.updated} updated
              </p>
              {syncResult.errors.map((e, i) => (
                <p key={i} className="text-red-400 text-xs">{e}</p>
              ))}
            </>
          )}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No matches. Click "Sync Fixtures" to fetch from API.
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Match</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase">Kickoff</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase text-center">MD</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase text-center">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase text-center">Score</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {matches.map(m => (
                <tr key={m.id} className="hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-white font-medium">
                    {m.home_team} vs {m.away_team}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatKickoff(m.kickoff_time)}</td>
                  <td className="px-4 py-3 text-center text-gray-400">{m.matchday || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      m.is_completed ? 'bg-green-900/50 text-green-400' :
                      m.api_status === 'NS' ? 'bg-gray-800 text-gray-400' :
                      'bg-yellow-900/50 text-yellow-400'
                    }`}>
                      {m.api_status || 'NS'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    {m.is_completed ? `${m.home_score}–${m.away_score}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {deleteConfirm === m.id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-red-400">Confirm?</span>
                        <button onClick={() => handleDelete(m.id)} className="text-xs text-red-400 hover:text-red-300">Yes</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-400 hover:text-gray-300">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(m.id)}
                        className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
