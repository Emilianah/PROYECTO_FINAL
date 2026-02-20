from .auth import router as auth_router

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router

app = FastAPI(title="Swap Shop API")
app.include_router(auth_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 👈 temporalmente abierto para que funcione YA
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
