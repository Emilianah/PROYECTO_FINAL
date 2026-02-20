from pydantic import BaseModel, Field
from typing import List, Literal
from datetime import datetime

class OrderItem(BaseModel):
    producto: str
    talla: str
    color: str
    cantidad: int = Field(ge=1)
    precio_unitario: float = Field(gt=0)

class OrderCreate(BaseModel):
    cliente: str
    items: List[OrderItem]

class Order(BaseModel):
    id: str
    cliente: str
    items: List[OrderItem]
    total: float
    estado: Literal["PENDING","PROCESSED"] = "PENDING"
    created_at: datetime

# Nuevo: para /orders/pending (solo cabecera)
class OrderSummary(BaseModel):
    id: str
    cliente: str
    total: float
    estado: Literal["PENDING","PROCESSED"]
    created_at: datetime
