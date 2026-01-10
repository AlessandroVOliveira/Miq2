"""Chat router for WhatsApp integration."""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.chat import (
    ChatConfig, ChatContact, Chat, ChatMessage, QuickReply, 
    ChatClassification, ChatbotConfig, ConnectionStatus, ChatStatus, ChatbotState
)
from app.schemas.chat import (
    ChatConfigCreate, ChatConfigResponse, QRCodeResponse, ConnectionStateResponse,
    ChatContactResponse, ChatContactUpdate,
    ChatResponse, ChatListResponse, ChatTransfer, ChatClose,
    ChatMessageResponse, SendTextMessage, SendMediaMessage,
    QuickReplyCreate, QuickReplyUpdate, QuickReplyResponse,
    ChatClassificationCreate, ChatClassificationUpdate, ChatClassificationResponse,
    ChatbotConfigCreate, ChatbotConfigUpdate, ChatbotConfigResponse,
    WebhookEvent
)
from app.services.evolution_api import evolution_api, EvolutionAPIError
from app.middleware.auth import require_permission, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


# ==================== Chat Config (WhatsApp Connection) ====================

@router.get("/config", response_model=ChatConfigResponse)
async def get_chat_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """Get current WhatsApp connection configuration."""
    config = db.query(ChatConfig).filter(ChatConfig.is_active == True).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat configuration not found. Please create one first."
        )
    return config


@router.post("/config", response_model=ChatConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_config(
    config_data: ChatConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "create"))
):
    """Create WhatsApp connection configuration and instance."""
    # Check if config already exists in DB
    existing = db.query(ChatConfig).filter(ChatConfig.instance_name == config_data.instance_name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instance with this name already exists in database"
        )
    
    result = None
    instance_already_exists = False
    
    # For Business API, qrcode is False (uses token instead)
    use_qrcode = config_data.connection_type.value == "WHATSAPP-BAILEYS"
    
    try:
        # Try to create instance in Evolution API
        result = await evolution_api.create_instance(
            instance_name=config_data.instance_name,
            integration=config_data.connection_type.value,
            qrcode=use_qrcode,
            token=config_data.token,
            number=config_data.number
        )
        
    except EvolutionAPIError as e:
        # If instance already exists in Evolution API, try to fetch it
        if e.status_code == 403 and "already in use" in str(e.response):
            logger.info(f"Instance {config_data.instance_name} already exists in Evolution API, fetching...")
            instance_already_exists = True
        else:
            logger.error(f"Failed to create Evolution API instance: {e.message}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Erro ao criar instância na Evolution API: {e.message}"
            )
    
    try:
        # If instance already exists, try to connect and get QR code
        if instance_already_exists:
            try:
                # Get existing instance status
                state = await evolution_api.get_connection_state(config_data.instance_name)
                is_connected = state.get("state") == "open"
                
                if not is_connected:
                    # Try to get QR code
                    result = await evolution_api.connect_instance(config_data.instance_name)
                else:
                    result = {"qrcode": {}}
                    
            except EvolutionAPIError:
                # If that fails, delete and recreate
                try:
                    await evolution_api.delete_instance(config_data.instance_name)
                    result = await evolution_api.create_instance(
                        instance_name=config_data.instance_name,
                        integration=config_data.connection_type.value,
                        qrcode=True
                    )
                except EvolutionAPIError as e2:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Erro ao recriar instância: {e2.message}"
                    )
        
        # Parse response - handle different response formats
        instance_data = result.get("instance", {}) if isinstance(result.get("instance"), dict) else {}
        qrcode_data = result.get("qrcode", {}) if isinstance(result.get("qrcode"), dict) else {}
        
        # hash can be a string or an object with apikey
        hash_value = result.get("hash")
        if isinstance(hash_value, dict):
            api_key = hash_value.get("apikey")
        elif isinstance(hash_value, str):
            api_key = hash_value
        else:
            api_key = None
        
        # Create config in database
        config = ChatConfig(
            instance_name=config_data.instance_name,
            instance_id=instance_data.get("instanceId"),
            api_key=api_key,
            connection_type=config_data.connection_type,
            connection_status=ConnectionStatus.QRCODE if qrcode_data.get("base64") else ConnectionStatus.CONNECTING,
            qrcode_base64=qrcode_data.get("base64")
        )
        
        db.add(config)
        db.commit()
        db.refresh(config)
        
        return config
        
    except EvolutionAPIError as e:
        logger.error(f"Failed to create Evolution API instance: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao criar instância na Evolution API: {e.message}"
        )


@router.delete("/config", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "delete"))
):
    """Delete WhatsApp connection configuration and instance."""
    config = db.query(ChatConfig).filter(ChatConfig.is_active == True).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat configuration not found"
        )
    
    # Try to delete from Evolution API
    try:
        await evolution_api.delete_instance(config.instance_name)
    except EvolutionAPIError as e:
        logger.warning(f"Could not delete instance from Evolution API: {e.message}")
        # Continue with local deletion even if Evolution API fails
    
    # Delete from database
    db.delete(config)
    db.commit()
    
    return None


@router.get("/connect", response_model=QRCodeResponse)
async def connect_whatsapp(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "create"))
):
    """Connect to WhatsApp and get QR code."""
    config = db.query(ChatConfig).filter(ChatConfig.is_active == True).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat configuration not found"
        )
    
    try:
        result = await evolution_api.connect_instance(config.instance_name)
        
        qrcode_data = result.get("qrcode", {})
        
        # Update config with QR code
        config.qrcode_base64 = qrcode_data.get("base64")
        config.connection_status = ConnectionStatus.QRCODE
        db.commit()
        
        return QRCodeResponse(
            code=qrcode_data.get("code"),
            base64=qrcode_data.get("base64"),
            status=ConnectionStatus.QRCODE
        )
        
    except EvolutionAPIError as e:
        logger.error(f"Failed to connect: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao conectar: {e.message}"
        )


@router.get("/status", response_model=ConnectionStateResponse)
async def get_connection_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """Get WhatsApp connection status."""
    config = db.query(ChatConfig).filter(ChatConfig.is_active == True).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat configuration not found"
        )
    
    try:
        result = await evolution_api.get_connection_state(config.instance_name)
        state = result.get("state", "close")
        
        # Map state to status
        status_map = {
            "open": ConnectionStatus.CONNECTED,
            "connecting": ConnectionStatus.CONNECTING,
            "close": ConnectionStatus.DISCONNECTED
        }
        new_status = status_map.get(state, ConnectionStatus.DISCONNECTED)
        
        # Update database if status changed
        if config.connection_status != new_status:
            config.connection_status = new_status
            if new_status == ConnectionStatus.CONNECTED:
                config.qrcode_base64 = None  # Clear QR code
            db.commit()
        
        return ConnectionStateResponse(
            instance=config.instance_name,
            state=state,
            status=new_status
        )
        
    except EvolutionAPIError as e:
        logger.error(f"Failed to get status: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao obter status: {e.message}"
        )


@router.delete("/disconnect")
async def disconnect_whatsapp(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "delete"))
):
    """Disconnect from WhatsApp (logout)."""
    config = db.query(ChatConfig).filter(ChatConfig.is_active == True).first()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat configuration not found"
        )
    
    try:
        await evolution_api.logout_instance(config.instance_name)
        
        config.connection_status = ConnectionStatus.DISCONNECTED
        config.phone_number = None
        db.commit()
        
        return {"message": "Desconectado com sucesso"}
        
    except EvolutionAPIError as e:
        logger.error(f"Failed to disconnect: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao desconectar: {e.message}"
        )


# ==================== Webhook (Evolution API Events) ====================

@router.post("/webhook")
async def handle_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle webhook events from Evolution API."""
    try:
        payload = await request.json()
        event = payload.get("event")
        instance = payload.get("instance")
        data = payload.get("data", {})
        
        logger.info(f"Webhook received: {event} from {instance}")
        
        if event == "CONNECTION_UPDATE":
            await _handle_connection_update(db, instance, data)
        elif event == "QRCODE_UPDATED":
            await _handle_qrcode_update(db, instance, data)
        elif event == "MESSAGES_UPSERT":
            await _handle_message_upsert(db, instance, data)
        elif event == "MESSAGES_UPDATE":
            await _handle_message_update(db, instance, data)
        elif event == "CONTACTS_UPSERT":
            await _handle_contacts_upsert(db, instance, data)
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}


async def _handle_connection_update(db: Session, instance: str, data: dict):
    """Handle connection update event."""
    config = db.query(ChatConfig).filter(ChatConfig.instance_name == instance).first()
    if not config:
        return
    
    state = data.get("state")
    status_map = {
        "open": ConnectionStatus.CONNECTED,
        "connecting": ConnectionStatus.CONNECTING,
        "close": ConnectionStatus.DISCONNECTED
    }
    
    config.connection_status = status_map.get(state, ConnectionStatus.DISCONNECTED)
    
    # If connected, try to get phone number
    if state == "open":
        config.qrcode_base64 = None
        # Phone number might be in data
        if "number" in data:
            config.phone_number = data.get("number")
    
    db.commit()


async def _handle_qrcode_update(db: Session, instance: str, data: dict):
    """Handle QR code update event."""
    config = db.query(ChatConfig).filter(ChatConfig.instance_name == instance).first()
    if not config:
        return
    
    config.qrcode_base64 = data.get("qrcode", {}).get("base64")
    config.connection_status = ConnectionStatus.QRCODE
    db.commit()


async def _handle_message_upsert(db: Session, instance: str, data: dict):
    """Handle new message event."""
    key = data.get("key", {})
    message = data.get("message", {})
    
    remote_jid = key.get("remoteJid", "")
    message_id = key.get("id")
    from_me = key.get("fromMe", False)
    
    # Skip group messages for now
    if "@g.us" in remote_jid:
        return
    
    # Get or create contact
    contact = db.query(ChatContact).filter(ChatContact.remote_jid == remote_jid).first()
    if not contact:
        contact = ChatContact(
            remote_jid=remote_jid,
            push_name=data.get("pushName"),
            phone_number=evolution_api.parse_jid_to_number(remote_jid)
        )
        db.add(contact)
        db.flush()
    else:
        contact.last_contact_at = datetime.utcnow()
        if data.get("pushName"):
            contact.push_name = data.get("pushName")
    
    # Get or create chat
    if not from_me:
        chat = db.query(Chat).filter(
            Chat.contact_id == contact.id,
            Chat.status != ChatStatus.CLOSED
        ).first()
        
        if not chat:
            # Create new chat
            protocol = f"ATD{datetime.now().strftime('%Y%m%d%H%M%S')}"
            chat = Chat(
                protocol=protocol,
                contact_id=contact.id,
                status=ChatStatus.WAITING,
                chatbot_state=ChatbotState.WELCOME
            )
            db.add(chat)
            db.flush()
    else:
        # For outgoing messages, find the active chat
        chat = db.query(Chat).filter(
            Chat.contact_id == contact.id,
            Chat.status != ChatStatus.CLOSED
        ).first()
        if not chat:
            return  # No active chat for this contact
    
    # Determine message type and content
    msg_type = "text"
    content = None
    media_url = None
    
    if "conversation" in message:
        content = message.get("conversation")
    elif "extendedTextMessage" in message:
        content = message.get("extendedTextMessage", {}).get("text")
    elif "imageMessage" in message:
        msg_type = "image"
        content = message.get("imageMessage", {}).get("caption")
        media_url = message.get("imageMessage", {}).get("url")
    elif "videoMessage" in message:
        msg_type = "video"
        content = message.get("videoMessage", {}).get("caption")
        media_url = message.get("videoMessage", {}).get("url")
    elif "audioMessage" in message:
        msg_type = "audio"
        media_url = message.get("audioMessage", {}).get("url")
    elif "documentMessage" in message:
        msg_type = "document"
        content = message.get("documentMessage", {}).get("fileName")
        media_url = message.get("documentMessage", {}).get("url")
    elif "stickerMessage" in message:
        msg_type = "sticker"
        media_url = message.get("stickerMessage", {}).get("url")
    
    # Create message record
    chat_message = ChatMessage(
        chat_id=chat.id,
        message_id=message_id,
        remote_jid=remote_jid,
        from_me=from_me,
        message_type=msg_type,
        content=content,
        media_url=media_url,
        status="received" if not from_me else "sent",
        timestamp=datetime.utcnow()
    )
    db.add(chat_message)
    
    db.commit()


async def _handle_message_update(db: Session, instance: str, data: dict):
    """Handle message status update event."""
    key = data.get("key", {})
    message_id = key.get("id")
    update_status = data.get("status")
    
    if not message_id or not update_status:
        return
    
    message = db.query(ChatMessage).filter(ChatMessage.message_id == message_id).first()
    if message:
        status_map = {
            1: "pending",
            2: "sent",
            3: "delivered",
            4: "read"
        }
        message.status = status_map.get(update_status, message.status)
        db.commit()


async def _handle_contacts_upsert(db: Session, instance: str, data: dict):
    """Handle contacts update event."""
    contacts = data if isinstance(data, list) else [data]
    
    for contact_data in contacts:
        remote_jid = contact_data.get("remoteJid") or contact_data.get("id")
        if not remote_jid or "@g.us" in remote_jid:
            continue
        
        contact = db.query(ChatContact).filter(ChatContact.remote_jid == remote_jid).first()
        if contact:
            if contact_data.get("pushName"):
                contact.push_name = contact_data.get("pushName")
            if contact_data.get("profilePictureUrl"):
                contact.profile_picture_url = contact_data.get("profilePictureUrl")
        else:
            contact = ChatContact(
                remote_jid=remote_jid,
                push_name=contact_data.get("pushName"),
                phone_number=evolution_api.parse_jid_to_number(remote_jid),
                profile_picture_url=contact_data.get("profilePictureUrl")
            )
            db.add(contact)
    
    db.commit()


# ==================== Chats ====================

@router.get("/conversations", response_model=ChatListResponse)
async def list_chats(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    team_id: Optional[UUID] = None,
    assigned_to_me: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """List chats/conversations with filters."""
    query = db.query(Chat)
    
    if status:
        query = query.filter(Chat.status == status)
    if team_id:
        query = query.filter(Chat.team_id == team_id)
    if assigned_to_me:
        query = query.filter(Chat.assigned_user_id == current_user.id)
    
    query = query.order_by(Chat.updated_at.desc())
    
    total = query.count()
    chats = query.offset((page - 1) * size).limit(size).all()
    
    return ChatListResponse(items=chats, total=total, page=page, size=size)


@router.get("/conversations/{chat_id}", response_model=ChatResponse)
async def get_chat(
    chat_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """Get chat details."""
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    return chat


@router.get("/conversations/{chat_id}/messages", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    chat_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    before_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """Get messages for a chat."""
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    
    query = db.query(ChatMessage).filter(ChatMessage.chat_id == chat_id)
    
    if before_id:
        before_msg = db.query(ChatMessage).filter(ChatMessage.id == before_id).first()
        if before_msg:
            query = query.filter(ChatMessage.timestamp < before_msg.timestamp)
    
    messages = query.order_by(ChatMessage.timestamp.desc()).limit(limit).all()
    return list(reversed(messages))


@router.post("/conversations/{chat_id}/send")
async def send_message(
    chat_id: UUID,
    message: SendTextMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "create"))
):
    """Send text message to chat."""
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    
    config = db.query(ChatConfig).filter(ChatConfig.is_active == True).first()
    if not config or config.connection_status != ConnectionStatus.CONNECTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="WhatsApp não está conectado"
        )
    
    try:
        result = await evolution_api.send_text(
            instance_name=config.instance_name,
            number=chat.contact.phone_number,
            text=message.text
        )
        
        # Update chat status if it was waiting
        if chat.status == ChatStatus.WAITING:
            chat.status = ChatStatus.IN_PROGRESS
            chat.assigned_user_id = current_user.id
            chat.first_response_at = datetime.utcnow()
            chat.chatbot_state = ChatbotState.WITH_AGENT
            db.commit()
        
        return {"status": "sent", "message_id": result.get("key", {}).get("id")}
        
    except EvolutionAPIError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao enviar mensagem: {e.message}"
        )


@router.post("/conversations/{chat_id}/transfer")
async def transfer_chat(
    chat_id: UUID,
    transfer_data: ChatTransfer,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "update"))
):
    """Transfer chat to another team/user."""
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    
    chat.team_id = transfer_data.target_team_id
    chat.assigned_user_id = transfer_data.target_user_id
    if transfer_data.target_user_id:
        chat.status = ChatStatus.IN_PROGRESS
    else:
        chat.status = ChatStatus.WAITING
    
    db.commit()
    db.refresh(chat)
    
    return {"message": "Chat transferido com sucesso"}


@router.post("/conversations/{chat_id}/close")
async def close_chat(
    chat_id: UUID,
    close_data: ChatClose,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "update"))
):
    """Close a chat."""
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    
    chat.status = ChatStatus.CLOSED
    chat.classification = close_data.classification
    chat.rating = close_data.rating
    chat.closing_comments = close_data.closing_comments
    chat.closed_by_id = current_user.id
    chat.closed_at = datetime.utcnow()
    chat.chatbot_state = ChatbotState.FINISHED
    
    db.commit()
    
    return {"message": "Chat encerrado com sucesso"}


@router.post("/conversations/{chat_id}/reopen")
async def reopen_chat(
    chat_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "update"))
):
    """Reopen a closed chat."""
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    
    if chat.status != ChatStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat não está encerrado"
        )
    
    chat.status = ChatStatus.IN_PROGRESS
    chat.assigned_user_id = current_user.id
    chat.closed_at = None
    chat.closed_by_id = None
    chat.chatbot_state = ChatbotState.WITH_AGENT
    
    db.commit()
    
    return {"message": "Chat reaberto com sucesso"}


# ==================== Contacts ====================

@router.get("/contacts", response_model=List[ChatContactResponse])
async def list_contacts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """List all contacts."""
    query = db.query(ChatContact)
    
    if search:
        query = query.filter(
            (ChatContact.push_name.ilike(f"%{search}%")) |
            (ChatContact.custom_name.ilike(f"%{search}%")) |
            (ChatContact.phone_number.ilike(f"%{search}%"))
        )
    
    query = query.order_by(ChatContact.last_contact_at.desc())
    contacts = query.offset((page - 1) * size).limit(size).all()
    
    return contacts


@router.put("/contacts/{contact_id}", response_model=ChatContactResponse)
async def update_contact(
    contact_id: UUID,
    update_data: ChatContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "update"))
):
    """Update contact (custom name)."""
    contact = db.query(ChatContact).filter(ChatContact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
    
    if update_data.custom_name is not None:
        contact.custom_name = update_data.custom_name
    
    db.commit()
    db.refresh(contact)
    
    return contact


# ==================== Quick Replies ====================

@router.get("/quick-replies", response_model=List[QuickReplyResponse])
async def list_quick_replies(
    team_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """List quick replies."""
    query = db.query(QuickReply).filter(QuickReply.is_active == True)
    
    if team_id:
        query = query.filter((QuickReply.team_id == team_id) | (QuickReply.team_id == None))
    
    return query.all()


@router.post("/quick-replies", response_model=QuickReplyResponse, status_code=status.HTTP_201_CREATED)
async def create_quick_reply(
    reply_data: QuickReplyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "create"))
):
    """Create quick reply."""
    reply = QuickReply(
        **reply_data.model_dump(),
        created_by_id=current_user.id
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return reply


@router.put("/quick-replies/{reply_id}", response_model=QuickReplyResponse)
async def update_quick_reply(
    reply_id: UUID,
    update_data: QuickReplyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "update"))
):
    """Update quick reply."""
    reply = db.query(QuickReply).filter(QuickReply.id == reply_id).first()
    if not reply:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quick reply not found")
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        setattr(reply, field, value)
    
    db.commit()
    db.refresh(reply)
    return reply


@router.delete("/quick-replies/{reply_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quick_reply(
    reply_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "delete"))
):
    """Delete quick reply."""
    reply = db.query(QuickReply).filter(QuickReply.id == reply_id).first()
    if not reply:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quick reply not found")
    
    db.delete(reply)
    db.commit()


# ==================== Classifications ====================

@router.get("/classifications", response_model=List[ChatClassificationResponse])
async def list_classifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """List chat classifications."""
    return db.query(ChatClassification).filter(ChatClassification.is_active == True).all()


@router.post("/classifications", response_model=ChatClassificationResponse, status_code=status.HTTP_201_CREATED)
async def create_classification(
    classification_data: ChatClassificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "create"))
):
    """Create chat classification."""
    classification = ChatClassification(**classification_data.model_dump())
    db.add(classification)
    db.commit()
    db.refresh(classification)
    return classification


@router.delete("/classifications/{classification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_classification(
    classification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "delete"))
):
    """Delete chat classification (soft delete)."""
    classification = db.query(ChatClassification).filter(ChatClassification.id == classification_id).first()
    if not classification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Classification not found")
    classification.is_active = False
    db.commit()


# ==================== Chatbot Config ====================

@router.get("/chatbot/config", response_model=ChatbotConfigResponse)
async def get_chatbot_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """Get chatbot configuration."""
    config = db.query(ChatbotConfig).first()
    if not config:
        # Create default config
        config = ChatbotConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.put("/chatbot/config", response_model=ChatbotConfigResponse)
async def update_chatbot_config(
    config_data: ChatbotConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "update"))
):
    """Update chatbot configuration."""
    config = db.query(ChatbotConfig).first()
    if not config:
        config = ChatbotConfig()
        db.add(config)
    
    for field, value in config_data.model_dump(exclude_unset=True).items():
        if field == "menu_options" and value is not None:
            setattr(config, field, [opt.model_dump() for opt in value])
        else:
            setattr(config, field, value)
    
    db.commit()
    db.refresh(config)
    return config
