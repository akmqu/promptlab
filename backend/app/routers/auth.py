from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user, get_current_user_optional
from app.models import User
from app.schemas import MessageOut, UserCreate, UserLogin, UserOut
from app.security import create_session_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, user_id: int) -> None:
    settings = get_settings()
    # SameSite=Lax is enough when the browser talks to the Next.js origin and
    # /api is proxied (recommended). Avoid mixing localhost and 127.0.0.1 in the
    # browser-facing API URL — that is cross-site and drops Lax cookies on fetch.
    response.set_cookie(
        key=settings.session_cookie_name,
        value=create_session_token(user_id),
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=settings.session_max_age_seconds,
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, response: Response, db: Session = Depends(get_db)) -> User:
    email = payload.email.lower().strip()
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Konto z tym e-mailem już istnieje")
    user = User(
        email=email,
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _set_session_cookie(response, user.id)
    return user


@router.post("/login", response_model=UserOut)
def login(payload: UserLogin, response: Response, db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nieprawidłowy e-mail lub hasło")
    _set_session_cookie(response, user.id)
    return user


@router.post("/logout", response_model=MessageOut)
def logout(response: Response) -> MessageOut:
    settings = get_settings()
    response.delete_cookie(settings.session_cookie_name, path="/")
    return MessageOut(message="Wylogowano")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.get("/session")
def session_status(user: User | None = Depends(get_current_user_optional)) -> dict:
    if user is None:
        return {"authenticated": False, "user": None}
    return {
        "authenticated": True,
        "user": UserOut.model_validate(user).model_dump(mode="json"),
    }
