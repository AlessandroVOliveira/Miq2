"""Checklists router for template management."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ChecklistTemplate, ChecklistItem
from app.schemas.checklist import (
    ChecklistTemplateCreate, ChecklistTemplateUpdate, ChecklistTemplateResponse,
    ChecklistTemplateListResponse, ChecklistItemCreate, ChecklistItemUpdate,
    ChecklistItemResponse, ChecklistItemReorder
)
from app.middleware.auth import get_current_active_user, require_permission
from app.models.user import User

router = APIRouter(prefix="/checklists", tags=["Checklists"])


@router.get("", response_model=ChecklistTemplateListResponse)
async def list_checklists(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("checklists", "read"))
):
    """List checklist templates with pagination."""
    query = db.query(ChecklistTemplate)
    
    if search:
        query = query.filter(ChecklistTemplate.name.ilike(f"%{search}%"))
    
    if is_active is not None:
        query = query.filter(ChecklistTemplate.is_active == is_active)
    
    total = query.count()
    templates = query.order_by(ChecklistTemplate.name).offset((page - 1) * size).limit(size).all()
    
    return ChecklistTemplateListResponse(items=templates, total=total, page=page, size=size)


@router.post("", response_model=ChecklistTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_checklist(
    template_data: ChecklistTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("checklists", "create"))
):
    """Create a new checklist template with items."""
    items_data = template_data.items or []
    template_dict = template_data.model_dump(exclude={"items"})
    
    template = ChecklistTemplate(**template_dict)
    db.add(template)
    db.flush()
    
    # Create items
    for i, item_data in enumerate(items_data):
        item = ChecklistItem(
            template_id=template.id,
            order=item_data.order if item_data.order else i,
            **item_data.model_dump(exclude={"order"})
        )
        db.add(item)
    
    db.commit()
    db.refresh(template)
    return template


@router.get("/{template_id}", response_model=ChecklistTemplateResponse)
async def get_checklist(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("checklists", "read"))
):
    """Get a checklist template with its items."""
    template = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Checklist template not found")
    return template


@router.put("/{template_id}", response_model=ChecklistTemplateResponse)
async def update_checklist(
    template_id: UUID,
    template_data: ChecklistTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("checklists", "update"))
):
    """Update a checklist template."""
    template = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Checklist template not found")
    
    update_data = template_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(template, field, value)
    
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_checklist(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("checklists", "delete"))
):
    """Delete a checklist template."""
    template = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Checklist template not found")
    
    db.delete(template)
    db.commit()


# Checklist Items endpoints
@router.post("/{template_id}/items", response_model=ChecklistItemResponse, status_code=status.HTTP_201_CREATED)
async def add_item(
    template_id: UUID,
    item_data: ChecklistItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("checklists", "update"))
):
    """Add an item to a checklist template."""
    template = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Checklist template not found")
    
    # Get max order
    max_order = db.query(ChecklistItem).filter(
        ChecklistItem.template_id == template_id
    ).count()
    
    item = ChecklistItem(
        template_id=template_id,
        order=item_data.order if item_data.order else max_order,
        **item_data.model_dump(exclude={"order"})
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{template_id}/items/{item_id}", response_model=ChecklistItemResponse)
async def update_item(
    template_id: UUID,
    item_id: UUID,
    item_data: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("checklists", "update"))
):
    """Update a checklist item."""
    item = db.query(ChecklistItem).filter(
        ChecklistItem.id == item_id,
        ChecklistItem.template_id == template_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{template_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    template_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("checklists", "update"))
):
    """Delete a checklist item."""
    item = db.query(ChecklistItem).filter(
        ChecklistItem.id == item_id,
        ChecklistItem.template_id == template_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(item)
    db.commit()


@router.post("/{template_id}/items/reorder", response_model=ChecklistTemplateResponse)
async def reorder_items(
    template_id: UUID,
    order_data: ChecklistItemReorder,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("checklists", "update"))
):
    """Reorder checklist items."""
    template = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Checklist template not found")
    
    for i, item_id in enumerate(order_data.item_ids):
        db.query(ChecklistItem).filter(
            ChecklistItem.id == item_id,
            ChecklistItem.template_id == template_id
        ).update({"order": i})
    
    db.commit()
    db.refresh(template)
    return template
