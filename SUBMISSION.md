# BidRadar — TinyFish Hackathon Submission

## X Thread (copy-paste ready)

1/ 🚨 Built something wild for @Tiny_fish hackathon:

BidRadar — AI that monitors every government procurement portal and finds contracts matching YOUR business.

$700B market. 350K registered small businesses. Manual search = 15-20 hrs/week wasted.

Not anymore. 🧵

---

2/ The secret sauce: government portals have NO APIs. Every portal is a different legacy web app.

So we built browser agents (powered by @Tiny_fish) that literally NAVIGATE the sites like a human — SAM.gov, Cal eProcure, Texas SmartBuy.

Live demo 👇
[attach demo video]

---

3/ BidRadar delivers:
🎯 Relevance-scored opportunities (NAICS + certs + value + geography)
🤖 Watch the AI agent scan SAM.gov live
📧 Daily digest email so you never miss an RFP
⚡ 48h deadline alerts for critical bids

$49/mo vs $10K+/yr incumbents.

Built with: @Tiny_fish @MongoDB @vercel
#TinyFishHackathon

---

## HackerEarth Business Case

### Problem
350,000 SAM-registered small businesses manually monitor 50+ procurement portals. Analysts spend 15-20 hours/week. $10K-50K/yr tools (Bloomberg Government, GovWin) price out small businesses from a $700B market.

### Solution
BidRadar — autonomous AI agents powered by TinyFish Web Agent API navigate government procurement portals daily and deliver a relevance-scored intelligence feed.

### Why TinyFish is Essential
No government portal offers a public API. These are legacy web apps requiring real browser navigation — JavaScript forms, session management, pagination. TinyFish is the only viable solution.

### Business Model
- Starter: $49/mo (3 portals)
- Pro: $199/mo (all portals + Slack)
- Team: $499/mo (5 seats + API)
- 73-91% gross margins
- Land-and-expand within agencies

### Market
- $700B US federal + state procurement
- 350K SAM-registered SMBs
- $49-499/mo vs $10K+ incumbents
- TAM $840M at 0.5% penetration

### Tech Stack
- TinyFish (core agent API) — browser automation for portals with no APIs
- MongoDB Atlas — opportunity storage and indexing
- AgentMail — email notifications
- Vercel — frontend deployment
- Railway — backend deployment

### Architecture
```
User Browser ← Next.js frontend (Vercel)
Next.js ↔ FastAPI backend (Railway)
FastAPI ↔ MongoDB Atlas (opportunity storage)
FastAPI ↔ TinyFish Web Agent API (portal scanning)
FastAPI ↔ AgentMail (email notifications)
TinyFish agents → SAM.gov / Cal eProcure / Texas SmartBuy
```

### Traction Signal
SAM.gov alone has 80K+ active opportunities. Our demo shows live agent scanning with real data in real-time.

---

## Deployment Checklist

- [ ] Backend deployed to Railway: set MONGODB_URI, TINYFISH_API_KEY, AGENTMAIL_API_KEY env vars
- [ ] Frontend deployed to Vercel: set NEXT_PUBLIC_API_URL env var
- [ ] Seed script run: `python scripts/seed_demo.py`
- [ ] Profile configured: hit `PUT /api/v1/profile` with demo profile
- [ ] Test digest: `POST /api/v1/notifications/test-digest`
- [ ] Test alert: `POST /api/v1/notifications/test-alert`
- [ ] Live scan test: `POST /api/v1/scans/trigger?portal=sam_gov`
- [ ] Demo replay test: `GET /api/v1/scans/demo-replay`
- [ ] Record demo video on March 28
- [ ] Post X thread on March 28-29 (tag @Tiny_fish)
- [ ] Submit on HackerEarth by March 29

---

## Demo Script (for video recording)

1. Open /feed — show 50 seeded opportunities with High/Medium/Low badges
2. Filter to "High" + "Urgent Only" — show 2-3 urgent opportunities
3. Click an opportunity → show detail view with relevance reasons
4. Navigate to /scan — start a SAM.gov scan
5. Show split-screen: browser agent navigating SAM.gov on left, results appearing on right
6. (If TinyFish unavailable: click "Replay Demo" for pre-recorded flow)
7. After scan: click "View in Feed →"
8. Show email: trigger POST /api/v1/notifications/test-digest and show the email
