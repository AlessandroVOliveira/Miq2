"""Chat module models - WhatsApp integration via Evolution API."""
import uuid
import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Boolean, Integer, Enum, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ConnectionStatus(str, enum.Enum):
    """Status da conexão com WhatsApp."""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    QRCODE = "qrcode"


class ConnectionType(str, enum.Enum):
    """Tipo de conexão WhatsApp."""
    BAILEYS = "WHATSAPP-BAILEYS"
    BUSINESS = "WHATSAPP-BUSINESS"


class ChatStatus(str, enum.Enum):
    """Status de um chat/atendimento."""
    WAITING = "waiting"       # Aguardando na fila
    IN_PROGRESS = "in_progress"  # Em atendimento
    CLOSED = "closed"         # Encerrado


class ChatbotState(str, enum.Enum):
    """Estado do chatbot na conversa."""
    WELCOME = "welcome"
    MENU = "menu"
    WAITING_AGENT = "waiting_agent"
    WITH_AGENT = "with_agent"
    RATING = "rating"
    FINISHED = "finished"


class ChatConfig(Base):
    """Configuração da conexão WhatsApp via Evolution API."""
    __tablename__ = "chat_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instance_name = Column(String(100), unique=True, nullable=False)
    instance_id = Column(String(100), nullable=True)  # ID retornado pela Evolution API
    api_key = Column(String(255), nullable=True)  # API key específica da instância
    connection_type = Column(Enum(ConnectionType), default=ConnectionType.BAILEYS)
    connection_status = Column(Enum(ConnectionStatus), default=ConnectionStatus.DISCONNECTED)
    phone_number = Column(String(20), nullable=True)  # Número conectado
    qrcode_base64 = Column(Text, nullable=True)  # QR Code para conexão
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<ChatConfig {self.instance_name} ({self.connection_status.value})>"


class ChatContact(Base):
    """Contatos do WhatsApp que já interagiram."""
    __tablename__ = "chat_contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    remote_jid = Column(String(50), unique=True, nullable=False)  # 5511999999999@s.whatsapp.net
    push_name = Column(String(255), nullable=True)  # Nome no WhatsApp
    custom_name = Column(String(255), nullable=True)  # Nome editado pelo atendente
    profile_picture_url = Column(Text, nullable=True)
    phone_number = Column(String(20), nullable=True)  # Número limpo
    first_contact_at = Column(DateTime, default=datetime.utcnow)
    last_contact_at = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    chats = relationship("Chat", back_populates="contact")

    def __repr__(self):
        return f"<ChatContact {self.push_name or self.phone_number}>"
    
    @property
    def display_name(self):
        """Retorna o nome a ser exibido (customizado ou push_name)."""
        return self.custom_name or self.push_name or self.phone_number


class Chat(Base):
    """Representa uma conversa/atendimento."""
    __tablename__ = "chats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    protocol = Column(String(20), unique=True, nullable=False)  # Protocolo do atendimento
    contact_id = Column(UUID(as_uuid=True), ForeignKey("chat_contacts.id"), nullable=False)
    status = Column(Enum(ChatStatus), default=ChatStatus.WAITING)
    chatbot_state = Column(Enum(ChatbotState), default=ChatbotState.WELCOME)
    
    # Atribuição
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)
    assigned_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Encerramento
    classification = Column(String(100), nullable=True)
    rating = Column(Integer, nullable=True)  # Nota de 1 a 10
    closing_comments = Column(Text, nullable=True)
    closed_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    closed_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    first_response_at = Column(DateTime, nullable=True)  # Quando o atendente respondeu
    
    # Relacionamentos
    contact = relationship("ChatContact", back_populates="chats")
    team = relationship("Team")
    assigned_user = relationship("User", foreign_keys=[assigned_user_id])
    closed_by = relationship("User", foreign_keys=[closed_by_id])
    messages = relationship("ChatMessage", back_populates="chat", order_by="ChatMessage.timestamp")

    def __repr__(self):
        return f"<Chat {self.protocol} ({self.status.value})>"


class ChatMessage(Base):
    """Mensagens de uma conversa."""
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(UUID(as_uuid=True), ForeignKey("chats.id"), nullable=False)
    message_id = Column(String(100), nullable=False)  # ID da mensagem no WhatsApp
    remote_jid = Column(String(50), nullable=False)
    from_me = Column(Boolean, default=False)  # Enviada pelo sistema
    
    # Conteúdo
    message_type = Column(String(20), nullable=False)  # text, image, video, audio, document, sticker, location, contact
    content = Column(Text, nullable=True)  # Texto ou legenda
    media_url = Column(Text, nullable=True)  # URL da mídia
    media_mimetype = Column(String(100), nullable=True)
    media_filename = Column(String(255), nullable=True)
    
    # Reply/Quote
    quoted_message_id = Column(String(100), nullable=True)
    
    # Status
    status = Column(String(20), default="pending")  # pending, sent, delivered, read
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    chat = relationship("Chat", back_populates="messages")

    def __repr__(self):
        return f"<ChatMessage {self.message_id} ({self.message_type})>"


class QuickReply(Base):
    """Mensagens pré-definidas para respostas rápidas."""
    __tablename__ = "quick_replies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    shortcut = Column(String(20), nullable=True)  # Ex: /ola, /preco
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"), nullable=True)  # Null = global
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    team = relationship("Team")
    created_by = relationship("User")

    def __repr__(self):
        return f"<QuickReply {self.title}>"


class ChatClassification(Base):
    """Classificações para chats encerrados."""
    __tablename__ = "chat_classifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    color = Column(String(7), default="#6B7280")  # Cor hex
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<ChatClassification {self.name}>"


class ChatbotConfig(Base):
    """Configuração do chatbot automático."""
    __tablename__ = "chatbot_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    is_active = Column(Boolean, default=True)
    
    # Mensagens
    welcome_message = Column(Text, nullable=False, default="Olá! Bem-vindo ao nosso atendimento. 👋")
    menu_message = Column(Text, nullable=False, default="Por favor, selecione uma opção:")
    invalid_option_message = Column(Text, default="Opção inválida. Por favor, escolha uma das opções disponíveis.")
    queue_message = Column(Text, default="Você está na fila. Em breve um atendente irá te atender.")
    rating_request_message = Column(Text, default="Por favor, avalie nosso atendimento de 1 a 10:")
    rating_thanks_message = Column(Text, default="Obrigado pela avaliação! Até a próxima. 👋")
    offline_message = Column(Text, default="No momento estamos fora do horário de atendimento.")
    
    # Menu de opções (JSON array)
    # Formato: [{"option": "1", "text": "Suporte Técnico", "team_id": "uuid"}]
    menu_options = Column(JSON, default=[])
    
    # Horário de atendimento (JSON)
    # Formato: {"monday": {"start": "08:00", "end": "18:00"}, ...}
    business_hours = Column(JSON, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<ChatbotConfig active={self.is_active}>"
