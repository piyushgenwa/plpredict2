/**
 * Calculate points for a prediction vs actual result.
 * @param {{ home: number, away: number }} predicted
 * @param {{ home: number, away: number }} actual
 * @returns {number}
 */
export function calculatePoints(predicted, actual) {
  const pH = predicted.home
  const pA = predicted.away
  const aH = actual.home
  const aA = actual.away

  // 1. Exact score
  if (pH === aH && pA === aA) return 10

  const predictedGD = pH - pA
  const actualGD = aH - aA
  const predictedOutcome = Math.sign(predictedGD)
  const actualOutcome = Math.sign(actualGD)

  // 2. Correct GD + correct outcome
  if (predictedGD === actualGD && predictedOutcome === actualOutcome) {
    return 7
  }

  let points = 0

  // 3. Correct outcome (W/D/L)
  if (predictedOutcome === actualOutcome) {
    points += 4
  }

  if (points === 0) {
    // No outcome correct - check bonuses on their own
    // One correct score bonus
    if (pH === aH || pA === aA) points += 2
    // Close call bonus (+1 per team off by 1)
    if (Math.abs(pH - aH) === 1) points += 1
    if (Math.abs(pA - aA) === 1) points += 1
    return points
  }

  // 4. One correct score bonus (+2)
  if (pH === aH || pA === aA) points += 2

  // 5. Close call bonus (+1 per team off by 1)
  if (Math.abs(pH - aH) === 1) points += 1
  if (Math.abs(pA - aA) === 1) points += 1

  return points
}

/**
 * Human-readable breakdown of why points were awarded.
 */
export function describePoints(predicted, actual) {
  const pH = predicted.home
  const pA = predicted.away
  const aH = actual.home
  const aA = actual.away

  if (pH === aH && pA === aA) return 'Exact score!'

  const predictedGD = pH - pA
  const actualGD = aH - aA
  const predictedOutcome = Math.sign(predictedGD)
  const actualOutcome = Math.sign(actualGD)

  if (predictedGD === actualGD && predictedOutcome === actualOutcome) {
    return 'Correct goal difference & outcome'
  }

  const parts = []
  if (predictedOutcome === actualOutcome) parts.push('Correct outcome')
  if (pH === aH || pA === aA) parts.push('One correct score')
  if (Math.abs(pH - aH) === 1) parts.push('Home score off by 1')
  if (Math.abs(pA - aA) === 1) parts.push('Away score off by 1')

  return parts.length ? parts.join(' + ') : 'No points'
}
