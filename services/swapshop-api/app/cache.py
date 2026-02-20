import os
import json
import redis
from typing import Optional, Any, Dict, List

# ==============================
# CONFIGURACIÓN DESDE DOCKER
# ==============================

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_TTL_SECONDS = int(os.getenv("REDIS_TTL_SECONDS", "60"))

# ==============================
# CONEXIÓN REDIS
# ==============================

try:
    r = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        decode_responses=True
    )
    r.ping()  # prueba conexión
except Exception as e:
    print("⚠️ Redis no disponible:", e)
    r = None


# ==============================
# UTILIDADES INTERNAS
# ==============================

def _key_order(order_id: str) -> str:
    return f"order:{order_id}"

def _key_pending() -> str:
    return "orders:pending"

def _key_processed() -> str:
    return "orders:processed"


# ==============================
# CACHE POR ID (order:<id>)
# ==============================

def get_order_cache(order_id: str) -> Optional[Dict[str, Any]]:
    if not r:
        return None
    try:
        raw = r.get(_key_order(order_id))
        if not raw:
            return None
        return json.loads(raw)
    except Exception:
        return None


def set_order_cache(order_id: str, payload: Dict[str, Any]) -> None:
    if not r:
        return
    try:
        r.setex(
            _key_order(order_id),
            REDIS_TTL_SECONDS,
            json.dumps(payload, default=str)
        )
    except Exception:
        pass


def delete_order_cache(order_id: str) -> None:
    if not r:
        return
    try:
        r.delete(_key_order(order_id))
    except Exception:
        pass


# ==============================
# CACHE LISTA PENDIENTES (orders:pending)
# ==============================

def get_pending_cache() -> Optional[List[Dict[str, Any]]]:
    if not r:
        return None
    try:
        raw = r.get(_key_pending())
        if not raw:
            return None
        return json.loads(raw)
    except Exception:
        return None


def set_pending_cache(payload: List[Dict[str, Any]]) -> None:
    if not r:
        return
    try:
        r.setex(
            _key_pending(),
            REDIS_TTL_SECONDS,
            json.dumps(payload, default=str)
        )
    except Exception:
        pass


def delete_pending_cache() -> None:
    if not r:
        return
    try:
        r.delete(_key_pending())
    except Exception:
        pass


# ==============================
# CACHE LISTA PROCESADAS (orders:processed)
# ==============================

def get_processed_cache() -> Optional[List[Dict[str, Any]]]:
    if not r:
        return None
    try:
        raw = r.get(_key_processed())
        if not raw:
            return None
        return json.loads(raw)
    except Exception:
        return None


def set_processed_cache(payload: List[Dict[str, Any]]) -> None:
    if not r:
        return
    try:
        r.setex(
            _key_processed(),
            REDIS_TTL_SECONDS,
            json.dumps(payload, default=str)
        )
    except Exception:
        pass


def delete_processed_cache() -> None:
    if not r:
        return
    try:
        r.delete(_key_processed())
    except Exception:
        pass