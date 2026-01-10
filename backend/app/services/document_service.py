"""Document generation service for processing Word templates."""
import os
import re
import uuid
import subprocess
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

from docxtpl import DocxTemplate
from sqlalchemy.orm import Session

from app.models.implementation import Implementation
from app.models.client import Client
from app.models.product import Product
from app.models.user import User


class DocumentService:
    """Service for processing document templates and generating filled documents."""
    
    # Available placeholders with descriptions
    AVAILABLE_PLACEHOLDERS = {
        "cliente_nome": {
            "description": "Nome do cliente",
            "example": "Empresa ABC Ltda"
        },
        "cliente_cnpj": {
            "description": "CNPJ do cliente",
            "example": "12.345.678/0001-90"
        },
        "cliente_endereco": {
            "description": "Endereço completo do cliente",
            "example": "Rua das Flores, 123 - Centro"
        },
        "cliente_cidade": {
            "description": "Cidade do cliente",
            "example": "São Paulo"
        },
        "cliente_estado": {
            "description": "Estado do cliente",
            "example": "SP"
        },
        "cliente_telefone": {
            "description": "Telefone do cliente",
            "example": "(11) 1234-5678"
        },
        "cliente_email": {
            "description": "E-mail do cliente",
            "example": "contato@empresa.com.br"
        },
        "produto_nome": {
            "description": "Nome do produto",
            "example": "Questor Empresarial"
        },
        "produto_versao": {
            "description": "Versão do produto",
            "example": "2.5.0"
        },
        "tecnico_responsavel": {
            "description": "Nome do técnico responsável pela implantação",
            "example": "João Silva"
        },
        "tecnico_email": {
            "description": "E-mail do técnico responsável",
            "example": "joao.silva@acesso.com.br"
        },
        "implantacao_titulo": {
            "description": "Título da implantação",
            "example": "Implantação Questor - Empresa ABC"
        },
        "implantacao_descricao": {
            "description": "Descrição da implantação",
            "example": "Implantação do módulo financeiro"
        },
        "data_inicio": {
            "description": "Data de início da implantação",
            "example": "07/01/2026"
        },
        "data_fim_prevista": {
            "description": "Data prevista para término",
            "example": "07/02/2026"
        },
        "data_fim_real": {
            "description": "Data real de término (se concluída)",
            "example": "05/02/2026"
        },
        "data_atual": {
            "description": "Data atual (geração do documento)",
            "example": "07/01/2026"
        },
        "hora_atual": {
            "description": "Hora atual (geração do documento)",
            "example": "14:30"
        },
        "progresso": {
            "description": "Percentual de progresso da implantação",
            "example": "75%"
        },
        "status": {
            "description": "Status da implantação",
            "example": "Em andamento"
        },
        "observacoes": {
            "description": "Observações/notas da implantação",
            "example": "Cliente solicitou treinamento adicional"
        },
    }
    
    # Status translations
    STATUS_TRANSLATIONS = {
        "pending": "Pendente",
        "in_progress": "Em andamento",
        "completed": "Concluída",
        "cancelled": "Cancelada"
    }
    
    def __init__(self, templates_dir: str = "templates"):
        """Initialize the document service.
        
        Args:
            templates_dir: Directory where template files are stored
        """
        self.templates_dir = Path(templates_dir)
        self.templates_dir.mkdir(parents=True, exist_ok=True)
    
    def get_available_placeholders(self) -> List[Dict[str, str]]:
        """Get list of all available placeholders with descriptions.
        
        Returns:
            List of placeholder info dictionaries
        """
        # Field placeholders
        field_placeholders = [
            {
                "name": name,
                "description": info["description"],
                "example": info.get("example"),
                "category": "Campo"
            }
            for name, info in self.AVAILABLE_PLACEHOLDERS.items()
        ]
        
        # Function/syntax placeholders (Jinja2/docxtpl)
        function_placeholders = [
            {
                "name": "{% for item in items %}...{% endfor %}",
                "description": "Loop para iterar sobre listas (ex: itens do checklist)",
                "example": "{% for item in checklist_items %}{{ item.title }}{% endfor %}",
                "category": "Função"
            },
            {
                "name": "{% if condição %}...{% endif %}",
                "description": "Condicional - exibe conteúdo apenas se condição for verdadeira",
                "example": "{% if cliente_cnpj %}CNPJ: {{ cliente_cnpj }}{% endif %}",
                "category": "Função"
            },
            {
                "name": "{% if ... %}...{% else %}...{% endif %}",
                "description": "Condicional com alternativa",
                "example": "{% if progresso == '100%' %}Concluído{% else %}Em andamento{% endif %}",
                "category": "Função"
            },
            {
                "name": "{{ variavel|upper }}",
                "description": "Filtro - converte texto para maiúsculas",
                "example": "{{ cliente_nome|upper }}",
                "category": "Filtro"
            },
            {
                "name": "{{ variavel|lower }}",
                "description": "Filtro - converte texto para minúsculas",
                "example": "{{ cliente_email|lower }}",
                "category": "Filtro"
            },
            {
                "name": "{{ variavel|default('valor') }}",
                "description": "Filtro - valor padrão se variável estiver vazia",
                "example": "{{ observacoes|default('Sem observações') }}",
                "category": "Filtro"
            },
            {
                "name": "{%tr for item in items %}...{%tr endfor %}",
                "description": "Loop em linhas de tabela Word (repete a linha inteira)",
                "example": "{%tr for item in checklist_items %}{{ item.title }}{%tr endfor %}",
                "category": "Tabela"
            },
            {
                "name": "{%tc for col in cols %}...{%tc endfor %}",
                "description": "Loop em colunas de tabela Word",
                "example": "{%tc for col in colunas %}{{ col.valor }}{%tc endfor %}",
                "category": "Tabela"
            },
            {
                "name": "checklist_items",
                "description": "Lista de itens do checklist da implantação",
                "example": "Cada item tem: title, category, status, completed_at",
                "category": "Lista"
            },
            {
                "name": "item.title",
                "description": "Título do item do checklist (dentro do loop)",
                "example": "Configurar parâmetros fiscais",
                "category": "Lista"
            },
            {
                "name": "item.category",
                "description": "Categoria do item do checklist",
                "example": "Fiscal",
                "category": "Lista"
            },
            {
                "name": "item.status",
                "description": "Status do item (pending, in_progress, completed, cancelled)",
                "example": "completed",
                "category": "Lista"
            },
        ]
        
        return field_placeholders + function_placeholders
    
    def extract_placeholders_from_template(self, template_path: str) -> List[str]:
        """Extract placeholder names from a Word template.
        
        Args:
            template_path: Path to the .docx template file
            
        Returns:
            List of placeholder names found in the template
        """
        try:
            doc = DocxTemplate(template_path)
            # Get undeclared template variables
            variables = doc.get_undeclared_template_variables()
            return list(variables)
        except Exception as e:
            print(f"Error extracting placeholders: {e}")
            return []
    
    def build_context_from_implementation(
        self, 
        implementation: Implementation,
        db: Session
    ) -> Dict[str, Any]:
        """Build template context dictionary from implementation data.
        
        Args:
            implementation: The implementation model instance
            db: Database session
            
        Returns:
            Dictionary with all placeholder values
        """
        context = {}
        now = datetime.now()
        
        # Date and time
        context["data_atual"] = now.strftime("%d/%m/%Y")
        context["hora_atual"] = now.strftime("%H:%M")
        
        # Implementation data
        context["implantacao_titulo"] = implementation.title or ""
        context["implantacao_descricao"] = implementation.description or ""
        context["observacoes"] = implementation.notes or ""
        context["progresso"] = f"{implementation.progress_percentage:.1f}%"
        context["status"] = self.STATUS_TRANSLATIONS.get(
            implementation.status.value if implementation.status else "pending",
            "Pendente"
        )
        
        # Dates
        if implementation.start_date:
            context["data_inicio"] = implementation.start_date.strftime("%d/%m/%Y")
        else:
            context["data_inicio"] = ""
            
        if implementation.estimated_end_date:
            context["data_fim_prevista"] = implementation.estimated_end_date.strftime("%d/%m/%Y")
        else:
            context["data_fim_prevista"] = ""
            
        if implementation.actual_end_date:
            context["data_fim_real"] = implementation.actual_end_date.strftime("%d/%m/%Y")
        else:
            context["data_fim_real"] = ""
        
        # Client data
        if implementation.client:
            client = implementation.client
            context["cliente_nome"] = client.company_name or ""
            context["cliente_cnpj"] = client.cnpj or ""
            context["cliente_endereco"] = client.address or ""
            context["cliente_cidade"] = client.city or ""
            context["cliente_estado"] = client.state or ""
            context["cliente_telefone"] = client.phone or ""
            context["cliente_email"] = client.email or ""
        else:
            # Empty client fields
            for key in ["cliente_nome", "cliente_cnpj", "cliente_endereco", 
                       "cliente_cidade", "cliente_estado", "cliente_telefone", "cliente_email"]:
                context[key] = ""
        
        # Product data
        if implementation.product:
            product = implementation.product
            context["produto_nome"] = product.name or ""
            context["produto_versao"] = product.version or ""
        else:
            context["produto_nome"] = ""
            context["produto_versao"] = ""
        
        # Responsible user data
        if implementation.responsible_user:
            user = implementation.responsible_user
            context["tecnico_responsavel"] = user.name or ""
            context["tecnico_email"] = user.email or ""
        else:
            context["tecnico_responsavel"] = ""
            context["tecnico_email"] = ""
        
        return context
    
    def generate_document(
        self,
        template_path: str,
        context: Dict[str, Any],
        output_filename: Optional[str] = None
    ) -> str:
        """Generate a filled document from a template.
        
        Args:
            template_path: Path to the .docx template file
            context: Dictionary with placeholder values
            output_filename: Optional custom output filename
            
        Returns:
            Path to the generated document
        """
        # Load template
        doc = DocxTemplate(template_path)
        
        # Render with context
        doc.render(context)
        
        # Generate output path
        if output_filename is None:
            output_filename = f"generated_{uuid.uuid4().hex[:8]}.docx"
        
        output_path = self.templates_dir / "generated" / output_filename
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save generated document
        doc.save(str(output_path))
        
        return str(output_path)
    
    def convert_to_pdf(self, docx_path: str) -> Optional[str]:
        """Convert a Word document to PDF using LibreOffice.
        
        Args:
            docx_path: Path to the .docx file
            
        Returns:
            Path to the generated PDF, or None if conversion failed
        """
        try:
            docx_path = Path(docx_path)
            output_dir = docx_path.parent
            
            # Try LibreOffice conversion
            result = subprocess.run(
                [
                    "soffice",
                    "--headless",
                    "--convert-to", "pdf",
                    "--outdir", str(output_dir),
                    str(docx_path)
                ],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                pdf_path = output_dir / f"{docx_path.stem}.pdf"
                if pdf_path.exists():
                    return str(pdf_path)
            
            print(f"LibreOffice conversion error: {result.stderr}")
            return None
            
        except FileNotFoundError:
            print("LibreOffice not found. PDF conversion not available.")
            return None
        except subprocess.TimeoutExpired:
            print("PDF conversion timed out")
            return None
        except Exception as e:
            print(f"Error converting to PDF: {e}")
            return None
    
    def save_uploaded_template(
        self, 
        file_content: bytes, 
        original_filename: str
    ) -> str:
        """Save an uploaded template file.
        
        Args:
            file_content: The file content bytes
            original_filename: Original filename from upload
            
        Returns:
            Path where the file was saved
        """
        # Generate unique filename
        file_id = uuid.uuid4().hex[:12]
        extension = Path(original_filename).suffix
        new_filename = f"template_{file_id}{extension}"
        
        file_path = self.templates_dir / new_filename
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        return str(file_path)
    
    def delete_template_file(self, file_path: str) -> bool:
        """Delete a template file from disk.
        
        Args:
            file_path: Path to the file to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False


# Global service instance
document_service = DocumentService()
