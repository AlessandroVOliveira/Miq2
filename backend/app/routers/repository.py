"""Repository router for file management."""
import os
import uuid
import shutil
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FileCategory, RepositoryFile, User
from app.schemas.repository import (
    FileCategoryCreate, FileCategoryUpdate, FileCategoryResponse, FileCategoryTree,
    RepositoryFileCreate, RepositoryFileUpdate, RepositoryFileResponse,
    RepositoryFileListResponse, RepositoryFileListItem
)
from app.middleware.auth import get_current_active_user, require_permission

router = APIRouter(prefix="/repository", tags=["Repository"])

# File storage configuration
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads/repository")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ==================== File Categories ====================

@router.get("/categories", response_model=list[FileCategoryResponse])
async def list_categories(
    parent_id: Optional[UUID] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("repository", "read"))
):
    """List file categories."""
    query = db.query(FileCategory)
    
    if parent_id:
        query = query.filter(FileCategory.parent_id == parent_id)
    else:
        query = query.filter(FileCategory.parent_id.is_(None))
    
    if not include_inactive:
        query = query.filter(FileCategory.is_active == True)
    
    # Non-superusers can only see categories from their teams
    if not current_user.is_superuser:
        user_team_ids = [team.id for team in current_user.teams]
        if not user_team_ids:
            return []  # User has no teams, return empty list
        query = query.filter(FileCategory.team_id.in_(user_team_ids))
    
    return query.order_by(FileCategory.name).all()


@router.get("/categories/tree", response_model=list[FileCategoryTree])
async def get_category_tree(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("repository", "read"))
):
    """Get full category tree."""
    user_team_ids = [team.id for team in current_user.teams] if not current_user.is_superuser else None
    
    def build_tree(parent_id: Optional[UUID] = None) -> list[FileCategoryTree]:
        query = db.query(FileCategory).filter(
            FileCategory.parent_id == parent_id if parent_id else FileCategory.parent_id.is_(None),
            FileCategory.is_active == True
        )
        
        # Apply team filter for non-superusers
        if user_team_ids is not None:
            if not user_team_ids:
                return []  # User has no teams, return empty list
            query = query.filter(FileCategory.team_id.in_(user_team_ids))
        
        categories = query.order_by(FileCategory.name).all()
        
        result = []
        for cat in categories:
            file_count = db.query(RepositoryFile).filter(RepositoryFile.category_id == cat.id).count()
            tree_item = FileCategoryTree(
                id=cat.id, name=cat.name, description=cat.description,
                parent_id=cat.parent_id, team_id=cat.team_id,
                is_active=cat.is_active, created_at=cat.created_at, updated_at=cat.updated_at,
                children=build_tree(cat.id), file_count=file_count
            )
            result.append(tree_item)
        return result
    
    return build_tree()


@router.post("/categories", response_model=FileCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: FileCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("repository", "create"))
):
    """Create a file category."""
    # Get the user's primary team (first team they belong to)
    if not current_user.is_superuser:
        if not current_user.teams:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Você precisa pertencer a uma equipe para criar categorias"
            )
        # Use the team from the request, or default to user's first team
        category_data = data.model_dump()
        if not category_data.get('team_id'):
            category_data['team_id'] = current_user.teams[0].id
        else:
            # Verify user belongs to the specified team
            user_team_ids = [team.id for team in current_user.teams]
            if category_data['team_id'] not in user_team_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Você só pode criar categorias para sua própria equipe"
                )
        category = FileCategory(**category_data)
    else:
        category = FileCategory(**data.model_dump())
    
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=FileCategoryResponse)
async def update_category(
    category_id: UUID,
    data: FileCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "update"))
):
    """Update a file category."""
    category = db.query(FileCategory).filter(FileCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("repository", "delete"))
):
    """Delete a file category."""
    category = db.query(FileCategory).filter(FileCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check for files in category
    file_count = db.query(RepositoryFile).filter(RepositoryFile.category_id == category_id).count()
    if file_count > 0:
        raise HTTPException(status_code=400, detail=f"Não é possível excluir: categoria contém {file_count} arquivo(s)")
    
    # Check for subcategories
    subcategory_count = db.query(FileCategory).filter(FileCategory.parent_id == category_id).count()
    if subcategory_count > 0:
        raise HTTPException(status_code=400, detail=f"Não é possível excluir: categoria contém {subcategory_count} subcategoria(s)")
    
    db.delete(category)
    db.commit()


# ==================== Files ====================

@router.get("/files", response_model=RepositoryFileListResponse)
async def list_files(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    category_id: Optional[UUID] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("repository", "read"))
):
    """List repository files."""
    query = db.query(RepositoryFile)
    
    # Non-superusers can only see files from their teams' categories
    if not current_user.is_superuser:
        user_team_ids = [team.id for team in current_user.teams]
        if not user_team_ids:
            # User has no teams, return empty result
            return RepositoryFileListResponse(items=[], total=0, page=page, size=size)
        # Join with category to filter by team
        query = query.join(FileCategory, RepositoryFile.category_id == FileCategory.id)
        query = query.filter(FileCategory.team_id.in_(user_team_ids))
    
    if category_id:
        query = query.filter(RepositoryFile.category_id == category_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (RepositoryFile.filename.ilike(search_term)) |
            (RepositoryFile.original_filename.ilike(search_term)) |
            (RepositoryFile.description.ilike(search_term)) |
            (RepositoryFile.tags.ilike(search_term))
        )
    
    total = query.count()
    files = query.order_by(RepositoryFile.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    items = [RepositoryFileListItem(
        id=f.id, filename=f.filename, original_filename=f.original_filename,
        file_size=f.file_size, mime_type=f.mime_type, category_id=f.category_id,
        description=f.description, tags=f.tags, version=f.version, uploaded_by=f.uploaded_by,
        download_count=f.download_count, created_at=f.created_at
    ) for f in files]
    
    return RepositoryFileListResponse(items=items, total=total, page=page, size=size)


@router.post("/files", response_model=RepositoryFileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    category_id: Optional[str] = Form(None),
    is_public: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("repository", "create"))
):
    """Upload a file to repository."""
    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size = os.path.getsize(file_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    
    # Create database record
    repo_file = RepositoryFile(
        filename=unique_filename,
        original_filename=file.filename or "unknown",
        file_path=file_path,
        file_size=file_size,
        mime_type=file.content_type,
        description=description,
        tags=tags,
        category_id=UUID(category_id) if category_id else None,
        is_public=is_public,
        uploaded_by_id=current_user.id
    )
    db.add(repo_file)
    db.commit()
    db.refresh(repo_file)
    return repo_file


@router.get("/files/{file_id}", response_model=RepositoryFileResponse)
async def get_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """Get file details."""
    file = db.query(RepositoryFile).filter(RepositoryFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return file


@router.get("/files/{file_id}/download")
async def download_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "read"))
):
    """Download a file."""
    file = db.query(RepositoryFile).filter(RepositoryFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    if not os.path.exists(file.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    # Increment download count
    file.download_count += 1
    db.commit()
    
    return FileResponse(
        path=file.file_path,
        filename=file.original_filename,
        media_type=file.mime_type
    )


@router.put("/files/{file_id}", response_model=RepositoryFileResponse)
async def update_file(
    file_id: UUID,
    data: RepositoryFileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "update"))
):
    """Update file metadata."""
    file = db.query(RepositoryFile).filter(RepositoryFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(file, field, value)
    db.commit()
    db.refresh(file)
    return file


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("tasks", "delete"))
):
    """Delete a file."""
    file = db.query(RepositoryFile).filter(RepositoryFile.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete physical file
    if os.path.exists(file.file_path):
        try:
            os.remove(file.file_path)
        except Exception:
            pass  # File may already be deleted
    
    db.delete(file)
    db.commit()
