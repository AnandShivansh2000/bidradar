# BidRadar

BidRadar is an AI-powered government contract radar for small businesses that aggregates opportunities from SAM.gov, Cal eProcure, and TX SmartBuy into a single unified feed. It applies a multi-dimensional relevance scoring engine against your company profile so you never miss a bid that matters.

## Architecture

```
FastAPI (Python 3.12) ──► MongoDB 7
       │
       ├── TinyFish Web Agents (SAM.gov, Cal eProcure, TX SmartBuy)
       ├── Relevance Engine (NAICS, certs, value, geo, keywords)
       └── AgentMail Notifications (daily digest + deadline alerts)

Next.js 14 (TypeScript) ──► FastAPI REST API
```

## PRD Feature Coverage

| Feature                        | Status |
|-------------------------------|--------|
| Aggregate from 3 portals       | ✅     |
| User profile filters           | ✅     |
| Relevance scoring engine       | ✅     |
| Live scan view                 | ✅     |
| Daily email digest             | ✅     |
| Deadline alerts                | ✅     |
| Portal status page             | ✅     |
| Demo replay mode               | ✅     |

## Prerequisites

- Python 3.12+
- Node 20+
- MongoDB 7
- Docker (optional, for containerized setup)

## Local Setup

### Backend

```bash
cd backend
cp .env.example .env          # fill in your keys
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
npm install
npm run dev
```

Frontend runs at http://localhost:3000, backend at http://localhost:8000.

## Docker Setup

```bash
cp backend/.env.example backend/.env   # fill in TINYFISH_API_KEY and AGENTMAIL_API_KEY
docker-compose up --build
```

| Service  | Port  |
|----------|-------|
| Frontend | 3000  |
| Backend  | 8000  |
| MongoDB  | 27017 |

## Running Tests

```bash
cd backend && pytest tests/ -v -m "not integration"
pytest tests/ -v -m integration   # needs TINYFISH_API_KEY
make test
```

## Environment Variables

| Variable              | Description                                      |
|-----------------------|--------------------------------------------------|
| `MONGODB_URI`         | MongoDB connection string                        |
| `MONGODB_DB`          | Database name (default: `bidradar`)              |
| `TINYFISH_API_KEY`    | TinyFish Web Agent API key                       |
| `TINYFISH_API_URL`    | TinyFish API base URL                            |
| `AGENTMAIL_API_KEY`   | AgentMail API key for sending emails             |
| `AGENTMAIL_INBOX`     | AgentMail inbox name (default: `bidradar`)       |
| `NEXT_PUBLIC_API_URL` | Backend API URL for the frontend                 |

## API Endpoints

| Endpoint                    | Description                         |
|-----------------------------|-------------------------------------|
| `GET /api/v1/health`        | Health check                        |
| `GET /api/v1/scans`         | List and trigger portal scans       |
| `GET /api/v1/opportunities` | Browse and filter opportunities     |
| `GET /api/v1/portals`       | Portal health status                |
| `GET/PUT /api/v1/profile`   | User profile and notification prefs |
| `GET /api/v1/notifications` | Notification log                    |

## Project Structure

```
bidradar/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── database.py          # MongoDB connection
│   │   ├── scheduler.py         # APScheduler jobs
│   │   ├── agents/              # TinyFish portal agents
│   │   │   ├── sam_gov_agent.py
│   │   │   ├── cal_eprocure_agent.py
│   │   │   ├── tx_smartbuy_agent.py
│   │   │   └── normalizers/     # Per-portal data normalizers
│   │   ├── models/              # Pydantic models
│   │   ├── routers/             # FastAPI route handlers
│   │   └── services/
│   │       ├── relevance_engine.py
│   │       ├── notification_service.py
│   │       └── portal_health.py
│   ├── tests/
│   │   ├── test_normalizers.py
│   │   ├── test_relevance_engine.py
│   │   ├── test_sam_gov_normalizer.py
│   │   ├── test_portal_health.py
│   │   ├── test_notification_service.py
│   │   └── integration/
│   │       └── test_sam_gov_agent.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/                     # Next.js 14 App Router pages
│   ├── components/              # Reusable UI components
│   ├── lib/                     # API client, types, utils
│   ├── Dockerfile
│   └── next.config.mjs
├── docker-compose.yml
└── README.md
```
