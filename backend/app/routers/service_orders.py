"""Service Orders router."""
from typing import Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    ServiceOrderTemplate, ServiceOrder, EquipmentEntry, Client, User, Team,
    ServiceOrderStatus
)
from app.schemas.service_order import (
    ServiceOrderTemplateCreate, ServiceOrderTemplateUpdate, ServiceOrderTemplateResponse,
    ServiceOrderTemplateListResponse,
    ServiceOrderCreate, ServiceOrderUpdate, ServiceOrderResponse,
    ServiceOrderListResponse, ServiceOrderListItem,
    EquipmentEntryCreate, EquipmentEntryUpdate, EquipmentEntryResponse,
    ServiceOrderStatusEnum, ServiceOrderPriorityEnum
)
from app.middleware.auth import get_current_active_user, require_permission

router = APIRouter(prefix="/service-orders", tags=["Service Orders"])


# ========== Templates ==========
@router.get("/templates", response_model=ServiceOrderTemplateListResponse)
async def list_templates(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "read"))
):
    """List service order templates."""
    query = db.query(ServiceOrderTemplate)
    if search:
        query = query.filter(ServiceOrderTemplate.name.ilike(f"%{search}%"))
    total = query.count()
    templates = query.order_by(ServiceOrderTemplate.name).offset((page - 1) * size).limit(size).all()
    return ServiceOrderTemplateListResponse(items=templates, total=total, page=page, size=size)


@router.post("/templates", response_model=ServiceOrderTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: ServiceOrderTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "create"))
):
    """Create a service order template."""
    template = ServiceOrderTemplate(**data.model_dump())
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.get("/templates/{template_id}", response_model=ServiceOrderTemplateResponse)
async def get_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "read"))
):
    """Get a service order template."""
    template = db.query(ServiceOrderTemplate).filter(ServiceOrderTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/templates/{template_id}", response_model=ServiceOrderTemplateResponse)
async def update_template(
    template_id: UUID,
    data: ServiceOrderTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "update"))
):
    """Update a service order template."""
    template = db.query(ServiceOrderTemplate).filter(ServiceOrderTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(template, field, value)
    db.commit()
    db.refresh(template)
    return template


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "delete"))
):
    """Delete a service order template."""
    template = db.query(ServiceOrderTemplate).filter(ServiceOrderTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()


# ========== Service Orders ==========
@router.get("", response_model=ServiceOrderListResponse)
async def list_service_orders(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    client_id: Optional[UUID] = None,
    status: Optional[ServiceOrderStatusEnum] = None,
    priority: Optional[ServiceOrderPriorityEnum] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "read"))
):
    """List service orders with filters."""
    query = db.query(ServiceOrder)
    if search:
        query = query.filter(ServiceOrder.title.ilike(f"%{search}%"))
    if client_id:
        query = query.filter(ServiceOrder.client_id == client_id)
    if status:
        query = query.filter(ServiceOrder.status == status.value)
    if priority:
        query = query.filter(ServiceOrder.priority == priority.value)
    
    total = query.count()
    orders = query.order_by(ServiceOrder.opened_at.desc()).offset((page - 1) * size).limit(size).all()
    
    items = [ServiceOrderListItem(
        id=o.id, title=o.title, client=o.client, assigned_user=o.assigned_user,
        status=o.status, priority=o.priority, opened_at=o.opened_at, created_at=o.created_at
    ) for o in orders]
    
    return ServiceOrderListResponse(items=items, total=total, page=page, size=size)


@router.post("", response_model=ServiceOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_service_order(
    data: ServiceOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "create"))
):
    """Create a new service order."""
    client = db.query(Client).filter(Client.id == data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    order_data = data.model_dump()
    order = ServiceOrder(**order_data)
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("/{order_id}", response_model=ServiceOrderResponse)
async def get_service_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "read"))
):
    """Get a service order."""
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Service order not found")
    return order


@router.put("/{order_id}", response_model=ServiceOrderResponse)
async def update_service_order(
    order_id: UUID,
    data: ServiceOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "update"))
):
    """Update a service order."""
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Service order not found")
    
    update_data = data.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"]:
        update_data["status"] = update_data["status"].value
    if "priority" in update_data and update_data["priority"]:
        update_data["priority"] = update_data["priority"].value
    
    for field, value in update_data.items():
        setattr(order, field, value)
    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "delete"))
):
    """Delete a service order."""
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Service order not found")
    db.delete(order)
    db.commit()


@router.post("/{order_id}/start", response_model=ServiceOrderResponse)
async def start_service_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "update"))
):
    """Start working on a service order."""
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Service order not found")
    if order.status != ServiceOrderStatus.OPEN:
        raise HTTPException(status_code=400, detail="Order must be open to start")
    
    order.status = ServiceOrderStatus.IN_PROGRESS
    order.started_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/complete", response_model=ServiceOrderResponse)
async def complete_service_order(
    order_id: UUID,
    resolution_notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "update"))
):
    """Complete a service order."""
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Service order not found")
    
    order.status = ServiceOrderStatus.COMPLETED
    order.completed_at = datetime.utcnow()
    if resolution_notes:
        order.resolution_notes = resolution_notes
    db.commit()
    db.refresh(order)
    return order


# ========== Equipment Entries ==========
@router.get("/{order_id}/equipment", response_model=list[EquipmentEntryResponse])
async def list_equipment(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "read"))
):
    """List equipment entries for a service order."""
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Service order not found")
    return order.equipment_entries


@router.post("/{order_id}/equipment", response_model=EquipmentEntryResponse, status_code=status.HTTP_201_CREATED)
async def add_equipment(
    order_id: UUID,
    data: EquipmentEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "update"))
):
    """Add equipment entry to a service order."""
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Service order not found")
    
    entry = EquipmentEntry(service_order_id=order_id, received_by_id=current_user.id, **data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.put("/{order_id}/equipment/{entry_id}", response_model=EquipmentEntryResponse)
async def update_equipment(
    order_id: UUID,
    entry_id: UUID,
    data: EquipmentEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("service_orders", "update"))
):
    """Update equipment entry (e.g., release)."""
    entry = db.query(EquipmentEntry).filter(
        EquipmentEntry.id == entry_id,
        EquipmentEntry.service_order_id == order_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Equipment entry not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry
