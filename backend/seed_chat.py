"""
Seed script to create fake chat data for testing.
Run: docker exec miq2-backend python seed_chat.py
"""
import sys
sys.path.insert(0, '.')

from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.chat import (
    ChatConfig, ChatContact, Chat, ChatMessage,
    ConnectionStatus, ChatStatus, ChatbotState
)
from app.models.team import Team


def create_fake_chat_data(db: Session):
    """Create fake chat contacts, conversations and messages."""
    
    # Check if config exists
    config = db.query(ChatConfig).filter(ChatConfig.is_active == True).first()
    if not config:
        print("  ! No chat config found. Creating a fake one...")
        config = ChatConfig(
            instance_name="test-instance",
            instance_id="test-instance-id",
            connection_status=ConnectionStatus.CONNECTED,
            phone_number="5511999999999",
            is_active=True
        )
        db.add(config)
        db.commit()
        print("  + Created fake ChatConfig")
    
    # Get teams
    teams = db.query(Team).all()
    team_suporte = next((t for t in teams if "Suporte" in t.name), teams[0] if teams else None)
    team_implantacao = next((t for t in teams if "Implanta" in t.name), teams[1] if len(teams) > 1 else team_suporte)
    
    # Fake contacts data
    contacts_data = [
        ("5511987654321@s.whatsapp.net", "João Silva", "11987654321"),
        ("5511912345678@s.whatsapp.net", "Maria Oliveira", "11912345678"),
        ("5521988887777@s.whatsapp.net", "Carlos Santos", "21988887777"),
        ("5531977776666@s.whatsapp.net", "Ana Costa", "31977776666"),
        ("5541966665555@s.whatsapp.net", "Pedro Ferreira", "41966665555"),
    ]
    
    contacts = []
    for jid, name, phone in contacts_data:
        existing = db.query(ChatContact).filter(ChatContact.remote_jid == jid).first()
        if existing:
            contacts.append(existing)
            print(f"  ~ Contact {name} already exists")
        else:
            contact = ChatContact(
                remote_jid=jid,
                push_name=name,
                phone_number=phone,
                first_contact_at=datetime.now() - timedelta(days=30),
                last_contact_at=datetime.now()
            )
            db.add(contact)
            contacts.append(contact)
            print(f"  + Created contact: {name}")
    
    db.commit()
    
    # Conversations with different statuses
    chats_data = [
        (contacts[0], ChatStatus.WAITING, None, "Cliente aguardando atendimento"),
        (contacts[1], ChatStatus.IN_PROGRESS, team_suporte, "Atendimento em andamento"),
        (contacts[2], ChatStatus.IN_PROGRESS, team_implantacao, "Implantação em andamento"),
        (contacts[3], ChatStatus.CLOSED, team_suporte, "Atendimento finalizado"),
        (contacts[4], ChatStatus.WAITING, None, "Novo cliente"),
    ]
    
    chats = []
    protocol_base = datetime.now().strftime("CHAT-%Y-%m")
    for i, (contact, status, team, desc) in enumerate(chats_data):
        existing = db.query(Chat).filter(Chat.contact_id == contact.id).first()
        if existing:
            chats.append(existing)
            print(f"  ~ Chat for {contact.push_name} already exists")
        else:
            protocol = f"{protocol_base}-{1000 + i:05d}"
            chat = Chat(
                protocol=protocol,
                contact_id=contact.id,
                status=status,
                team_id=team.id if team else None,
                chatbot_state=ChatbotState.WITH_AGENT if status == ChatStatus.IN_PROGRESS else ChatbotState.WELCOME,
                rating=8 if status == ChatStatus.CLOSED else None,
                closed_at=datetime.now() - timedelta(hours=2) if status == ChatStatus.CLOSED else None
            )
            db.add(chat)
            chats.append(chat)
            print(f"  + Created chat: {desc} ({status.value}) - {protocol}")
    
    db.commit()
    
    # Messages for each chat
    messages_templates = [
        # Chat 0 - Waiting
        [
            (False, "text", "Olá, preciso de ajuda com o sistema"),
            (True, "text", "Olá! Bem-vindo ao nosso atendimento. 👋"),
            (True, "text", "Por favor, selecione uma opção:\n1 - Suporte\n2 - Implantação\n3 - Comercial"),
        ],
        # Chat 1 - In Progress (Suporte)
        [
            (False, "text", "Boa tarde, estou com um problema no módulo fiscal"),
            (True, "text", "Olá! Em que posso ajudar?"),
            (False, "text", "O relatório de vendas não está gerando corretamente"),
            (True, "text", "Entendi. Vou verificar isso para você. Um momento."),
            (False, "image", None, "https://via.placeholder.com/400x300?text=Screenshot+Erro"),
            (True, "text", "Obrigado pela imagem! Já identifiquei o problema."),
        ],
        # Chat 2 - In Progress (Implantação)
        [
            (False, "text", "Olá, sou da empresa XYZ"),
            (True, "text", "Olá! Seja bem-vindo à nossa implantação."),
            (False, "text", "Quando podemos agendar a próxima etapa?"),
            (True, "text", "Podemos agendar para amanhã às 14h. Pode ser?"),
            (False, "text", "Perfeito! Confirmado."),
        ],
        # Chat 3 - Closed
        [
            (False, "text", "Preciso de suporte urgente"),
            (True, "text", "Olá! Vou te ajudar agora mesmo."),
            (False, "text", "O sistema está dando erro ao emitir nota"),
            (True, "text", "Entendi. Você pode tentar limpar o cache do navegador?"),
            (False, "text", "Funcionou! Muito obrigado!"),
            (True, "text", "Que ótimo! Por favor, avalie nosso atendimento de 1 a 10."),
            (False, "text", "8"),
            (True, "text", "Obrigado pela avaliação! Até a próxima. 👋"),
        ],
        # Chat 4 - New waiting
        [
            (False, "text", "Oi, gostaria de informações sobre o sistema"),
        ],
    ]
    
    for i, chat in enumerate(chats):
        if i < len(messages_templates):
            existing_msgs = db.query(ChatMessage).filter(ChatMessage.chat_id == chat.id).count()
            if existing_msgs > 0:
                print(f"  ~ Messages for chat {i+1} already exist")
                continue
                
            for j, msg_data in enumerate(messages_templates[i]):
                from_me = msg_data[0]
                msg_type = msg_data[1]
                content = msg_data[2] if len(msg_data) > 2 else None
                media_url = msg_data[3] if len(msg_data) > 3 else None
                
                message = ChatMessage(
                    chat_id=chat.id,
                    message_id=f"fake-msg-{chat.id}-{j}",
                    remote_jid=chat.contact.remote_jid,
                    from_me=from_me,
                    message_type=msg_type,
                    content=content,
                    media_url=media_url,
                    timestamp=datetime.now() - timedelta(minutes=(len(messages_templates[i]) - j) * 5)
                )
                db.add(message)
            print(f"  + Created {len(messages_templates[i])} messages for chat {i+1}")
    
    db.commit()


def run_seed():
    """Main seed function."""
    print("\n=== Chat Test Data Seed ===\n")
    
    db = SessionLocal()
    
    try:
        print("Creating fake chat data...")
        create_fake_chat_data(db)
        
        print("\n=== Seed completed! ===")
        print("\nYou can now test the chat interface at http://localhost:3000/chat")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
