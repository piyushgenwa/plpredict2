export default async function handler(req, res) {
  const { dateFrom, dateTo, status } = req.query

  const url = new URL('https://api.football-data.org/v4/competitions/PL/matches')
  if (dateFrom) url.searchParams.set('dateFrom', dateFrom)
  if (dateTo) url.searchParams.set('dateTo', dateTo)
  if (status) url.searchParams.set('status', status)

  try {
    const response = await fetch(url.toString(), {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY || '' },
    })
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
