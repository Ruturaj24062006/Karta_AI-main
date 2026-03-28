from __future__ import annotations

from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from services.auth_security import (
    authenticate_user,
    check_admin_role,
    create_access_token,
    get_current_active_user,
)
from services.activity_log_service import activity_log_service


router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str


@router.post("/login", response_model=LoginResponse)
@router.post("/api/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token(subject=user.username, role=user.role.value)
    activity_log_service.mark_login(user.username)
    activity_log_service.log(user.username, "login", "User logged in")
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.value,
        "username": user.username,
    }


@router.post("/logout")
@router.post("/api/logout")
def logout(current_user: User = Depends(get_current_active_user)):
    activity_log_service.mark_logout(current_user.username)
    activity_log_service.log(current_user.username, "logout", "User logged out")
    return {"success": True}


@router.get("/api/me")
def me(current_user: User = Depends(get_current_active_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
    }


@router.get("/api/admin/users")
def list_users(
    _: User = Depends(check_admin_role),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "role": u.role.value,
            "is_active": u.is_active,
        }
        for u in users
    ]


@router.get("/admin/logs")
@router.get("/api/admin/logs")
def admin_logs(_: User = Depends(check_admin_role)):
    return activity_log_service.get_logs()


@router.get("/admin/session-stats")
@router.get("/api/admin/session-stats")
def session_stats(_: User = Depends(check_admin_role)):
    return {
        "active_users": activity_log_service.get_active_users_count(),
        "active_usernames": activity_log_service.get_active_usernames(),
        "server_time": datetime.now(timezone.utc).isoformat(),
    }


@router.delete("/api/admin/users/{username}")
def delete_user(
    username: str,
    current_admin: User = Depends(check_admin_role),
    db: Session = Depends(get_db),
):
    if current_admin.username == username:
        raise HTTPException(status_code=400, detail="Admin cannot delete self")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"success": True, "message": f"User '{username}' deleted"}
