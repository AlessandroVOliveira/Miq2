"""Clients router."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.client import Client, ClientContact
from app.models.user import User
from app.schemas.client import (
    ClientCreate, ClientUpdate, ClientResponse, ClientListResponse,
    ClientContactCreate, ClientContactUpdate, ClientContactResponse
)
from app.middleware.auth import require_permission

router = APIRouter(prefix="/clients", tags=["Clients"])


# ==================== Client Endpoints ====================

@router.get("", response_model=ClientListResponse)
async def list_clients(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("clients", "read"))
):
    """List all clients with pagination and filters."""
    query = db.query(Client)
    
    if search:
        query = query.filter(
            (Client.company_name.ilike(f"%{search}%")) | 
            (Client.cnpj.ilike(f"%{search}%"))
        )
    
    if is_active is not None:
        query = query.filter(Client.is_active == is_active)
    
    total = query.count()
    clients = query.order_by(Client.company_name).offset((page - 1) * size).limit(size).all()
    
    return ClientListResponse(items=clients, total=total, page=page, size=size)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("clients", "read"))
):
    """Get a specific client by ID."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    return client


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("clients", "create"))
):
    """Create a new client with optional contacts."""
    # Check if CNPJ exists (if provided)
    if client_data.cnpj:
        existing = db.query(Client).filter(Client.cnpj == client_data.cnpj).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CNPJ already registered"
            )
    
    # Create client
    client_dict = client_data.model_dump(exclude={"contacts"})
    client = Client(**client_dict)
    
    db.add(client)
    db.flush()
    
    # Create contacts
    for contact_data in client_data.contacts:
        contact = ClientContact(client_id=client.id, **contact_data.model_dump())
        db.add(contact)
    
    db.commit()
    db.refresh(client)
    
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client_data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("clients", "update"))
):
    """Update a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    # Check CNPJ uniqueness
    if client_data.cnpj is not None:
        existing = db.query(Client).filter(
            Client.cnpj == client_data.cnpj, 
            Client.id != client_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CNPJ already in use"
            )
    
    # Update fields
    update_data = client_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)
    
    db.commit()
    db.refresh(client)
    
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("clients", "delete"))
):
    """Delete a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    db.delete(client)
    db.commit()


# ==================== Client Contacts Endpoints ====================

@router.get("/{client_id}/contacts", response_model=list[ClientContactResponse])
async def list_client_contacts(
    client_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("clients", "read"))
):
    """List all contacts for a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    return client.contacts


@router.post("/{client_id}/contacts", response_model=ClientContactResponse, status_code=status.HTTP_201_CREATED)
async def create_client_contact(
    client_id: UUID,
    contact_data: ClientContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("clients", "update"))
):
    """Add a new contact to a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
    
    contact = ClientContact(client_id=client_id, **contact_data.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    
    return contact


@router.put("/{client_id}/contacts/{contact_id}", response_model=ClientContactResponse)
async def update_client_contact(
    client_id: UUID,
    contact_id: UUID,
    contact_data: ClientContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("clients", "update"))
):
    """Update a client contact."""
    contact = db.query(ClientContact).filter(
        ClientContact.id == contact_id,
        ClientContact.client_id == client_id
    ).first()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    
    update_data = contact_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)
    
    db.commit()
    db.refresh(contact)
    
    return contact


@router.delete("/{client_id}/contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client_contact(
    client_id: UUID,
    contact_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("clients", "update"))
):
    """Delete a client contact."""
    contact = db.query(ClientContact).filter(
        ClientContact.id == contact_id,
        ClientContact.client_id == client_id
    ).first()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    
    db.delete(contact)
    db.commit()
