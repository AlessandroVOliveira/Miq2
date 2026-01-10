"""Client Pydantic schemas."""
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


# Client Contact schemas
class ClientContactBase(BaseModel):
    """Base client contact schema."""
    name: str = Field(..., min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    role: Optional[str] = Field(None, max_length=100)
    is_primary: bool = False


class ClientContactCreate(ClientContactBase):
    """Schema for creating a client contact."""
    pass


class ClientContactUpdate(BaseModel):
    """Schema for updating a client contact."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    role: Optional[str] = Field(None, max_length=100)
    is_primary: Optional[bool] = None


class ClientContactResponse(ClientContactBase):
    """Schema for client contact response."""
    id: UUID
    client_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Client schemas
class ClientBase(BaseModel):
    """Base client schema."""
    company_name: str = Field(..., min_length=2, max_length=255)
    cnpj: Optional[str] = Field(None, max_length=18)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=2)
    zip_code: Optional[str] = Field(None, max_length=10)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    notes: Optional[str] = None
    is_active: bool = True


class ClientCreate(ClientBase):
    """Schema for creating a client."""
    contacts: List[ClientContactCreate] = []


class ClientUpdate(BaseModel):
    """Schema for updating a client."""
    company_name: Optional[str] = Field(None, min_length=2, max_length=255)
    cnpj: Optional[str] = Field(None, max_length=18)
    address: Optional[str] = None
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=2)
    zip_code: Optional[str] = Field(None, max_length=10)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ClientResponse(ClientBase):
    """Schema for client response."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    contacts: List[ClientContactResponse] = []

    class Config:
        from_attributes = True


class ClientListResponse(BaseModel):
    """Schema for paginated client list."""
    items: List[ClientResponse]
    total: int
    page: int
    size: int
