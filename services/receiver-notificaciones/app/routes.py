from fastapi import APIRouter
from .storage import save, list_all

router = APIRouter()

@router.post("/webhooks/order-ready")
def webhook(payload:dict):
    return save(payload)

@router.get("/notifications")
def notifications():
    return list_all()
