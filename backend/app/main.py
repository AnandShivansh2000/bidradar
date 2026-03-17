from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import connect_db, disconnect_db
from .scheduler import scheduler, setup_scheduler
from .routers import opportunities, scans, profile, portals, notifications


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    setup_scheduler()
    scheduler.start()
    yield
    scheduler.shutdown()
    await disconnect_db()


app = FastAPI(title="BidRadar API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(opportunities.router, prefix="/api/v1")
app.include_router(scans.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")
app.include_router(portals.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
