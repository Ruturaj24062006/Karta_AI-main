from enum import Enum

from sqlalchemy import Boolean, Column, Enum as SqlEnum, Integer, String

from database import Base


class UserRole(str, Enum):
    analyst = "analyst"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(SqlEnum(UserRole, native_enum=False), nullable=False, default=UserRole.analyst)
    is_active = Column(Boolean, default=True, nullable=False)
