export default async function handler(req, res) {
  const { id } = req.query

  try {
    const response = await fetch(`https://api.football-data.org/v4/matches/${id}`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_KEY || '' },
    })
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
