"""Team Pydantic schemas."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class TeamBase(BaseModel):
    """Base team schema."""
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None


class TeamCreate(TeamBase):
    """Schema for creating a team."""
    pass


class TeamUpdate(BaseModel):
    """Schema for updating a team."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = None


class TeamResponse(TeamBase):
    """Schema for team response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TeamListResponse(BaseModel):
    """Schema for paginated team list."""
    items: List[TeamResponse]
    total: int
    page: int
    size: int
