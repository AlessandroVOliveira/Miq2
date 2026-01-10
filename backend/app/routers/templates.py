"""Templates router for document template management."""
import os
import shutil
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session, joinedload
import io

from app.database import get_db
from app.models import DocumentTemplate, TemplateType, Product, User, Implementation
from app.schemas.document_template import (
    DocumentTemplateCreate,
    DocumentTemplateUpdate,
    DocumentTemplateResponse,
    DocumentTemplateListResponse,
    PlaceholderInfo,
    AvailablePlaceholdersResponse,
)
from app.middleware.auth import get_current_active_user, require_permission
from app.services.document_service import document_service

router = APIRouter(prefix="/templates", tags=["Document Templates"])

# Templates storage directory
TEMPLATES_DIR = os.environ.get("TEMPLATES_DIR", "/app/templates")
os.makedirs(TEMPLATES_DIR, exist_ok=True)
os.makedirs(os.path.join(TEMPLATES_DIR, "generated"), exist_ok=True)


# ==================== Placeholders ====================

@router.get("/placeholders", response_model=AvailablePlaceholdersResponse)
async def list_placeholders(
    current_user: User = Depends(get_current_active_user)
):
    """List all available placeholders that can be used in templates."""
    placeholders = document_service.get_available_placeholders()
    return AvailablePlaceholdersResponse(
        placeholders=[PlaceholderInfo(**p) for p in placeholders]
    )


# ==================== Template Types ====================

@router.get("/types")
async def list_template_types(
    current_user: User = Depends(get_current_active_user)
):
    """List all available template types."""
    return [
        {"value": TemplateType.OPENING_TERM.value, "label": "Termo de Abertura"},
        {"value": TemplateType.CLOSING_TERM.value, "label": "Termo de Encerramento"},
        {"value": TemplateType.PROGRESS_REPORT.value, "label": "Relatório de Progresso"},
        {"value": TemplateType.OTHER.value, "label": "Outro"},
    ]


# ==================== Templates CRUD ====================

@router.get("", response_model=List[DocumentTemplateListResponse])
async def list_templates(
    template_type: Optional[str] = None,
    product_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all document templates."""
    query = db.query(DocumentTemplate)
    
    if template_type:
        query = query.filter(DocumentTemplate.template_type == template_type)
    
    if is_active is not None:
        query = query.filter(DocumentTemplate.is_active == is_active)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (DocumentTemplate.name.ilike(search_term)) |
            (DocumentTemplate.description.ilike(search_term))
        )
    
    if product_id:
        query = query.join(DocumentTemplate.products).filter(Product.id == product_id)
    
    templates = query.order_by(DocumentTemplate.name).all()
    
    result = []
    for t in templates:
        result.append(DocumentTemplateListResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            template_type=t.template_type,
            original_filename=t.original_filename,
            placeholders=t.placeholders or [],
            is_active=t.is_active,
            created_at=t.created_at,
            product_count=len(t.products)
        ))
    
    return result


@router.get("/by-product/{product_id}", response_model=List[DocumentTemplateListResponse])
async def list_templates_by_product(
    product_id: UUID,
    template_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List templates associated with a specific product."""
    query = db.query(DocumentTemplate).join(DocumentTemplate.products).filter(
        Product.id == product_id,
        DocumentTemplate.is_active == True
    )
    
    if template_type:
        query = query.filter(DocumentTemplate.template_type == template_type)
    
    templates = query.order_by(DocumentTemplate.name).all()
    
    result = []
    for t in templates:
        result.append(DocumentTemplateListResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            template_type=t.template_type,
            original_filename=t.original_filename,
            placeholders=t.placeholders or [],
            is_active=t.is_active,
            created_at=t.created_at,
            product_count=len(t.products)
        ))
    
    return result


@router.get("/{template_id}", response_model=DocumentTemplateResponse)
async def get_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific template by ID."""
    template = db.query(DocumentTemplate).options(
        joinedload(DocumentTemplate.products)
    ).filter(DocumentTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    return template


@router.post("", response_model=DocumentTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: Optional[str] = Form(None),
    template_type: str = Form("other"),
    product_ids: Optional[str] = Form(None),  # Comma-separated UUIDs
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("templates", "create"))
):
    """Create a new document template by uploading a .docx file."""
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.docx'):
        raise HTTPException(
            status_code=400,
            detail="Apenas arquivos .docx são suportados"
        )
    
    # Read file content
    file_content = await file.read()
    
    # Save file
    file_path = document_service.save_uploaded_template(file_content, file.filename)
    
    # Extract placeholders from template
    placeholders = document_service.extract_placeholders_from_template(file_path)
    
    # Create database record
    template = DocumentTemplate(
        name=name,
        description=description,
        template_type=template_type,
        file_path=file_path,
        original_filename=file.filename,
        placeholders=placeholders,
        is_active=True
    )
    
    # Associate with products
    if product_ids:
        product_uuid_list = [UUID(pid.strip()) for pid in product_ids.split(",") if pid.strip()]
        products = db.query(Product).filter(Product.id.in_(product_uuid_list)).all()
        template.products = products
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return template


@router.put("/{template_id}", response_model=DocumentTemplateResponse)
async def update_template(
    template_id: UUID,
    data: DocumentTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("templates", "update"))
):
    """Update a template's metadata."""
    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Handle product associations separately
    if "product_ids" in update_data:
        product_ids = update_data.pop("product_ids")
        if product_ids is not None:
            products = db.query(Product).filter(Product.id.in_(product_ids)).all()
            template.products = products
    
    for field, value in update_data.items():
        setattr(template, field, value)
    
    db.commit()
    db.refresh(template)
    
    return template


@router.put("/{template_id}/file", response_model=DocumentTemplateResponse)
async def update_template_file(
    template_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("templates", "update"))
):
    """Replace the template file while keeping metadata."""
    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.docx'):
        raise HTTPException(
            status_code=400,
            detail="Apenas arquivos .docx são suportados"
        )
    
    # Delete old file
    if template.file_path:
        document_service.delete_template_file(template.file_path)
    
    # Read and save new file
    file_content = await file.read()
    new_file_path = document_service.save_uploaded_template(file_content, file.filename)
    
    # Extract new placeholders
    placeholders = document_service.extract_placeholders_from_template(new_file_path)
    
    # Update template
    template.file_path = new_file_path
    template.original_filename = file.filename
    template.placeholders = placeholders
    
    db.commit()
    db.refresh(template)
    
    return template


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("templates", "delete"))
):
    """Delete a template."""
    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    # Delete file from disk
    if template.file_path:
        document_service.delete_template_file(template.file_path)
    
    db.delete(template)
    db.commit()


# ==================== Template Download ====================

@router.get("/{template_id}/download")
async def download_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Download the original template file."""
    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    if not os.path.exists(template.file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no servidor")
    
    return FileResponse(
        path=template.file_path,
        filename=template.original_filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


# ==================== Document Generation ====================

@router.post("/{template_id}/generate/{implementation_id}")
async def generate_document(
    template_id: UUID,
    implementation_id: UUID,
    format: str = Query("docx", regex="^(docx|pdf)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate a filled document from a template for a specific implementation."""
    # Get template
    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    if not os.path.exists(template.file_path):
        raise HTTPException(status_code=404, detail="Arquivo de template não encontrado")
    
    # Get implementation with related data
    implementation = db.query(Implementation).options(
        joinedload(Implementation.client),
        joinedload(Implementation.product),
        joinedload(Implementation.responsible_user)
    ).filter(Implementation.id == implementation_id).first()
    
    if not implementation:
        raise HTTPException(status_code=404, detail="Implantação não encontrada")
    
    # Build context from implementation data
    context = document_service.build_context_from_implementation(implementation, db)
    
    # Generate output filename
    client_name = implementation.client.company_name if implementation.client else "cliente"
    safe_client_name = "".join(c for c in client_name if c.isalnum() or c in (' ', '-', '_')).strip()[:30]
    output_filename = f"{template.name}_{safe_client_name}.docx"
    
    # Generate document
    try:
        generated_path = document_service.generate_document(
            template.file_path,
            context,
            output_filename
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar documento: {str(e)}"
        )
    
    # Convert to PDF if requested
    if format == "pdf":
        pdf_path = document_service.convert_to_pdf(generated_path)
        if pdf_path and os.path.exists(pdf_path):
            # Clean up docx
            os.remove(generated_path)
            
            return FileResponse(
                path=pdf_path,
                filename=output_filename.replace(".docx", ".pdf"),
                media_type="application/pdf"
            )
        else:
            # PDF conversion failed, return docx with warning header
            response = FileResponse(
                path=generated_path,
                filename=output_filename,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            )
            response.headers["X-PDF-Conversion-Failed"] = "true"
            return response
    
    # Return docx
    return FileResponse(
        path=generated_path,
        filename=output_filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


@router.post("/{template_id}/preview")
async def preview_document(
    template_id: UUID,
    implementation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Preview the context data that would be used to fill the template."""
    # Get template
    template = db.query(DocumentTemplate).filter(DocumentTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    
    # Get implementation with related data
    implementation = db.query(Implementation).options(
        joinedload(Implementation.client),
        joinedload(Implementation.product),
        joinedload(Implementation.responsible_user)
    ).filter(Implementation.id == implementation_id).first()
    
    if not implementation:
        raise HTTPException(status_code=404, detail="Implantação não encontrada")
    
    # Build and return context
    context = document_service.build_context_from_implementation(implementation, db)
    
    return {
        "template": {
            "id": str(template.id),
            "name": template.name,
            "placeholders": template.placeholders
        },
        "context": context,
        "implementation": {
            "id": str(implementation.id),
            "title": implementation.title
        }
    }
