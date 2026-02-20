from fastapi import APIRouter, HTTPException
from typing import List, Union

from .models import OrderCreate, Order, OrderSummary
from .storage import (
    create_order,
    get_pending,
    get_processed,
    mark_processed,
    get_order,
)

# 👇 IMPORTAR CACHE
from .cache import (
    get_order_cache,
    set_order_cache,
    delete_order_cache,
    get_pending_cache,
    set_pending_cache,
    delete_pending_cache,
    get_processed_cache,
    set_processed_cache,
    delete_processed_cache,
)

router = APIRouter()


# =========================================
# CREAR ORDEN
# =========================================
@router.post("/orders", response_model=Order)
def create(payload: OrderCreate):
    order = create_order(payload)

    # Invalida listas porque cambió el estado global
    delete_pending_cache()
    delete_processed_cache()

    # Guarda orden individual en cache
    try:
        payload_dict = (
            order.model_dump()
            if hasattr(order, "model_dump")
            else order.dict()
        )
        set_order_cache(str(payload_dict["id"]), payload_dict)
    except Exception:
        pass

    return order


# =========================================
# LISTA PENDIENTES (CON REDIS)
# =========================================
@router.get("/orders/pending", response_model=List[OrderSummary])
def pending():

    # 1️⃣ Redis primero
    cached = get_pending_cache()
    if cached is not None:
        return cached

    # 2️⃣ MySQL
    data = get_pending()

    # 3️⃣ Guardar en Redis
    try:
        serializable = [
            x.model_dump() if hasattr(x, "model_dump") else x
            for x in data
        ]
        set_pending_cache(serializable)
        return serializable
    except Exception:
        return data


# =========================================
# LISTA PROCESADAS (NUEVO)
# =========================================
@router.get("/orders/processed", response_model=List[OrderSummary])
def processed_list():

    # 1️⃣ Redis primero
    cached = get_processed_cache()
    if cached is not None:
        return cached

    # 2️⃣ MySQL
    data = get_processed()

    # 3️⃣ Guardar en Redis
    try:
        serializable = [
            x.model_dump() if hasattr(x, "model_dump") else x
            for x in data
        ]
        set_processed_cache(serializable)
        return serializable
    except Exception:
        return data


# =========================================
# OBTENER POR ID (CON REDIS)
# =========================================
@router.get("/orders/{order_id}", response_model=Union[Order, dict])
def read(order_id: str):

    # 1️⃣ Redis primero
    cached = get_order_cache(order_id)
    if cached is not None:
        return cached

    # 2️⃣ MySQL
    order = get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    # 3️⃣ Guardar en Redis
    try:
        payload_dict = (
            order.model_dump()
            if hasattr(order, "model_dump")
            else order
        )
        set_order_cache(order_id, payload_dict)
        return payload_dict
    except Exception:
        return order


# =========================================
# MARCAR COMO PROCESADA
# =========================================
@router.post("/orders/{order_id}/mark-processed")
def processed(order_id: str):
    ok = mark_processed(order_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    # Invalida todo lo afectado
    delete_order_cache(order_id)
    delete_pending_cache()
    delete_processed_cache()

    return {"ok": True}