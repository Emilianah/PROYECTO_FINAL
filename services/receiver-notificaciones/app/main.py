from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router

app = FastAPI(title="Swap Shop Notificaciones")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 👈 igual aquí
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
