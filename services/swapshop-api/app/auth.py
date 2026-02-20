from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])

# Base de datos en memoria (para demo)
USERS = {}      # email -> {id, nombre, email, password}
TOKENS = {}     # token -> email

class RegisterIn(BaseModel):
    nombre: str
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class AuthOut(BaseModel):
    token: str
    user: dict

@router.post("/register", response_model=AuthOut)
def register(payload: RegisterIn):
    email = payload.email.lower()
    if email in USERS:
        raise HTTPException(status_code=400, detail="El email ya está registrado.")

    user_id = str(uuid.uuid4())
    USERS[email] = {
        "id": user_id,
        "nombre": payload.nombre,
        "email": email,
        "password": payload.password,  # demo simple (NO para producción)
    }

    token = str(uuid.uuid4())
    TOKENS[token] = email
    return {"token": token, "user": {"id": user_id, "nombre": payload.nombre, "email": email}}

@router.post("/login", response_model=AuthOut)
def login(payload: LoginIn):
    email = payload.email.lower()
    user = USERS.get(email)
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas.")

    token = str(uuid.uuid4())
    TOKENS[token] = email
    return {"token": token, "user": {"id": user["id"], "nombre": user["nombre"], "email": user["email"]}}
