# Football Score Prediction Game - Context Document

## Project Overview
A web-based football score prediction game where users submit predictions for upcoming Premier League matches (for specific teams) and compete on a leaderboard. Match data is automatically fetched from API-Football, and admins can trigger result updates.

## Core Features

### User Features
1. **Authentication**
   - Email/password registration
   - Email/password login
   - Session management

2. **Match Predictions**
   - View list of upcoming matches (predictions open)
   - View list of past matches with results (predictions closed)
   - Submit score predictions (home score, away score)
   - Edit predictions before match kickoff
   - View own prediction history

3. **Leaderboard**
   - Real-time overall standings
   - Points breakdown per user
   - Matchday-specific leaderboard view
   - User profile showing prediction accuracy stats

### Admin Features
1. **Access Control**
   - Admin role assignment
   - Admin-only routes and views

2. **Match Management (API-Powered)**
   - Automatic daily fetch of Premier League fixtures at 11:59 PM
   - Filter matches for: Liverpool, Manchester City, Manchester United, Tottenham, Arsenal, Chelsea
   - View fetched matches before they go live
   - Manual trigger for fixture sync
   - Delete/hide unwanted matches

3. **Results Entry (API-Powered)**
   - Automatic result fetch 120 minutes after kickoff time
   - Manual trigger for result updates
   - Calculate and update points for all users
   - Refresh/recalculate leaderboard
   - View all predictions for a specific match

## API-Football Integration

### API Configuration
- **Base URL**: `https://v3.football.api-sports.io`
- **Headers Required**: 
  - `x-rapidapi-key`: Your API key
  - `x-rapidapi-host`: `v3.football.api-sports.io`
- **Premier League ID**: `39`
- **Current Season**: `2025` (update annually)

### Team IDs
- Liverpool: `40`
- Manchester City: `50`
- Manchester United: `33`
- Tottenham: `47`
- Arsenal: `42`
- Chelsea: `49`

### Fixtures Endpoint
**Endpoint**: `/fixtures`

**Daily Fetch (11:59 PM)**
- Query parameters:
  - `league=39` (Premier League)
  - `season=2025`
  - `team={team_id}` (run 6 separate calls for each team, or use multiple team IDs)
  - `from={today}` (YYYY-MM-DD format)
  - `to={today+30}` (fetch next 30 days)

**Example Call**:
```
GET https://v3.football.api-sports.io/fixtures?league=39&season=2025&team=40&from=2025-03-02&to=2025-04-01
```

**Response Structure**:
```json
{
  "response": [
    {
      "fixture": {
        "id": 1234567,
        "date": "2025-03-08T15:00:00+00:00",
        "timestamp": 1709906400,
        "status": {
          "short": "NS",
          "long": "Not Started"
        }
      },
      "league": {
        "id": 39,
        "name": "Premier League",
        "round": "Regular Season - 28"
      },
      "teams": {
        "home": {
          "id": 40,
          "name": "Liverpool",
          "logo": "https://..."
        },
        "away": {
          "id": 50,
          "name": "Manchester City",
          "logo": "https://..."
        }
      },
      "goals": {
        "home": null,
        "away": null
      },
      "score": {
        "halftime": { "home": null, "away": null },
        "fulltime": { "home": null, "away": null }
      }
    }
  ]
}
```

### Results Fetch (120 mins after kickoff)
**Query parameters**:
- `id={fixture_id}` (specific match)

**Status codes to check**:
- `FT` - Full Time (final result)
- `AET` - After Extra Time
- `PEN` - Penalties

**Example Call**:
```
GET https://v3.football.api-sports.io/fixtures?id=1234567
```

**Logic**:
1. For each match in database, check if `kickoff_time + 120 minutes <= current_time`
2. If yes and match not yet marked complete, fetch result from API
3. Extract `score.fulltime.home` and `score.fulltime.away`
4. Only process if `status.short` is `FT`, `AET`, or `PEN`
5. Update match record with final scores
6. Trigger point calculation for all predictions

### API Rate Limiting
- Free tier: 100 requests/day
- Consider caching fixture data
- Batch team queries if possible
- Log all API calls for debugging

### Error Handling
- Handle API downtime gracefully
- Store raw API responses for debugging
- Show admin alerts if API calls fail
- Allow manual score entry as fallback

## Scoring Rules

### Points Per Match
- **Exact Score**: 10 points
- **Correct Goal Difference + Correct Outcome**: 7 points
- **Correct Outcome (W/D/L)**: 4 points
- **One Correct Team Score**: +2 points (bonus)
- **Close Call (off by 1 goal per team)**: +1 point per team (bonus)

### Calculation Logic
1. Check exact match first (10 pts, stop)
2. Check goal difference + outcome (7 pts, stop)
3. Check outcome only (4 pts)
4. Add one correct score bonus if applicable (+2 pts)
5. Add close call bonus if applicable (+1 or +2 pts)

### Examples
- Predicted 2-1, Actual 2-1 → 10 pts
- Predicted 3-1, Actual 2-0 → 7 pts (both +2 GD, both wins)
- Predicted 1-1, Actual 2-2 → 5 pts (4 for draw + 1 for each team off by 1)
- Predicted 2-0, Actual 2-3 → 2 pts (one correct score)

## Data Models

### User
- id (uuid, primary key)
- email (string, unique)
- password (hashed string)
- username (string, unique)
- is_admin (boolean, default false)
- created_at (timestamp)

### Match
- id (uuid, primary key)
- api_fixture_id (integer, unique - from API-Football)
- home_team (string)
- away_team (string)
- home_team_logo (string, URL)
- away_team_logo (string, URL)
- kickoff_time (timestamp)
- matchday (integer - extracted from round)
- round (string - e.g., "Regular Season - 28")
- home_score (integer, nullable - null until result entered)
- away_score (integer, nullable)
- is_completed (boolean, default false)
- api_status (string - e.g., "NS", "FT", "LIVE")
- last_api_sync (timestamp)
- created_at (timestamp)

### Prediction
- id (uuid, primary key)
- user_id (foreign key → User)
- match_id (foreign key → Match)
- home_score_prediction (integer)
- away_score_prediction (integer)
- points_earned (integer, nullable - null until match completed)
- submitted_at (timestamp)
- **Unique constraint**: (user_id, match_id)

### APILog (for debugging)
- id (uuid, primary key)
- endpoint (string)
- request_params (json)
- response_status (integer)
- response_body (json)
- created_at (timestamp)

### Leaderboard (derived/calculated view)
- user_id
- username
- total_points (sum of points_earned)
- predictions_count
- exact_scores_count
- rank

## User Flows

### User Registration & Login
1. User visits app
2. Clicks "Sign Up" or "Login"
3. Enters email/password
4. On success → redirect to matches view
5. Session persists across visits

### Submitting Predictions
1. User sees list of upcoming matches (kickoff_time > now)
2. User clicks on a match
3. User enters home score and away score
4. User submits prediction
5. Prediction saved (or updated if already exists)
6. Success message shown

### Viewing Leaderboard
1. User navigates to leaderboard
2. Sees ranked list of all users with total points
3. Can filter by matchday or view overall standings
4. Can click username to see detailed prediction history

### Admin: Syncing Fixtures (Automatic)
**Daily Job (11:59 PM)**:
1. Backend triggers API call for each team
2. Fetches fixtures for next 30 days
3. For each fixture:
   - Check if `api_fixture_id` already exists
   - If new, create match record
   - If exists, update kickoff_time/status if changed
4. Extract matchday from `round` field
5. Log all API calls
6. Send admin notification if errors occur

### Admin: Syncing Fixtures (Manual)
1. Admin navigates to admin panel
2. Clicks "Sync Fixtures" button
3. System runs the same daily job logic
4. Shows success/error message
5. Displays newly added matches

### Admin: Fetching Results (Automatic)
**Periodic Job (every 10 minutes)**:
1. Query all matches where:
   - `is_completed = false`
   - `kickoff_time + 120 minutes <= now`
2. For each match, call API with `id={api_fixture_id}`
3. Check if `status.short` is `FT`, `AET`, or `PEN`
4. If yes:
   - Extract `score.fulltime.home` and `away`
   - Update match record
   - Set `is_completed = true`
   - Trigger point calculation
   - Update leaderboard

### Admin: Fetching Results (Manual)
1. Admin navigates to "Pending Results"
2. Sees matches that should have finished
3. Clicks "Fetch Results" button
4. System runs result sync for selected matches
5. Points auto-calculated
6. Leaderboard refreshes

### Admin: Manual Score Entry (Fallback)
1. Admin navigates to specific match
2. Clicks "Enter Score Manually"
3. Enters home and away scores
4. Confirms entry
5. System bypasses API and uses manual scores
6. Points calculated and leaderboard updated

## Technical Requirements

### Frontend
- React (with functional components and hooks)
- React Router for navigation
- Form handling (controlled inputs)
- Auth state management
- Responsive design (mobile-friendly)

### Backend/Data
- Use persistent storage API (window.storage)
- Shared storage for: matches, predictions, users
- Key patterns:
  - `user:{user_id}` → user object
  - `match:{match_id}` → match object
  - `match-api:{api_fixture_id}` → match_id (index for lookups)
  - `prediction:{user_id}:{match_id}` → prediction object
  - `email-index:{email}` → user_id
  - `username-index:{username}` → user_id
  - `api-log:{timestamp}` → API log entry

### Authentication
- Password hashing (use crypto API)
- Session storage (localStorage for user session)
- Protected routes for admin features

### Styling
- Tailwind CSS utility classes only
- Clean, modern UI
- Clear visual hierarchy
- Accessible forms and buttons
- Team logos displayed from API

### Scheduled Jobs (Browser-based)
Since this is a client-side app:
1. **Daily Fixture Sync**: Trigger on first admin login after 11:59 PM
2. **Result Sync**: Trigger on page load if any matches due for result check
3. Alternative: Admin manually triggers both operations

## Key Business Rules

1. **Prediction Deadline**: Predictions locked when match kickoff_time passes
2. **Point Calculation**: Only triggered when result is fetched/entered
3. **Admin Rights**: Only admins can sync fixtures and fetch results
4. **One Prediction Per Match**: Users can update but not duplicate
5. **Leaderboard Updates**: Real-time after results entry
6. **API Fixture Priority**: Always use API fixture ID as source of truth
7. **Manual Override**: Manual scores override API scores if needed
8. **Duplicate Prevention**: Check `api_fixture_id` before creating matches

## Implementation Priority

### Phase 1: Core Features
1. User authentication
2. Match listing (manual entry for testing)
3. Prediction submission
4. Scoring algorithm
5. Leaderboard

### Phase 2: API Integration
1. API-Football fixtures endpoint integration
2. Automatic fixture creation
3. Result fetching logic
4. Admin controls for API sync

### Phase 3: Polish
1. Team logos and branding
2. Email notifications
3. Advanced stats
4. Error handling improvements

---

## Environment Variables Needed
```
VITE_API_FOOTBALL_KEY=your_api_key_here
VITE_PREMIER_LEAGUE_ID=39
VITE_CURRENT_SEASON=2025
```

## API Call Examples

### Fetch Liverpool Fixtures
```javascript
const response = await fetch(
  'https://v3.football.api-sports.io/fixtures?league=39&season=2025&team=40&from=2025-03-02&to=2025-04-01',
  {
    headers: {
      'x-rapidapi-key': import.meta.env.VITE_API_FOOTBALL_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io'
    }
  }
);
```

### Fetch Match Result
```javascript
const response = await fetch(
  'https://v3.football.api-sports.io/fixtures?id=1234567',
  {
    headers: {
      'x-rapidapi-key': import.meta.env.VITE_API_FOOTBALL_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io'
    }
  }
);
```