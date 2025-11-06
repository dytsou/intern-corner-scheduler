# Round-table Scheduler (CP-SAT)

Python CLI and web interface using OR-Tools CP-SAT to generate round-table seating across rounds with fixed hosts, balanced tables, and pair-wise constraints.

## Input (stdin)
- Line 1: `a b c`
- Line 2: `d` (number of same-once pairs)
- Next `d` lines: `e_i f_i`
- Next line: `x` (number of never-together pairs)
- Next `x` lines: `y_i z_i`

Interpretation:
- `a`: participants 1..a
- `b`: tables 1..b; participants 1..b are hosts, fixed at their table number each round
- `c`: number of rounds
- Same-once pairs: each pair should be seated together in exactly one round if possible
- Never-together pairs: must never be seated together

## Output (stdout)
JSON with fields:
- `participants`, `tables`, `rounds`
- `table_sizes`: balanced per table
- `assignments`: list per round, each a list per table of participant IDs
- `satisfied_same_once_pairs`, `unsatisfied_same_once_pairs`
- `never_together_violations` (should be empty)
- `objective_value`, `solver_status`

## Install
```bash
make install
```

## Run
Pipe input into the program:
```bash
# example
cat <<EOF | make run
6 2 3
1
3 5
1
4 6
EOF
```

Or directly:
```bash
cd python && python3 main.py < input.txt
```

## Web Interface

A modern web interface is available for easier use. The frontend is deployed to GitHub Pages, and the backend runs in Docker on an Ubuntu workstation.

### Quick Start (Local Development)

1. **Install dependencies:**
   ```bash
   make install
   ```

2. **Configure environment variables (optional):**
   ```bash
   cp .env.example .env
   # Edit .env with your settings if needed
   ```

3. **Start the backend server:**
   ```bash
   make serve
   ```
   The API will be available at `http://localhost:8000` (or the port specified in `.env`)

4. **Open the frontend:**
   - Open `docs/index.html` in your browser
   - Or serve it with a simple HTTP server:
     ```bash
     cd docs && python3 -m http.server 3000
     ```
   - Then visit `http://localhost:3000`

5. **Update backend URL (if needed):**
   - Edit `docs/config.js` and set `BACKEND_URL` to your backend address

### Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions:
- Frontend: GitHub Pages
- Backend: Docker on Ubuntu workstation

## API Documentation

The FastAPI backend provides a REST API for scheduling. When the server is running, interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### API Endpoint

**POST `/api/schedule`**

Generate a schedule based on constraints.

**Request Body:**
```json
{
  "participants": 6,
  "tables": 2,
  "rounds": 3,
  "same_once_pairs": [
    {"u": 3, "v": 5}
  ],
  "never_together_pairs": [
    {"u": 4, "v": 6}
  ],
  "time_limit_seconds": 60
}
```

**Response:**
```json
{
  "participants": 6,
  "tables": 2,
  "rounds": 3,
  "table_sizes": [3, 3],
  "table_sizes_per_round": [[3, 3], [3, 3], [3, 3]],
  "assignments": [
    [[1, 3, 5], [2, 4, 6]],
    [[1, 4, 5], [2, 3, 6]],
    [[1, 3, 6], [2, 4, 5]]
  ],
  "satisfied_same_once_pairs": [[3, 5]],
  "unsatisfied_same_once_pairs": [],
  "never_together_violations": [],
  "objective_value": 1005,
  "solver_status": "OPTIMAL"
}
```

### Health Check

**GET `/health`**

Returns the health status of the API.

**Response:**
```json
{
  "status": "healthy"
}
```

## Modeling Notes
- Hosts (1..b) are fixed to their own table every round.
- Tables are balanced: first `a % b` tables have size `a//b + 1`, others `a//b`.
- Non-hosts do not sit at the same table in consecutive rounds.
- Objective maximizes how many same-once pairs are met exactly once; never-together is enforced strictly.


