"""Chat router for WhatsApp integration."""
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Form
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
        print(f"========== WEBHOOK RECEIVED ==========")
        print(f"Event: {event}")
        print(f"Instance: {instance}")
        print(f"Payload keys: {payload.keys()}")
        print(f"Data: {data}")
        print(f"=======================================")
        
        if event == "connection.update":
            await _handle_connection_update(db, instance, data)
        elif event == "qrcode.updated":
            await _handle_qrcode_update(db, instance, data)
        elif event == "messages.upsert":
            await _handle_message_upsert(db, instance, data)
        elif event == "send.message":
            await _handle_send_message(db, instance, data)
        elif event == "messages.update":
            await _handle_message_update(db, instance, data)
        elif event == "contacts.upsert" or event == "contacts.update":
            await _handle_contacts_upsert(db, instance, data)
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        import traceback
        traceback.print_exc()
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
    logger.info(f"Processing MESSAGES_UPSERT for instance: {instance}")
    
    key = data.get("key", {})
    message = data.get("message", {})
    
    logger.info(f"Message key: {key}")
    logger.info(f"Message content keys: {message.keys() if message else 'empty'}")
    
    remote_jid = key.get("remoteJid", "")
    message_id = key.get("id")
    from_me = key.get("fromMe", False)
    
    logger.info(f"remote_jid: {remote_jid}, message_id: {message_id}, from_me: {from_me}")
    
    # Skip group messages for now
    if "@g.us" in remote_jid:
        logger.info(f"Skipping group message: {remote_jid}")
        return
    
    # Skip empty jid
    if not remote_jid:
        logger.warning(f"Empty remote_jid, skipping message")
        return
    
    # Get or create contact
    contact = db.query(ChatContact).filter(ChatContact.remote_jid == remote_jid).first()
    if not contact:
        logger.info(f"Creating new contact for {remote_jid}")
        contact = ChatContact(
            remote_jid=remote_jid,
            push_name=data.get("pushName"),
            phone_number=evolution_api.parse_jid_to_number(remote_jid)
        )
        db.add(contact)
        db.flush()
        logger.info(f"Contact created with ID: {contact.id}")
    else:
        logger.info(f"Found existing contact: {contact.id}")
        contact.last_contact_at = datetime.utcnow()
        if data.get("pushName"):
            contact.push_name = data.get("pushName")
    
    # Get or create chat
    if not from_me:
        # First check for active (non-closed) chat
        chat = db.query(Chat).filter(
            Chat.contact_id == contact.id,
            Chat.status != ChatStatus.CLOSED
        ).first()
        
        # If no active chat, check for chat awaiting rating (recently closed but waiting for rating)
        if not chat:
            chat = db.query(Chat).filter(
                Chat.contact_id == contact.id,
                Chat.chatbot_state == ChatbotState.RATING
            ).order_by(Chat.closed_at.desc()).first()
        
        if not chat:
            # Create new chat
            protocol = f"ATD{datetime.now().strftime('%Y%m%d%H%M%S')}"
            logger.info(f"Creating new chat with protocol: {protocol}")
            chat = Chat(
                protocol=protocol,
                contact_id=contact.id,
                status=ChatStatus.WAITING,
                chatbot_state=ChatbotState.WELCOME
            )
            db.add(chat)
            db.flush()
            logger.info(f"Chat created with ID: {chat.id}, status: {chat.status}")
        else:
            logger.info(f"Found existing chat: {chat.id}, status: {chat.status}, state: {chat.chatbot_state}")
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
        img_msg = message.get("imageMessage", {})
        content = img_msg.get("caption")
        media_url = img_msg.get("url")
        # Check for base64 in message (some Evolution API configs send it)
        if img_msg.get("base64"):
            media_url = f"data:{img_msg.get('mimetype', 'image/jpeg')};base64,{img_msg.get('base64')}"
    elif "videoMessage" in message:
        msg_type = "video"
        vid_msg = message.get("videoMessage", {})
        content = vid_msg.get("caption")
        media_url = vid_msg.get("url")
        if vid_msg.get("base64"):
            media_url = f"data:{vid_msg.get('mimetype', 'video/mp4')};base64,{vid_msg.get('base64')}"
    elif "audioMessage" in message:
        msg_type = "audio"
        aud_msg = message.get("audioMessage", {})
        media_url = aud_msg.get("url")
        if aud_msg.get("base64"):
            media_url = f"data:{aud_msg.get('mimetype', 'audio/ogg')};base64,{aud_msg.get('base64')}"
    elif "documentMessage" in message:
        msg_type = "document"
        doc_msg = message.get("documentMessage", {})
        content = doc_msg.get("fileName")
        media_url = doc_msg.get("url")
        if doc_msg.get("base64"):
            media_url = f"data:{doc_msg.get('mimetype', 'application/octet-stream')};base64,{doc_msg.get('base64')}"
    elif "stickerMessage" in message:
        msg_type = "sticker"
        stk_msg = message.get("stickerMessage", {})
        media_url = stk_msg.get("url")
        if stk_msg.get("base64"):
            media_url = f"data:{stk_msg.get('mimetype', 'image/webp')};base64,{stk_msg.get('base64')}"
    
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
    
    # Process chatbot if it's a received message and chatbot is active
    if not from_me:
        await _process_chatbot(db, instance, chat, content, remote_jid)


async def _handle_send_message(db: Session, instance: str, data: dict):
    """Handle sent message event (messages sent by the system/agent)."""
    key = data.get("key", {})
    message = data.get("message", {})
    
    remote_jid = key.get("remoteJid", "")
    message_id = key.get("id")
    from_me = key.get("fromMe", True)  # send.message is always fromMe
    
    print(f"Processing send.message: {message_id} to {remote_jid}")
    
    # Skip group messages
    if "@g.us" in remote_jid:
        return
    
    if not remote_jid:
        return
    
    # Find the contact
    contact = db.query(ChatContact).filter(ChatContact.remote_jid == remote_jid).first()
    if not contact:
        return
    
    # Find active chat
    chat = db.query(Chat).filter(
        Chat.contact_id == contact.id,
        Chat.status != ChatStatus.CLOSED
    ).first()
    
    if not chat:
        return
    
    # Check if message already exists (avoid duplicates)
    existing = db.query(ChatMessage).filter(ChatMessage.message_id == message_id).first()
    if existing:
        return
    
    # Determine message content and type
    content = None
    msg_type = "text"
    media_url = None
    media_filename = None
    
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
        media_filename = message.get("documentMessage", {}).get("fileName")
        content = media_filename
        media_url = message.get("documentMessage", {}).get("url")
    elif "stickerMessage" in message:
        msg_type = "sticker"
        media_url = message.get("stickerMessage", {}).get("url")
    
    # Create message record
    chat_message = ChatMessage(
        chat_id=chat.id,
        message_id=message_id,
        remote_jid=remote_jid,
        from_me=True,
        message_type=msg_type,
        content=content,
        media_url=media_url,
        media_filename=media_filename,
        status="sent",
        timestamp=datetime.utcnow()
    )
    db.add(chat_message)
    db.commit()
    
    print(f"Saved sent message: {message_id}")


async def _process_chatbot(db: Session, instance: str, chat: Chat, message_content: str, remote_jid: str):
    """Process chatbot logic based on chat state."""
    from app.models.team import Team
    
    # Get chatbot config
    chatbot_config = db.query(ChatbotConfig).first()
    if not chatbot_config or not chatbot_config.is_active:
        print("Chatbot is not active, skipping")
        return
    
    # Get chat config for instance name
    chat_config = db.query(ChatConfig).filter(ChatConfig.instance_name == instance).first()
    if not chat_config:
        print(f"Chat config not found for instance: {instance}")
        return
    
    print(f"Processing chatbot for chat {chat.id}, state: {chat.chatbot_state}")
    
    # Get menu options from config, fallback to teams if not configured
    menu_options = chatbot_config.menu_options or []
    if not menu_options:
        # Fallback: build menu from teams
        teams = db.query(Team).all()
        menu_options = [{"option": str(idx), "text": team.name, "team_id": str(team.id)} for idx, team in enumerate(teams, 1)]
    
    # Process based on current chatbot state
    if chat.chatbot_state == ChatbotState.WELCOME:
        # First contact - send welcome message and menu
        welcome_msg = chatbot_config.welcome_message
        
        # Build menu text from menu_options
        menu_text = f"\n\n{chatbot_config.menu_message}\n"
        
        for opt in menu_options:
            menu_text += f"\n{opt.get('option', '')} - {opt.get('text', '')}"
        
        full_message = welcome_msg + menu_text
        
        try:
            await evolution_api.send_text(
                instance_name=instance,
                number=remote_jid.replace("@s.whatsapp.net", ""),
                text=full_message
            )
            print(f"Sent welcome message to {remote_jid}")
            
            # Update chat state to MENU
            chat.chatbot_state = ChatbotState.MENU
            db.commit()
        except Exception as e:
            print(f"Error sending welcome message: {e}")
    
    elif chat.chatbot_state == ChatbotState.MENU:
        # User is selecting from menu
        user_input = message_content.strip()
        
        # Find matching option
        selected_option = None
        for opt in menu_options:
            if opt.get("option") == user_input:
                selected_option = opt
                break
        
        if selected_option:
            team_id = selected_option.get("team_id")
            option_text = selected_option.get("text", "")
            
            # Assign chat to selected team and move to waiting queue
            if team_id:
                from uuid import UUID
                chat.team_id = UUID(team_id) if isinstance(team_id, str) else team_id
            chat.chatbot_state = ChatbotState.WAITING_AGENT
            db.commit()
            
            # Send queue message
            queue_msg = chatbot_config.queue_message or f"Você será atendido em {option_text}. Aguarde um momento."
            
            await evolution_api.send_text(
                instance_name=instance,
                number=remote_jid.replace("@s.whatsapp.net", ""),
                text=queue_msg
            )
            print(f"Chat {chat.id} assigned to option: {option_text}")
        else:
            # Invalid option - send error message and repeat menu
            error_msg = chatbot_config.invalid_option_message or "Opção inválida. Por favor, escolha uma das opções disponíveis."
            menu_text = f"\n\n{chatbot_config.menu_message}\n"
            
            for opt in menu_options:
                menu_text += f"\n{opt.get('option', '')} - {opt.get('text', '')}"
            
            full_message = error_msg + menu_text
            
            await evolution_api.send_text(
                instance_name=instance,
                number=remote_jid.replace("@s.whatsapp.net", ""),
                text=full_message
            )
    
    elif chat.chatbot_state == ChatbotState.RATING:
        # User is providing rating
        try:
            rating = int(message_content.strip())
            if 1 <= rating <= 10:
                # Save rating
                chat.rating = rating
                chat.chatbot_state = ChatbotState.FINISHED
                db.commit()
                
                # Send thanks message
                thanks_msg = chatbot_config.rating_thanks_message or "Obrigado pela avaliação! Até a próxima. 👋"
                
                await evolution_api.send_text(
                    instance_name=instance,
                    number=remote_jid.replace("@s.whatsapp.net", ""),
                    text=thanks_msg
                )
                print(f"Rating {rating} saved for chat {chat.id}")
            else:
                raise ValueError("Invalid rating")
        except (ValueError, TypeError):
            # Invalid rating - ask again
            await evolution_api.send_text(
                instance_name=instance,
                number=remote_jid.replace("@s.whatsapp.net", ""),
                text="Por favor, digite um número de 1 a 10 para avaliar nosso atendimento:"
            )
    
    # If chat is WITH_AGENT, don't process chatbot (human is handling)
    # If chat is WAITING_AGENT, nothing to do until agent takes over


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
    """List chats/conversations with filters and visibility rules.
    
    Visibility rules:
    - WAITING: visible to team members (team_id matches user's teams)
    - IN_PROGRESS: visible only to the assigned user (owner)
    - CLOSED: visible to all team members
    - Superusers can see all chats
    """
    from sqlalchemy import or_, and_
    
    query = db.query(Chat)
    
    # Apply visibility rules for non-superusers
    if not current_user.is_superuser:
        user_team_ids = [team.id for team in current_user.teams]
        
        if not user_team_ids:
            # User has no teams - show chats assigned to them OR waiting chats without team
            query = query.filter(
                or_(
                    Chat.assigned_user_id == current_user.id,
                    and_(
                        Chat.status == ChatStatus.WAITING,
                        Chat.team_id.is_(None)
                    )
                )
            )
        else:
            # Build visibility conditions based on status
            query = query.filter(
                or_(
                    # WAITING chats: visible to team members OR chats without team (new chats)
                    and_(
                        Chat.status == ChatStatus.WAITING,
                        or_(
                            Chat.team_id.in_(user_team_ids),
                            Chat.team_id.is_(None)  # New chats without team assigned
                        )
                    ),
                    # IN_PROGRESS chats: visible only to the assigned user
                    and_(
                        Chat.status == ChatStatus.IN_PROGRESS,
                        Chat.assigned_user_id == current_user.id
                    ),
                    # CLOSED chats: visible to team members
                    and_(
                        Chat.status == ChatStatus.CLOSED,
                        Chat.team_id.in_(user_team_ids)
                    ),
                    # Also show chats without team but assigned to user
                    Chat.assigned_user_id == current_user.id
                )
            )
    
    # Apply additional filters
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


@router.get("/messages/{message_id}/media")
async def get_message_media(
    message_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "read"))
):
    """Get media from a message in base64 format."""
    from fastapi.responses import JSONResponse
    
    chat_message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not chat_message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    
    if chat_message.message_type == "text":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message has no media")
    
    # If we already have a base64 data URL, return it
    if chat_message.media_url and chat_message.media_url.startswith("data:"):
        return {"base64": chat_message.media_url}
    
    # Get config and try to fetch from Evolution API
    config = db.query(ChatConfig).filter(ChatConfig.is_active == True).first()
    if not config:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chat not configured")
    
    try:
        result = await evolution_api.get_base64_from_media(
            instance_name=config.instance_name,
            message_id=chat_message.message_id,
            remote_jid=chat_message.remote_jid,
            from_me=chat_message.from_me
        )
        
        base64_data = result.get("base64")
        mimetype = result.get("mimetype", "application/octet-stream")
        
        if base64_data:
            # Update the message with the base64 data for future use
            data_url = f"data:{mimetype};base64,{base64_data}"
            chat_message.media_url = data_url
            db.commit()
            return {"base64": data_url}
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Could not retrieve media")
            
    except EvolutionAPIError as e:
        logger.error(f"Error getting media: {e.message}")
        # Return the original URL as fallback
        return {"base64": chat_message.media_url, "error": str(e.message)}


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
    
    # Validate contact exists
    if not chat.contact:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat não tem contato associado"
        )
    
    # Get phone number - prefer remote_jid, fallback to phone_number
    contact_number = None
    if chat.contact.remote_jid:
        # Extract number from JID (remove @s.whatsapp.net)
        contact_number = chat.contact.remote_jid.split('@')[0]
    elif chat.contact.phone_number:
        contact_number = chat.contact.phone_number
    
    if not contact_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contato não tem número de telefone"
        )
    
    config = db.query(ChatConfig).filter(ChatConfig.is_active == True).first()
    if not config or config.connection_status != ConnectionStatus.CONNECTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="WhatsApp não está conectado"
        )
    
    try:
        logger.info(f"Sending message to {contact_number} via instance {config.instance_name}")
        
        result = await evolution_api.send_text(
            instance_name=config.instance_name,
            number=contact_number,
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
        logger.error(f"Evolution API error sending message: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao enviar mensagem: {e.message}"
        )


@router.post("/conversations/{chat_id}/send-media")
async def send_media(
    chat_id: UUID,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("chat", "create"))
):
    """Send media message to chat."""
    import base64
    
    chat = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    
    # Validate contact exists
    if not chat.contact:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chat não tem contato associado"
        )
    
    # Get phone number
    contact_number = None
    if chat.contact.remote_jid:
        contact_number = chat.contact.remote_jid.split('@')[0]
    elif chat.contact.phone_number:
        contact_number = chat.contact.phone_number
    
    if not contact_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contato não tem número de telefone"
        )
    
    config = db.query(ChatConfig).filter(ChatConfig.is_active == True).first()
    if not config or config.connection_status != ConnectionStatus.CONNECTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="WhatsApp não está conectado"
        )
    
    try:
        # Read file content and convert to base64
        file_content = await file.read()
        file_base64 = base64.b64encode(file_content).decode('utf-8')
        
        # Determine media type from mimetype
        mimetype = file.content_type or 'application/octet-stream'
        if mimetype.startswith('image/'):
            media_type = 'image'
        elif mimetype.startswith('video/'):
            media_type = 'video'
        elif mimetype.startswith('audio/'):
            media_type = 'audio'
        else:
            media_type = 'document'
        
        logger.info(f"Sending {media_type} ({mimetype}) to {contact_number} via instance {config.instance_name}")
        logger.info(f"File: {file.filename}, size: {len(file_content)} bytes")
        
        result = await evolution_api.send_media(
            instance_name=config.instance_name,
            number=contact_number,
            media_type=media_type,
            media_base64=file_base64,  # Send pure base64
            caption=caption,
            filename=file.filename,
            mimetype=mimetype
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
        logger.error(f"Evolution API error sending media: {e.message}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Erro ao enviar mídia: {e.message}"
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
    
    # Get contact for sending rating message
    contact = db.query(ChatContact).filter(ChatContact.id == chat.contact_id).first()
    
    # Get chat config for instance name
    chat_config = db.query(ChatConfig).filter(ChatConfig.is_active == True).first()
    
    # Get chatbot config for rating message
    chatbot_config = db.query(ChatbotConfig).first()
    
    # Send rating request message before closing
    if contact and chat_config and chatbot_config:
        rating_msg = chatbot_config.rating_request_message or "Por favor, avalie nosso atendimento de 1 a 10:"
        try:
            await evolution_api.send_text(
                instance_name=chat_config.instance_name,
                number=contact.remote_jid.replace("@s.whatsapp.net", ""),
                text=rating_msg
            )
            # Set state to RATING to capture the response
            chat.chatbot_state = ChatbotState.RATING
        except Exception as e:
            logger.error(f"Error sending rating message: {e}")
            # Continue with closing even if message fails
            chat.chatbot_state = ChatbotState.FINISHED
    else:
        chat.chatbot_state = ChatbotState.FINISHED
    
    chat.status = ChatStatus.CLOSED
    chat.classification = close_data.classification
    chat.rating = close_data.rating
    chat.closing_comments = close_data.closing_comments
    chat.closed_by_id = current_user.id
    chat.closed_at = datetime.utcnow()
    
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
            # menu_options items need to be serializable (no UUID objects)
            processed_options = []
            for opt in value:
                if hasattr(opt, 'model_dump'):
                    opt_dict = opt.model_dump()
                else:
                    opt_dict = dict(opt)
                # Convert UUID to string for JSON serialization
                if 'team_id' in opt_dict and opt_dict['team_id'] is not None:
                    opt_dict['team_id'] = str(opt_dict['team_id'])
                processed_options.append(opt_dict)
            setattr(config, field, processed_options)
        else:
            setattr(config, field, value)
    
    db.commit()
    db.refresh(config)
    return config
