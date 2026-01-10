"""Products router for ERP product management."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Product, ChecklistTemplate, ProductChecklist
from app.schemas.product import (
    ProductCreate, ProductUpdate, ProductResponse, 
    ProductListResponse, ProductChecklistCreate
)
from app.middleware.auth import get_current_active_user, require_permission
from app.models.user import User

router = APIRouter(prefix="/products", tags=["Products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products", "read"))
):
    """List products with pagination and filters."""
    query = db.query(Product)
    
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    
    total = query.count()
    products = query.order_by(Product.name).offset((page - 1) * size).limit(size).all()
    
    return ProductListResponse(items=products, total=total, page=page, size=size)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products", "create"))
):
    """Create a new product."""
    product = Product(**product_data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products", "read"))
):
    """Get a product by ID."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products", "update"))
):
    """Update a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products", "delete"))
):
    """Delete a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)
    db.commit()


@router.post("/{product_id}/checklists", response_model=ProductResponse)
async def add_checklist_to_product(
    product_id: UUID,
    checklist_data: ProductChecklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products", "update"))
):
    """Associate a checklist template with a product."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    template = db.query(ChecklistTemplate).filter(
        ChecklistTemplate.id == checklist_data.template_id
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Checklist template not found")
    
    # Check if already associated
    existing = db.query(ProductChecklist).filter(
        ProductChecklist.product_id == product_id,
        ProductChecklist.template_id == checklist_data.template_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Checklist already associated")
    
    # If setting as default, remove default from others
    if checklist_data.is_default:
        db.query(ProductChecklist).filter(
            ProductChecklist.product_id == product_id,
            ProductChecklist.is_default == True
        ).update({"is_default": False})
    
    association = ProductChecklist(
        product_id=product_id,
        template_id=checklist_data.template_id,
        is_default=checklist_data.is_default
    )
    db.add(association)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}/checklists/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_checklist_from_product(
    product_id: UUID,
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("products", "update"))
):
    """Remove a checklist association from a product."""
    association = db.query(ProductChecklist).filter(
        ProductChecklist.product_id == product_id,
        ProductChecklist.template_id == template_id
    ).first()
    if not association:
        raise HTTPException(status_code=404, detail="Association not found")
    
    db.delete(association)
    db.commit()
