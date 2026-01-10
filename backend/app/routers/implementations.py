"""Implementations router for managing ERP deployments."""
import os
import shutil
from datetime import datetime, date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import (
    Implementation, ImplementationItem, ImplementationAttachment,
    ChecklistTemplate, ChecklistItem, Client, Product, User,
    ImplementationStatus, ItemStatus, AttachmentType
)
from app.schemas.implementation import (
    ImplementationCreate, ImplementationUpdate, ImplementationResponse,
    ImplementationListResponse, ImplementationListItem,
    ImplementationItemUpdate, ImplementationItemResponse,
    ImplementationAttachmentResponse, GanttResponse, GanttItem,
    ImplementationStatusEnum, AttachmentTypeEnum
)
from app.middleware.auth import get_current_active_user, require_permission

router = APIRouter(prefix="/implementations", tags=["Implementations"])

UPLOAD_DIR = "uploads/implementations"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=ImplementationListResponse)
async def list_implementations(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    client_id: Optional[UUID] = None,
    status: Optional[ImplementationStatusEnum] = None,
    responsible_user_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("implementations", "read"))
):
    """List implementations with filters."""
    query = db.query(Implementation)
    
    # Non-superusers can only see implementations assigned to them
    if not current_user.is_superuser:
        query = query.filter(Implementation.responsible_user_id == current_user.id)
    
    if search:
        query = query.filter(Implementation.title.ilike(f"%{search}%"))
    
    if client_id:
        query = query.filter(Implementation.client_id == client_id)
    
    if status:
        query = query.filter(Implementation.status == status.value)
    
    if responsible_user_id:
        query = query.filter(Implementation.responsible_user_id == responsible_user_id)
    
    total = query.count()
    implementations = query.order_by(Implementation.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    # Build response with progress
    items = []
    for impl in implementations:
        item = ImplementationListItem(
            id=impl.id,
            title=impl.title,
            client=impl.client,
            product=impl.product,
            responsible_user=impl.responsible_user,
            status=impl.status,
            start_date=impl.start_date,
            estimated_end_date=impl.estimated_end_date,
            progress_percentage=impl.progress_percentage,
            created_at=impl.created_at
        )
        items.append(item)
    
    return ImplementationListResponse(items=items, total=total, page=page, size=size)


@router.get("/sprint-progress")
async def get_sprint_progress(
    start_date: date = Query(...),
    end_date: date = Query(...),
    team_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("implementations", "read"))
):
    """Get implementations progress with items completed in the period."""
    from datetime import datetime as dt, timedelta
    from app.models.user import UserTeam
    
    # Query implementations in progress or pending
    query = db.query(Implementation).options(
        joinedload(Implementation.items),
        joinedload(Implementation.client),
        joinedload(Implementation.product),
        joinedload(Implementation.responsible_user)
    ).filter(Implementation.status.in_([ImplementationStatus.IN_PROGRESS, ImplementationStatus.PENDING]))
    
    # Non-superusers only see their own implementations
    if not current_user.is_superuser:
        query = query.filter(Implementation.responsible_user_id == current_user.id)
    
    # Filter by team - get user IDs from the team
    if team_id:
        team_user_ids = db.query(UserTeam.user_id).filter(UserTeam.team_id == team_id).subquery()
        query = query.filter(Implementation.responsible_user_id.in_(team_user_ids))
    
    implementations = query.all()
    
    # Convert dates to datetime for comparison
    start_dt = dt.combine(start_date, dt.min.time())
    end_dt = dt.combine(end_date, dt.max.time())
    
    result = []
    for impl in implementations:
        # Filter active items (not cancelled)
        active_items = [item for item in impl.items if item.status != ItemStatus.CANCELLED]
        
        # Items completed in the period
        items_in_period = [
            item for item in active_items
            if item.status == ItemStatus.COMPLETED
            and item.completed_at
            and start_dt <= item.completed_at <= end_dt
        ]
        
        total_items = len(active_items)
        completed_total = sum(1 for item in active_items if item.status == ItemStatus.COMPLETED)
        completed_in_period = len(items_in_period)
        
        result.append({
            "id": str(impl.id),
            "title": impl.title,
            "client": {
                "id": str(impl.client.id),
                "company_name": impl.client.company_name
            } if impl.client else None,
            "responsible_user": {
                "id": str(impl.responsible_user.id),
                "name": impl.responsible_user.name
            } if impl.responsible_user else None,
            "total_items": total_items,
            "completed_total": completed_total,
            "completed_in_period": completed_in_period,
            "progress_percentage": impl.progress_percentage,
            "items_completed_in_period": [
                {
                    "id": str(item.id),
                    "title": item.title,
                    "category": item.category,
                    "completed_at": item.completed_at.isoformat() if item.completed_at else None,
                    "completed_by": {
                        "id": str(item.completed_by.id),
                        "name": item.completed_by.name
                    } if item.completed_by else None
                }
                for item in items_in_period
            ]
        })
    
    # Group by responsible user
    grouped = {}
    for impl in result:
        user = impl.get("responsible_user")
        user_id = user["id"] if user else "unassigned"
        user_name = user["name"] if user else "Sem Responsável"
        if user_id not in grouped:
            grouped[user_id] = {
                "user_id": user_id,
                "user_name": user_name,
                "implementations": []
            }
        grouped[user_id]["implementations"].append(impl)
    
    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "groups": list(grouped.values()),
        "total_implementations": len(result)
    }


@router.post("", response_model=ImplementationResponse, status_code=status.HTTP_201_CREATED)
async def create_implementation(
    impl_data: ImplementationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("implementations", "create"))
):
    """Create a new implementation, optionally cloning items from a checklist template."""
    # Validate client
    client = db.query(Client).filter(Client.id == impl_data.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Validate product if provided
    if impl_data.product_id:
        product = db.query(Product).filter(Product.id == impl_data.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
    
    # Create implementation
    impl_dict = impl_data.model_dump(exclude={"checklist_template_id"})
    implementation = Implementation(**impl_dict)
    db.add(implementation)
    db.flush()
    
    # Clone items from template if provided
    if impl_data.checklist_template_id:
        template = db.query(ChecklistTemplate).filter(
            ChecklistTemplate.id == impl_data.checklist_template_id
        ).first()
        if template:
            for item in template.items:
                impl_item = ImplementationItem(
                    implementation_id=implementation.id,
                    checklist_item_id=item.id,
                    category=item.category,
                    title=item.title,
                    description=item.description,
                    order=item.order,
                    estimated_hours=item.estimated_hours,
                    status=ItemStatus.PENDING
                )
                db.add(impl_item)
    
    db.commit()
    db.refresh(implementation)
    return implementation


@router.get("/{impl_id}", response_model=ImplementationResponse)
async def get_implementation(
    impl_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("implementations", "read"))
):
    """Get implementation details with items and attachments."""
    implementation = db.query(Implementation).filter(Implementation.id == impl_id).first()
    if not implementation:
        raise HTTPException(status_code=404, detail="Implementation not found")
    return implementation


@router.put("/{impl_id}", response_model=ImplementationResponse)
async def update_implementation(
    impl_id: UUID,
    impl_data: ImplementationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("implementations", "update"))
):
    """Update an implementation."""
    implementation = db.query(Implementation).filter(Implementation.id == impl_id).first()
    if not implementation:
        raise HTTPException(status_code=404, detail="Implementation not found")
    
    update_data = impl_data.model_dump(exclude_unset=True)
    
    # Convert enum to value if present
    if "status" in update_data and update_data["status"]:
        update_data["status"] = update_data["status"].value
    
    for field, value in update_data.items():
        setattr(implementation, field, value)
    
    db.commit()
    db.refresh(implementation)
    return implementation


@router.delete("/{impl_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_implementation(
    impl_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("implementations", "delete"))
):
    """Delete an implementation."""
    implementation = db.query(Implementation).filter(Implementation.id == impl_id).first()
    if not implementation:
        raise HTTPException(status_code=404, detail="Implementation not found")
    
    db.delete(implementation)
    db.commit()


# Gantt Chart endpoint
@router.get("/{impl_id}/gantt", response_model=GanttResponse)
async def get_gantt_data(
    impl_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("implementations", "read"))
):
    """Get Gantt chart data for an implementation with calculated dates based on hours.
    
    Calculates dates using:
    - 8 hours = 1 work day
    - Excludes weekends (Saturday=5, Sunday=6)
    """
    from datetime import timedelta
    
    implementation = db.query(Implementation).filter(Implementation.id == impl_id).first()
    if not implementation:
        raise HTTPException(status_code=404, detail="Implementation not found")
    
    # Get implementation start date
    impl_start = implementation.start_date or datetime.utcnow().date()
    
    # Helper function to add work days (excluding weekends)
    def add_work_days(start_date, days_to_add):
        """Add work days to a date, skipping weekends."""
        current = start_date
        days_added = 0
        while days_added < days_to_add:
            current += timedelta(days=1)
            # Skip weekends (5=Saturday, 6=Sunday)
            if current.weekday() < 5:
                days_added += 1
        return current
    
    def get_next_work_day(date):
        """Get the next work day if date falls on weekend."""
        while date.weekday() >= 5:
            date += timedelta(days=1)
        return date
    
    # Exclude cancelled items and sort by order
    items_sorted = sorted(
        [item for item in implementation.items if item.status != ItemStatus.CANCELLED],
        key=lambda x: x.order
    )
    
    HOURS_PER_DAY = 8
    gantt_items = []
    
    # Track current position in work hours
    current_hour_offset = 0
    
    for item in items_sorted:
        item_hours = item.estimated_hours or 8  # Default 8h if not set
        
        # Calculate how many work days this item spans
        # An item of 8h = 1 day, 16h = 2 days, 4h = 0.5 day (rounded up to 1)
        item_days = max(1, (item_hours + HOURS_PER_DAY - 1) // HOURS_PER_DAY)  # Ceiling division
        
        # Calculate start date based on hours offset
        start_day_offset = current_hour_offset // HOURS_PER_DAY
        
        # Calculate item start date (skip weekends)
        if start_day_offset == 0:
            item_start = get_next_work_day(impl_start)
        else:
            item_start = add_work_days(get_next_work_day(impl_start), start_day_offset)
        
        # Calculate item end date (add work days for duration)
        if item_days <= 1:
            item_end = item_start
        else:
            item_end = add_work_days(item_start, item_days - 1)
        
        # Use actual dates if manually set, otherwise use calculated
        final_start = item.start_date if item.start_date else item_start
        final_end = item.end_date if item.end_date else item_end
        
        # Calculate progress
        progress = 100.0 if item.status == ItemStatus.COMPLETED else (50.0 if item.status == ItemStatus.IN_PROGRESS else 0.0)
        
        gantt_items.append(GanttItem(
            id=item.id,
            title=item.title,
            category=item.category,
            start_date=final_start,
            end_date=final_end,
            status=item.status,
            progress=progress,
            estimated_hours=item.estimated_hours or 0
        ))
        
        # Move position forward by item hours
        current_hour_offset += item_hours
    
    # Calculate estimated end date based on total hours
    total_hours = sum(item.estimated_hours or 8 for item in items_sorted)
    total_work_days = max(1, (total_hours + HOURS_PER_DAY - 1) // HOURS_PER_DAY)
    calculated_end = add_work_days(get_next_work_day(impl_start), total_work_days - 1) if total_work_days > 0 else impl_start
    
    return GanttResponse(
        implementation_id=implementation.id,
        title=implementation.title,
        start_date=implementation.start_date,
        estimated_end_date=implementation.estimated_end_date or calculated_end,
        items=gantt_items
    )


# Implementation Items endpoints
@router.put("/{impl_id}/items/{item_id}", response_model=ImplementationItemResponse)
async def update_implementation_item(
    impl_id: UUID,
    item_id: UUID,
    item_data: ImplementationItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("implementations", "update"))
):
    """Update an implementation item (e.g., mark as completed or cancelled)."""
    item = db.query(ImplementationItem).filter(
        ImplementationItem.id == item_id,
        ImplementationItem.implementation_id == impl_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_data = item_data.model_dump(exclude_unset=True)
    
    # Handle status change
    if "status" in update_data:
        new_status = update_data["status"]
        new_status_value = new_status.value if hasattr(new_status, 'value') else new_status
        
        # Handle completion
        if new_status_value == "completed" and item.status != ItemStatus.COMPLETED:
            item.completed_at = datetime.utcnow()
            item.completed_by_id = current_user.id
        elif new_status_value != "completed":
            item.completed_at = None
            item.completed_by_id = None
        
        # Handle cancellation
        if new_status_value == "cancelled" and item.status != ItemStatus.CANCELLED:
            item.cancelled_at = datetime.utcnow()
            item.cancelled_by_id = current_user.id
        elif new_status_value != "cancelled":
            item.cancelled_at = None
            item.cancelled_by_id = None
            item.cancelled_reason = None
        
        # Use the enum directly for proper serialization
        update_data["status"] = ItemStatus(new_status_value)
    
    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    return item


# Attachments endpoints
@router.get("/{impl_id}/attachments", response_model=list[ImplementationAttachmentResponse])
async def list_attachments(
    impl_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("implementations", "read"))
):
    """List attachments for an implementation."""
    implementation = db.query(Implementation).filter(Implementation.id == impl_id).first()
    if not implementation:
        raise HTTPException(status_code=404, detail="Implementation not found")
    
    return implementation.attachments


@router.post("/{impl_id}/attachments", response_model=ImplementationAttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    impl_id: UUID,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    attachment_type: AttachmentTypeEnum = Form(AttachmentTypeEnum.OTHER),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("implementations", "update"))
):
    """Upload an attachment for an implementation."""
    implementation = db.query(Implementation).filter(Implementation.id == impl_id).first()
    if not implementation:
        raise HTTPException(status_code=404, detail="Implementation not found")
    
    # Create directory for this implementation
    impl_dir = os.path.join(UPLOAD_DIR, str(impl_id))
    os.makedirs(impl_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(impl_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get file info
    file_size = os.path.getsize(file_path)
    
    # Create attachment record
    attachment = ImplementationAttachment(
        implementation_id=impl_id,
        uploaded_by_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        file_type=file.content_type,
        file_size=file_size,
        description=description,
        attachment_type=attachment_type.value
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    
    return attachment


@router.delete("/{impl_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    impl_id: UUID,
    attachment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("implementations", "update"))
):
    """Delete an attachment."""
    attachment = db.query(ImplementationAttachment).filter(
        ImplementationAttachment.id == attachment_id,
        ImplementationAttachment.implementation_id == impl_id
    ).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Delete file
    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)
    
    db.delete(attachment)
    db.commit()
