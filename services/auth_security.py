from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import config
from database import Base, engine, get_db
from models.user import User, UserRole


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/login", auto_error=False)


def _jwt_secret() -> str:
    return config.JWT_SECRET_KEY or "dev-change-me-in-env"


def _jwt_algorithm() -> str:
    return config.JWT_ALGORITHM or "HS256"


def _jwt_expiry_minutes() -> int:
    try:
        return int(config.JWT_EXPIRE_MINUTES or 60)
    except Exception:
        return 60


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str, role: str, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=_jwt_expiry_minutes()))
    payload = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(payload, _jwt_secret(), algorithm=_jwt_algorithm())


def authenticate_user(db: Session, username: str, password: str) -> User | None:
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def get_current_active_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload: dict[str, Any] = jwt.decode(token, _jwt_secret(), algorithms=[_jwt_algorithm()])
        username = payload.get("sub")
        token_role = payload.get("role")
        if not username or not token_role:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return user


def check_admin_role(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current_user


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db),
) -> User | None:
    if not token:
        return None

    try:
        payload: dict[str, Any] = jwt.decode(token, _jwt_secret(), algorithms=[_jwt_algorithm()])
        username = payload.get("sub")
        token_role = payload.get("role")
        if not username or not token_role:
            return None
    except JWTError:
        return None

    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        return None
    return user


def ensure_default_users(db: Session) -> None:
    # Defensive create for environments where startup hooks are bypassed.
    Base.metadata.create_all(bind=engine)

    if db.query(User).count() > 0:
        return

    admin_username = config.DEFAULT_ADMIN_USERNAME or "admin"
    admin_password = config.DEFAULT_ADMIN_PASSWORD or "admin123"
    analyst_username = config.DEFAULT_ANALYST_USERNAME or "analyst"
    analyst_password = config.DEFAULT_ANALYST_PASSWORD or "analyst123"

    db.add(
        User(
            username=admin_username,
            password_hash=get_password_hash(admin_password),
            role=UserRole.admin,
            is_active=True,
        )
    )
    db.add(
        User(
            username=analyst_username,
            password_hash=get_password_hash(analyst_password),
            role=UserRole.analyst,
            is_active=True,
        )
    )
    db.commit()
