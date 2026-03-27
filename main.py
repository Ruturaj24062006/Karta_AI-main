from dotenv import load_dotenv
load_dotenv()  # MUST be first — loads .env into os.environ before any service reads keys

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi import Depends
from database import engine, Base, SessionLocal, get_db
from sqlalchemy.orm import Session
from utils.demo_data import load_demo_data, reset_demo_data
from routers import upload, analyze, fraud, scoring, cam, ews, health, ws, history, ews_ws, health_live

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    Base.metadata.create_all(bind=engine)
    
    # Add sample demo data on startup
    db = SessionLocal()
    try:
        load_demo_data(db)
    finally:
        db.close()
        
    yield
    # Shutdown logic (if any) goes here

app = FastAPI(
    title="KARTA — AI Credit Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan
)

from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Add GZip compression for faster frontend loads
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(upload.router, tags=["Upload"])
app.include_router(analyze.router, tags=["Analyze"])
app.include_router(fraud.router, tags=["Fraud"])
app.include_router(scoring.router, tags=["Scoring"])
app.include_router(cam.router, tags=["CAM"])
app.include_router(ews.router, tags=["EWS"])
app.include_router(history.router, tags=["History"])
app.include_router(health.router)
app.include_router(ws.router)
app.include_router(ews_ws.router)          # EWS WebSocket: ws://localhost:8000/ws/ews/{id}
app.include_router(health_live.router)    # Live health: GET /api/health/live and ws://localhost:8000/ws/health

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}

@app.get("/api/demo/reset")
def demo_reset(db: Session = Depends(get_db)):
    reset_demo_data(db)
    return {"success": True, "message": "Demo data reset successfully"}
