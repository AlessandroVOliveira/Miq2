"""Schemas for Document Template."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.product import ProductResponse


class DocumentTemplateBase(BaseModel):
    """Base schema for document template."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    template_type: str = "other"


class DocumentTemplateCreate(DocumentTemplateBase):
    """Schema for creating a document template."""
    product_ids: List[UUID] = Field(default_factory=list)


class DocumentTemplateUpdate(BaseModel):
    """Schema for updating a document template."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    template_type: Optional[str] = None
    product_ids: Optional[List[UUID]] = None
    is_active: Optional[bool] = None


class DocumentTemplateResponse(DocumentTemplateBase):
    """Schema for document template response."""
    id: UUID
    file_path: str
    original_filename: str
    placeholders: List[str] = Field(default_factory=list)
    is_active: bool
    created_at: datetime
    updated_at: datetime
    products: List[ProductResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class DocumentTemplateListResponse(BaseModel):
    """Schema for listing document templates."""
    id: UUID
    name: str
    description: Optional[str]
    template_type: str
    original_filename: str
    placeholders: List[str] = Field(default_factory=list)
    is_active: bool
    created_at: datetime
    product_count: int = 0

    class Config:
        from_attributes = True


class PlaceholderInfo(BaseModel):
    """Information about an available placeholder."""
    name: str
    description: str
    example: Optional[str] = None
    category: Optional[str] = None


class AvailablePlaceholdersResponse(BaseModel):
    """Response with all available placeholders."""
    placeholders: List[PlaceholderInfo]


class GenerateDocumentRequest(BaseModel):
    """Request to generate a document from a template."""
    implementation_id: UUID
