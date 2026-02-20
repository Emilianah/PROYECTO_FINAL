from datetime import datetime
import uuid
from typing import Optional, Any, Dict, List

from .models import OrderCreate
from .database import get_connection
from .cache import (
    get_order_cache,
    set_order_cache,
    delete_order_cache,
)


def calc_total(order: OrderCreate) -> float:
    return float(sum(i.cantidad * i.precio_unitario for i in order.items))


# =========================================
# CREAR ORDEN
# =========================================
def create_order(order: OrderCreate) -> Dict[str, Any]:
    oid = str(uuid.uuid4())
    total = calc_total(order)
    created_at = datetime.utcnow()

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO orders (id, cliente, total, estado, created_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (oid, order.cliente, total, "PENDING", created_at),
            )

            for item in order.items:
                cur.execute(
                    """
                    INSERT INTO order_items
                    (order_id, producto, talla, color, cantidad, precio_unitario)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        oid,
                        item.producto,
                        item.talla,
                        item.color,
                        item.cantidad,
                        item.precio_unitario,
                    ),
                )

        conn.commit()

    finally:
        conn.close()

    payload = {
        "id": oid,
        "cliente": order.cliente,
        "items": [i.model_dump() for i in order.items],
        "total": total,
        "estado": "PENDING",
        "created_at": created_at.isoformat(),
    }

    set_order_cache(oid, payload)
    print("🔥 GUARDADO EN MYSQL + REDIS")

    return payload


# =========================================
# OBTENER ORDEN POR ID
# =========================================
def get_order(order_id: str) -> Optional[Dict[str, Any]]:
    cached = get_order_cache(order_id)
    if cached:
        print("🔥 CACHE HIT (REDIS)")
        return cached

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM orders WHERE id=%s", (order_id,))
            o = cur.fetchone()
            if not o:
                return None

            cur.execute(
                """
                SELECT producto, talla, color, cantidad, precio_unitario
                FROM order_items
                WHERE order_id=%s
                """,
                (order_id,),
            )
            items = cur.fetchall()

    finally:
        conn.close()

    payload = {
        "id": o["id"],
        "cliente": o["cliente"],
        "items": items,
        "total": float(o["total"]),
        "estado": o["estado"],
        "created_at": (
            o["created_at"].isoformat()
            if hasattr(o["created_at"], "isoformat")
            else str(o["created_at"])
        ),
    }

    set_order_cache(order_id, payload)
    print("💾 CACHE MISS → MYSQL (guardado en REDIS)")

    return payload


# =========================================
# OBTENER PENDIENTES
# =========================================
def get_pending() -> List[Dict[str, Any]]:
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM orders
                WHERE estado='PENDING'
                ORDER BY created_at DESC
                """
            )
            rows = cur.fetchall()

    finally:
        conn.close()

    for r in rows:
        r["total"] = float(r["total"])
        if hasattr(r["created_at"], "isoformat"):
            r["created_at"] = r["created_at"].isoformat()

    print(f"📦 PENDIENTES EN MYSQL: {len(rows)}")

    return rows


# =========================================
# ✅ NUEVO: OBTENER PROCESADAS
# =========================================
def get_processed() -> List[Dict[str, Any]]:
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM orders
                WHERE estado='PROCESSED'
                ORDER BY created_at DESC
                """
            )
            rows = cur.fetchall()

    finally:
        conn.close()

    for r in rows:
        r["total"] = float(r["total"])
        if hasattr(r["created_at"], "isoformat"):
            r["created_at"] = r["created_at"].isoformat()

    print(f"✅ PROCESADAS EN MYSQL: {len(rows)}")

    return rows


# =========================================
# MARCAR COMO PROCESADA
# =========================================
def mark_processed(order_id: str) -> bool:
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE orders SET estado='PROCESSED' WHERE id=%s",
                (order_id,),
            )
            updated = cur.rowcount

        conn.commit()

    finally:
        conn.close()

    if updated:
        delete_order_cache(order_id)
        print("🧹 CACHE INVALIDADO (REDIS) por cambio de estado")
        return True

    return False