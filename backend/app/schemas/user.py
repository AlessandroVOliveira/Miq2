"""User Pydantic schemas."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=255)


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: str = Field(..., min_length=6)
    is_active: bool = True
    is_superuser: bool = False
    team_ids: List[UUID] = []
    role_ids: List[UUID] = []


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    email: Optional[EmailStr] = None
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    password: Optional[str] = Field(None, min_length=6)
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    team_ids: Optional[List[UUID]] = None
    role_ids: Optional[List[UUID]] = None


class UserResponse(UserBase):
    """Schema for user response."""
    id: UUID
    avatar_url: Optional[str] = None
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    teams: List["TeamBasic"] = []
    roles: List["RoleBasic"] = []

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Schema for paginated user list."""
    items: List[UserResponse]
    total: int
    page: int
    size: int


# Authentication schemas
class LoginRequest(BaseModel):
    """Schema for login request."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Schema for JWT token payload."""
    sub: str  # user id
    exp: datetime
    type: str  # "access" or "refresh"


# Circular import resolution
class TeamBasic(BaseModel):
    """Basic team info for user response."""
    id: UUID
    name: str

    class Config:
        from_attributes = True


class PermissionInRole(BaseModel):
    """Permission info included in role for user response."""
    resource: str
    action: str

    class Config:
        from_attributes = True


class RoleBasic(BaseModel):
    """Basic role info for user response."""
    id: UUID
    name: str
    permissions: List[PermissionInRole] = []

    class Config:
        from_attributes = True


# Update forward refs
UserResponse.model_rebuild()
