"""Chat Pydantic schemas."""
from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum


# ==================== Enums ====================

class ConnectionStatusEnum(str, Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    QRCODE = "qrcode"


class ConnectionTypeEnum(str, Enum):
    BAILEYS = "WHATSAPP-BAILEYS"
    BUSINESS = "WHATSAPP-BUSINESS"


class ChatStatusEnum(str, Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"


# ==================== Chat Config ====================

class ChatConfigBase(BaseModel):
    """Base chat config schema."""
    instance_name: str = Field(..., min_length=3, max_length=100)
    connection_type: ConnectionTypeEnum = ConnectionTypeEnum.BAILEYS


class ChatConfigCreate(ChatConfigBase):
    """Schema for creating chat config."""
    token: Optional[str] = None  # Required for Business API
    number: Optional[str] = None  # Required for Business API


class ChatConfigResponse(ChatConfigBase):
    """Schema for chat config response."""
    id: UUID
    instance_id: Optional[str] = None
    connection_status: ConnectionStatusEnum
    phone_number: Optional[str] = None
    qrcode_base64: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QRCodeResponse(BaseModel):
    """Schema for QR code response."""
    code: Optional[str] = None
    base64: Optional[str] = None
    status: ConnectionStatusEnum


class ConnectionStateResponse(BaseModel):
    """Schema for connection state response."""
    instance: str
    state: str
    status: ConnectionStatusEnum


# ==================== Chat Contact ====================

class ChatContactBase(BaseModel):
    """Base chat contact schema."""
    remote_jid: str
    push_name: Optional[str] = None
    custom_name: Optional[str] = None
    phone_number: Optional[str] = None
    profile_picture_url: Optional[str] = None


class ChatContactCreate(ChatContactBase):
    """Schema for creating chat contact."""
    pass


class ChatContactUpdate(BaseModel):
    """Schema for updating chat contact."""
    custom_name: Optional[str] = None


class ChatContactResponse(ChatContactBase):
    """Schema for chat contact response."""
    id: UUID
    display_name: Optional[str] = None
    first_contact_at: datetime
    last_contact_at: datetime

    class Config:
        from_attributes = True


# ==================== Chat ====================

class ChatBase(BaseModel):
    """Base chat schema."""
    contact_id: UUID
    team_id: Optional[UUID] = None


class ChatCreate(ChatBase):
    """Schema for creating chat."""
    pass


class ChatUpdate(BaseModel):
    """Schema for updating chat."""
    team_id: Optional[UUID] = None
    assigned_user_id: Optional[UUID] = None
    classification: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=10)
    closing_comments: Optional[str] = None


class ChatTransfer(BaseModel):
    """Schema for transferring chat."""
    target_team_id: UUID
    target_user_id: Optional[UUID] = None


class ChatClose(BaseModel):
    """Schema for closing chat."""
    classification: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=10)
    closing_comments: Optional[str] = None


class ChatResponse(BaseModel):
    """Schema for chat response."""
    id: UUID
    protocol: str
    contact: Optional[ChatContactResponse] = None
    status: ChatStatusEnum
    team_id: Optional[UUID] = None
    assigned_user_id: Optional[UUID] = None
    classification: Optional[str] = None
    rating: Optional[int] = None
    closing_comments: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatListResponse(BaseModel):
    """Schema for paginated chat list."""
    items: List[ChatResponse]
    total: int
    page: int
    size: int


# ==================== Chat Message ====================

class ChatMessageBase(BaseModel):
    """Base chat message schema."""
    message_type: str = "text"
    content: Optional[str] = None
    media_url: Optional[str] = None


class SendTextMessage(BaseModel):
    """Schema for sending text message."""
    text: str
    quoted_message_id: Optional[str] = None


class SendMediaMessage(BaseModel):
    """Schema for sending media message."""
    media_type: str = Field(..., pattern="^(image|video|audio|document)$")
    media_url: str
    caption: Optional[str] = None
    filename: Optional[str] = None


class ChatMessageResponse(BaseModel):
    """Schema for chat message response."""
    id: UUID
    chat_id: UUID
    message_id: str
    remote_jid: str
    from_me: bool
    message_type: str
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_mimetype: Optional[str] = None
    media_filename: Optional[str] = None
    quoted_message_id: Optional[str] = None
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True


# ==================== Quick Reply ====================

class QuickReplyBase(BaseModel):
    """Base quick reply schema."""
    title: str = Field(..., min_length=2, max_length=100)
    content: str
    shortcut: Optional[str] = Field(None, max_length=20)
    team_id: Optional[UUID] = None


class QuickReplyCreate(QuickReplyBase):
    """Schema for creating quick reply."""
    pass


class QuickReplyUpdate(BaseModel):
    """Schema for updating quick reply."""
    title: Optional[str] = Field(None, min_length=2, max_length=100)
    content: Optional[str] = None
    shortcut: Optional[str] = Field(None, max_length=20)
    team_id: Optional[UUID] = None
    is_active: Optional[bool] = None


class QuickReplyResponse(QuickReplyBase):
    """Schema for quick reply response."""
    id: UUID
    created_by_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Chat Classification ====================

class ChatClassificationBase(BaseModel):
    """Base chat classification schema."""
    name: str = Field(..., min_length=2, max_length=100)
    color: str = Field(default="#6B7280", pattern="^#[0-9A-Fa-f]{6}$")


class ChatClassificationCreate(ChatClassificationBase):
    """Schema for creating chat classification."""
    pass


class ChatClassificationUpdate(BaseModel):
    """Schema for updating chat classification."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    is_active: Optional[bool] = None


class ChatClassificationResponse(ChatClassificationBase):
    """Schema for chat classification response."""
    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Chatbot Config ====================

class MenuOption(BaseModel):
    """Menu option for chatbot."""
    option: str
    text: str
    team_id: Optional[UUID] = None


class BusinessHours(BaseModel):
    """Business hours for a day."""
    start: str = Field(..., pattern="^[0-2][0-9]:[0-5][0-9]$")
    end: str = Field(..., pattern="^[0-2][0-9]:[0-5][0-9]$")


class ChatbotConfigBase(BaseModel):
    """Base chatbot config schema."""
    is_active: bool = True
    welcome_message: str = "Olá! Bem-vindo ao nosso atendimento. 👋"
    menu_message: str = "Por favor, selecione uma opção:"
    invalid_option_message: str = "Opção inválida. Por favor, escolha uma das opções disponíveis."
    queue_message: str = "Você está na fila. Em breve um atendente irá te atender."
    rating_request_message: str = "Por favor, avalie nosso atendimento de 1 a 10:"
    rating_thanks_message: str = "Obrigado pela avaliação! Até a próxima. 👋"
    offline_message: str = "No momento estamos fora do horário de atendimento."
    menu_options: List[MenuOption] = []
    business_hours: dict = {}


class ChatbotConfigCreate(ChatbotConfigBase):
    """Schema for creating chatbot config."""
    pass


class ChatbotConfigUpdate(BaseModel):
    """Schema for updating chatbot config."""
    is_active: Optional[bool] = None
    welcome_message: Optional[str] = None
    menu_message: Optional[str] = None
    invalid_option_message: Optional[str] = None
    queue_message: Optional[str] = None
    rating_request_message: Optional[str] = None
    rating_thanks_message: Optional[str] = None
    offline_message: Optional[str] = None
    menu_options: Optional[List[MenuOption]] = None
    business_hours: Optional[dict] = None


class ChatbotConfigResponse(ChatbotConfigBase):
    """Schema for chatbot config response."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Webhook Events ====================

class WebhookEvent(BaseModel):
    """Schema for Evolution API webhook events."""
    event: str
    instance: str
    data: Any
    date_time: Optional[str] = None
    sender: Optional[str] = None
    server_url: Optional[str] = None
    apikey: Optional[str] = None
