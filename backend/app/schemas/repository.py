"""Pydantic schemas for Repository/GED."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


# File Category schemas
class FileCategoryBase(BaseModel):
    """Base file category schema."""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[UUID] = None
    team_id: Optional[UUID] = None


class FileCategoryCreate(FileCategoryBase):
    """Create file category schema."""
    pass


class FileCategoryUpdate(BaseModel):
    """Update file category schema."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[UUID] = None
    team_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class FileCategoryResponse(FileCategoryBase):
    """File category response schema."""
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FileCategoryTree(FileCategoryResponse):
    """File category with children."""
    children: List["FileCategoryTree"] = []
    file_count: int = 0


# Repository File schemas
class RepositoryFileBase(BaseModel):
    """Base repository file schema."""
    description: Optional[str] = None
    tags: Optional[str] = None
    category_id: Optional[UUID] = None
    is_public: bool = True


class RepositoryFileCreate(RepositoryFileBase):
    """Create repository file schema (for metadata, file comes separately)."""
    pass


class RepositoryFileUpdate(BaseModel):
    """Update repository file schema."""
    description: Optional[str] = None
    tags: Optional[str] = None
    category_id: Optional[UUID] = None
    is_public: Optional[bool] = None


class UserBasic(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


class RepositoryFileResponse(RepositoryFileBase):
    """Repository file response schema."""
    id: UUID
    filename: str
    original_filename: str
    file_size: int
    mime_type: Optional[str] = None
    version: int
    uploaded_by: UserBasic
    download_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RepositoryFileListItem(BaseModel):
    """Repository file list item."""
    id: UUID
    filename: str
    original_filename: str
    file_size: int
    mime_type: Optional[str] = None
    category_id: Optional[UUID] = None
    description: Optional[str] = None
    tags: Optional[str] = None
    version: int
    uploaded_by: UserBasic
    download_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class RepositoryFileListResponse(BaseModel):
    """Paginated file list."""
    items: List[RepositoryFileListItem]
    total: int
    page: int
    size: int
