/**
 * Chat page for WhatsApp conversations.
 * Features a split view: conversation list on the left, chat detail on the right.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Layout, List, Avatar, Badge, Input, Button, Space, Typography, Tag, Spin,
    Empty, Tooltip, Dropdown, Modal, message, Card, Popover, Select
} from 'antd';
import {
    SendOutlined, UserOutlined, TeamOutlined, SwapOutlined, CloseCircleOutlined,
    SearchOutlined, ReloadOutlined, CheckCircleOutlined, MessageOutlined,
    SmileOutlined, PhoneOutlined, ThunderboltOutlined, EditOutlined
} from '@ant-design/icons';
import { chatApi, teamsApi, Chat, ChatMessage, ChatContact, QuickReply } from '../../services/api';
import type { Team } from '../../types';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

// Common emojis for quick access
const COMMON_EMOJIS = ['😊', '👍', '❤️', '😂', '🙏', '👋', '✅', '⭐', '🎉', '💯', '😁', '🤝', '👏', '🔥', '💪', '😍', '🙌', '✨', '💡', '📞'];

// Status colors
const statusColors: Record<string, string> = {
    waiting: '#faad14',
    in_progress: '#1890ff',
    closed: '#52c41a'
};

const statusLabels: Record<string, string> = {
    waiting: 'Aguardando',
    in_progress: 'Em Atendimento',
    closed: 'Encerrado'
};

const ChatPage: React.FC = () => {
    // State
    const [conversations, setConversations] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [teams, setTeams] = useState<Team[]>([]);
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [closeModalOpen, setCloseModalOpen] = useState(false);
    const [closingClassification, setClosingClassification] = useState<string | undefined>();
    const [closingComments, setClosingComments] = useState('');
    const [classifications, setClassifications] = useState<{ id: string; name: string }[]>([]);
    const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [editContactModalOpen, setEditContactModalOpen] = useState(false);
    const [editContactName, setEditContactName] = useState('');
    const [messageSearchText, setMessageSearchText] = useState('');
    const [showMessageSearch, setShowMessageSearch] = useState(false);
    const [quotedMessage, setQuotedMessage] = useState<ChatMessage | null>(null);
    const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string } | null>(null);
    const [allConversations, setAllConversations] = useState<Chat[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<any>(null);

    // Fetch conversations
    const fetchConversations = useCallback(async () => {
        try {
            const response = await chatApi.listConversations(1, 50, {
                status: statusFilter,
            });
            setConversations(response.items);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    // Fetch teams
    const fetchTeams = useCallback(async () => {
        try {
            const response = await teamsApi.list(1, 100);
            setTeams(response.items);
        } catch {
            // Ignore
        }
    }, []);

    // Fetch messages for selected chat
    const fetchMessages = useCallback(async (chatId: string) => {
        setLoadingMessages(true);
        try {
            const msgs = await chatApi.getMessages(chatId);
            setMessages(msgs);
        } catch (error) {
            message.error('Erro ao carregar mensagens');
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    // Fetch quick replies
    const fetchQuickReplies = useCallback(async () => {
        try {
            const replies = await chatApi.listQuickReplies();
            setQuickReplies(replies);
        } catch {
            // Ignore - quick replies are optional
        }
    }, []);

    // Fetch classifications
    const fetchClassifications = useCallback(async () => {
        try {
            const list = await chatApi.listClassifications();
            setClassifications(list);
        } catch {
            // Ignore
        }
    }, []);

    // Fetch ALL conversations for badge counts (not filtered)
    const fetchAllConversations = useCallback(async () => {
        try {
            const response = await chatApi.listConversations(1, 100, {});
            setAllConversations(response.items);
        } catch {
            // Ignore
        }
    }, []);

    // Handle edit contact name
    const handleEditContactName = async () => {
        if (!selectedChat?.contact) return;
        try {
            await chatApi.updateContact(selectedChat.contact.id, { custom_name: editContactName });
            message.success('Nome atualizado');
            setEditContactModalOpen(false);
            fetchConversations();
            // Update selected chat
            const updated = await chatApi.getConversation(selectedChat.id);
            setSelectedChat(updated);
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao atualizar');
        }
    };

    useEffect(() => {
        fetchConversations();
        fetchTeams();
        fetchQuickReplies();
        fetchClassifications();
        fetchAllConversations();

        // Poll for new conversations every 10 seconds
        const interval = setInterval(() => {
            fetchConversations();
            fetchAllConversations();
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchConversations, fetchTeams, fetchQuickReplies, fetchClassifications, fetchAllConversations]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Select a conversation
    const handleSelectChat = (chat: Chat) => {
        setSelectedChat(chat);
        fetchMessages(chat.id);
    };

    // Send message
    const handleSendMessage = async () => {
        if (!messageText.trim() || !selectedChat) return;

        setSending(true);
        try {
            await chatApi.sendMessage(selectedChat.id, messageText);
            setMessageText('');
            // Refresh messages
            fetchMessages(selectedChat.id);
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao enviar mensagem');
        } finally {
            setSending(false);
        }
    };

    // Transfer chat
    const handleTransfer = async (teamId: string, userId?: string) => {
        if (!selectedChat) return;

        try {
            await chatApi.transferChat(selectedChat.id, teamId, userId);
            message.success('Chat transferido com sucesso');
            setTransferModalOpen(false);
            fetchConversations();
            // Refresh selected chat
            const response = await chatApi.getConversation(selectedChat.id);
            setSelectedChat(response);
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao transferir');
        }
    };

    // Close chat
    const handleCloseChat = async () => {
        if (!selectedChat) return;

        try {
            await chatApi.closeChat(selectedChat.id, {
                classification: closingClassification || undefined,
                closing_comments: closingComments || undefined
            });
            message.success('Chat encerrado');
            setCloseModalOpen(false);
            setClosingClassification(undefined);
            setClosingComments('');
            fetchConversations();
            fetchAllConversations();
            setSelectedChat(null);
            setMessages([]);
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao encerrar');
        }
    };

    // Reopen closed chat
    const handleReopenChat = async () => {
        if (!selectedChat) return;

        try {
            await chatApi.reopenChat(selectedChat.id);
            message.success('Chat reaberto - voltou para fila de espera');
            fetchConversations();
            fetchAllConversations();
            // Update selected chat
            const updated = await chatApi.getConversation(selectedChat.id);
            setSelectedChat(updated);
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao reabrir');
        }
    };

    // Format time
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Agora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
        if (diff < 86400000) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    // Get contact display name
    const getContactName = (contact?: ChatContact | null) => {
        if (!contact) return 'Desconhecido';
        return contact.custom_name || contact.push_name || contact.phone_number || 'Desconhecido';
    };

    // Filter conversations
    const filteredConversations = conversations.filter(chat => {
        if (!searchText) return true;
        const name = getContactName(chat.contact);
        return name.toLowerCase().includes(searchText.toLowerCase()) ||
            chat.protocol.toLowerCase().includes(searchText.toLowerCase());
    });

    // Count conversations by status (from ALL conversations, not filtered)
    const statusCounts = {
        waiting: allConversations.filter(c => c.status === 'waiting').length,
        in_progress: allConversations.filter(c => c.status === 'in_progress').length,
    };

    return (
        <Layout style={{ height: 'calc(100vh - 64px)', background: '#f0f2f5' }}>
            {/* Conversations List */}
            <Sider
                width={420}
                style={{
                    background: '#ffffff',
                    borderRight: '1px solid #e8e8e8',
                    overflow: 'auto'
                }}
            >
                {/* Header */}
                <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e8e8e8', background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Title level={4} style={{ margin: 0, color: '#262626' }}>
                            <MessageOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                            Conversas
                        </Title>
                        <Tooltip title="Atualizar">
                            <Button
                                icon={<ReloadOutlined />}
                                size="small"
                                onClick={fetchConversations}
                            />
                        </Tooltip>
                    </div>
                    <Input
                        placeholder="Buscar conversa..."
                        prefix={<SearchOutlined style={{ color: '#999' }} />}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        allowClear
                        style={{ marginBottom: 12 }}
                    />
                    {/* Status Filter Tabs */}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                        <Badge count={statusCounts.waiting} size="small" offset={[-5, 0]} showZero>
                            <Button
                                size="small"
                                type={statusFilter === 'waiting' ? 'primary' : 'default'}
                                onClick={() => setStatusFilter(statusFilter === 'waiting' ? undefined : 'waiting')}
                                style={{
                                    borderColor: statusFilter === 'waiting' ? '#faad14' : undefined,
                                    backgroundColor: statusFilter === 'waiting' ? '#faad14' : undefined,
                                }}
                            >
                                🟡 Aguardando
                            </Button>
                        </Badge>
                        <Badge count={statusCounts.in_progress} size="small" offset={[-5, 0]} showZero>
                            <Button
                                size="small"
                                type={statusFilter === 'in_progress' ? 'primary' : 'default'}
                                onClick={() => setStatusFilter(statusFilter === 'in_progress' ? undefined : 'in_progress')}
                                style={{
                                    borderColor: statusFilter === 'in_progress' ? '#1890ff' : undefined,
                                }}
                            >
                                🔵 Atendendo
                            </Button>
                        </Badge>
                        <Button
                            size="small"
                            type={statusFilter === 'closed' ? 'primary' : 'default'}
                            onClick={() => setStatusFilter(statusFilter === 'closed' ? undefined : 'closed')}
                            style={{
                                borderColor: statusFilter === 'closed' ? '#52c41a' : undefined,
                                backgroundColor: statusFilter === 'closed' ? '#52c41a' : undefined,
                            }}
                        >
                            🟢 Encerrado
                        </Button>
                    </div>
                </div>

                {/* Conversations */}
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <Spin />
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <Empty
                        description={<Text style={{ color: '#fff' }}>Nenhuma conversa</Text>}
                        style={{ padding: 40 }}
                    />
                ) : (
                    <List
                        dataSource={filteredConversations}
                        renderItem={chat => (
                            <List.Item
                                onClick={() => handleSelectChat(chat)}
                                style={{
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    background: selectedChat?.id === chat.id ? '#1890ff' : 'transparent',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                                }}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <Badge
                                            dot
                                            color={statusColors[chat.status] || '#999'}
                                            offset={[-4, 32]}
                                        >
                                            <Avatar
                                                icon={<UserOutlined />}
                                                style={{ backgroundColor: '#1890ff' }}
                                            />
                                        </Badge>
                                    }
                                    title={
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text strong ellipsis style={{ maxWidth: 150, color: selectedChat?.id === chat.id ? '#fff' : '#fff' }}>
                                                {getContactName(chat.contact)}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                                                {formatTime(chat.updated_at)}
                                            </Text>
                                        </div>
                                    }
                                    description={
                                        <div>
                                            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                                                #{chat.protocol}
                                            </Text>
                                            <Tag
                                                color={statusColors[chat.status]}
                                                style={{ marginLeft: 8, fontSize: 10 }}
                                            >
                                                {statusLabels[chat.status] || chat.status}
                                            </Tag>
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </Sider>

            {/* Chat Detail */}
            <Content style={{ display: 'flex', flexDirection: 'column', background: '#fff' }}>
                {!selectedChat ? (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        color: '#999'
                    }}>
                        <MessageOutlined style={{ fontSize: 64, marginBottom: 16 }} />
                        <Text type="secondary">Selecione uma conversa</Text>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f0f0f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Space>
                                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                                <div>
                                    <Space size="small">
                                        <Text strong>{getContactName(selectedChat.contact)}</Text>
                                        <Tooltip title="Editar nome">
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<EditOutlined />}
                                                onClick={() => {
                                                    setEditContactName(getContactName(selectedChat.contact));
                                                    setEditContactModalOpen(true);
                                                }}
                                            />
                                        </Tooltip>
                                    </Space>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        <PhoneOutlined /> {selectedChat.contact?.phone_number || 'N/A'}
                                    </Text>
                                </div>
                            </Space>
                            <Space>
                                <Tag color={statusColors[selectedChat.status]}>
                                    {statusLabels[selectedChat.status]}
                                </Tag>
                                {selectedChat.status !== 'closed' && (
                                    <>
                                        <Tooltip title="Transferir">
                                            <Button
                                                icon={<SwapOutlined />}
                                                onClick={() => setTransferModalOpen(true)}
                                            />
                                        </Tooltip>
                                        <Tooltip title="Encerrar">
                                            <Button
                                                icon={<CloseCircleOutlined />}
                                                danger
                                                onClick={() => setCloseModalOpen(true)}
                                            />
                                        </Tooltip>
                                    </>
                                )}
                                {selectedChat.status === 'closed' && (
                                    <Tooltip title="Reabrir conversa">
                                        <Button
                                            icon={<CheckCircleOutlined />}
                                            type="primary"
                                            onClick={handleReopenChat}
                                        >
                                            Reabrir
                                        </Button>
                                    </Tooltip>
                                )}
                                <Tooltip title={showMessageSearch ? "Fechar busca" : "Buscar mensagens"}>
                                    <Button
                                        icon={<SearchOutlined />}
                                        type={showMessageSearch ? 'primary' : 'default'}
                                        onClick={() => {
                                            setShowMessageSearch(!showMessageSearch);
                                            if (showMessageSearch) setMessageSearchText('');
                                        }}
                                    />
                                </Tooltip>
                            </Space>
                        </div>

                        {/* Messages Area */}
                        <div style={{
                            flex: 1,
                            overflow: 'auto',
                            padding: 16,
                            background: '#f5f5f5'
                        }}>
                            {loadingMessages ? (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <Spin />
                                </div>
                            ) : messages.length === 0 ? (
                                <Empty description="Nenhuma mensagem" />
                            ) : (
                                <Space direction="vertical" style={{ width: '100%' }} size="small">
                                    {/* Message Search */}
                                    {showMessageSearch && (
                                        <div style={{ padding: 8, background: '#fff', borderRadius: 4, marginBottom: 8 }}>
                                            <Input
                                                placeholder="Buscar na conversa..."
                                                prefix={<SearchOutlined />}
                                                value={messageSearchText}
                                                onChange={e => setMessageSearchText(e.target.value)}
                                                allowClear
                                                size="small"
                                            />
                                        </div>
                                    )}
                                    {messages
                                        .filter(msg => !messageSearchText ||
                                            (msg.content?.toLowerCase().includes(messageSearchText.toLowerCase())))
                                        .map(msg => (
                                            <div
                                                key={msg.id}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: msg.from_me ? 'flex-end' : 'flex-start'
                                                }}
                                            >
                                                <Card
                                                    size="small"
                                                    style={{
                                                        maxWidth: '70%',
                                                        background: msg.from_me ? '#dcf8c6' : '#fff',
                                                        borderRadius: 8,
                                                        cursor: 'pointer'
                                                    }}
                                                    bodyStyle={{ padding: '8px 12px' }}
                                                    onClick={() => {
                                                        if (selectedChat?.status !== 'closed') {
                                                            setQuotedMessage(msg);
                                                        }
                                                    }}
                                                >
                                                    {/* Quoted message reference */}
                                                    {msg.quoted_message_id && (
                                                        <div style={{
                                                            borderLeft: '3px solid #1890ff',
                                                            paddingLeft: 8,
                                                            marginBottom: 4,
                                                            fontSize: 12,
                                                            color: '#666',
                                                            background: 'rgba(0,0,0,0.03)',
                                                            padding: '4px 8px',
                                                            borderRadius: 4
                                                        }}>
                                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                                ↩ Respondendo...
                                                            </Text>
                                                        </div>
                                                    )}
                                                    {/* Media content */}
                                                    {msg.message_type === 'image' && msg.media_url && (
                                                        <img
                                                            src={msg.media_url}
                                                            alt="Imagem"
                                                            style={{ maxWidth: '100%', borderRadius: 4, marginBottom: 4, cursor: 'pointer' }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMediaPreview({ url: msg.media_url!, type: 'image' });
                                                            }}
                                                        />
                                                    )}
                                                    {msg.message_type === 'audio' && msg.media_url && (
                                                        <audio controls style={{ width: '100%', marginBottom: 4 }}>
                                                            <source src={msg.media_url} type={msg.media_mimetype || 'audio/ogg'} />
                                                        </audio>
                                                    )}
                                                    {msg.message_type === 'video' && msg.media_url && (
                                                        <video
                                                            controls
                                                            style={{ maxWidth: '100%', borderRadius: 4, marginBottom: 4 }}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <source src={msg.media_url} type={msg.media_mimetype || 'video/mp4'} />
                                                        </video>
                                                    )}
                                                    {msg.message_type === 'document' && msg.media_url && (
                                                        <a href={msg.media_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                                                            📄 {msg.media_filename || 'Documento'}
                                                        </a>
                                                    )}
                                                    {/* Text content */}
                                                    {msg.content && <Text>{msg.content}</Text>}
                                                    {!msg.content && !msg.media_url && <Text type="secondary">[Mensagem sem conteúdo]</Text>}
                                                    {/* Timestamp and status */}
                                                    <div style={{ textAlign: 'right', marginTop: 4 }}>
                                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                                            {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                            {msg.from_me && (
                                                                <CheckCircleOutlined
                                                                    style={{
                                                                        marginLeft: 4,
                                                                        color: msg.status === 'read' ? '#34b7f1' : '#999'
                                                                    }}
                                                                />
                                                            )}
                                                        </Text>
                                                    </div>
                                                </Card>
                                            </div>
                                        ))}
                                    <div ref={messagesEndRef} />
                                </Space>
                            )}
                        </div>

                        {/* Input Area */}
                        {selectedChat.status !== 'closed' && (
                            <div style={{
                                padding: '12px 16px',
                                borderTop: '1px solid #e8e8e8',
                                background: '#fff'
                            }}>
                                {/* Quoted Message Bar */}
                                {quotedMessage && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: '#f0f2f5',
                                        padding: '8px 12px',
                                        borderRadius: 4,
                                        marginBottom: 8,
                                        borderLeft: '3px solid #1890ff'
                                    }}>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                ↩ Respondendo a:
                                            </Text>
                                            <Text style={{ display: 'block', fontSize: 12 }}>
                                                {quotedMessage.content?.substring(0, 50) || '[Mídia]'}
                                                {quotedMessage.content && quotedMessage.content.length > 50 && '...'}
                                            </Text>
                                        </div>
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<CloseCircleOutlined />}
                                            onClick={() => setQuotedMessage(null)}
                                        />
                                    </div>
                                )}
                                {/* Toolbar */}
                                <div style={{ marginBottom: 8, display: 'flex', gap: 4 }}>
                                    <Popover
                                        trigger="click"
                                        open={showEmojiPicker}
                                        onOpenChange={setShowEmojiPicker}
                                        placement="topLeft"
                                        content={
                                            <div style={{ width: 200 }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                    {COMMON_EMOJIS.map(emoji => (
                                                        <Button
                                                            key={emoji}
                                                            size="small"
                                                            type="text"
                                                            style={{ fontSize: 18, padding: 4 }}
                                                            onClick={() => {
                                                                setMessageText(prev => prev + emoji);
                                                                setShowEmojiPicker(false);
                                                            }}
                                                        >
                                                            {emoji}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        }
                                    >
                                        <Tooltip title="Emojis">
                                            <Button icon={<SmileOutlined />} size="small" />
                                        </Tooltip>
                                    </Popover>
                                    <Dropdown
                                        trigger={['click']}
                                        menu={{
                                            items: quickReplies.length > 0
                                                ? quickReplies.map(qr => ({
                                                    key: qr.id,
                                                    label: qr.title,
                                                    onClick: () => setMessageText(qr.content)
                                                }))
                                                : [{ key: 'empty', label: 'Nenhuma resposta rápida', disabled: true }]
                                        }}
                                    >
                                        <Tooltip title="Respostas Rápidas">
                                            <Button icon={<ThunderboltOutlined />} size="small" />
                                        </Tooltip>
                                    </Dropdown>
                                </div>
                                {/* Input */}
                                <Space.Compact style={{ width: '100%' }}>
                                    <TextArea
                                        ref={inputRef}
                                        placeholder="Digite sua mensagem..."
                                        value={messageText}
                                        onChange={e => setMessageText(e.target.value)}
                                        onPressEnter={e => {
                                            if (!e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        autoSize={{ minRows: 1, maxRows: 4 }}
                                        style={{ flex: 1 }}
                                    />
                                    <Button
                                        type="primary"
                                        icon={<SendOutlined />}
                                        loading={sending}
                                        onClick={handleSendMessage}
                                    >
                                        Enviar
                                    </Button>
                                </Space.Compact>
                            </div>
                        )}
                    </>
                )}
            </Content>

            {/* Transfer Modal */}
            <Modal
                title="Transferir Conversa"
                open={transferModalOpen}
                onCancel={() => setTransferModalOpen(false)}
                footer={null}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>Selecione a equipe para transferir:</Text>
                    {teams.map(team => (
                        <Button
                            key={team.id}
                            block
                            icon={<TeamOutlined />}
                            onClick={() => handleTransfer(team.id)}
                        >
                            {team.name}
                        </Button>
                    ))}
                </Space>
            </Modal>

            {/* Close Modal */}
            <Modal
                title="Encerrar Conversa"
                open={closeModalOpen}
                onCancel={() => setCloseModalOpen(false)}
                onOk={handleCloseChat}
                okText="Encerrar"
                okButtonProps={{ danger: true }}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                        <Text>Classificação do atendimento:</Text>
                        <Select
                            placeholder="Selecione uma classificação"
                            value={closingClassification}
                            onChange={setClosingClassification}
                            style={{ width: '100%', marginTop: 8 }}
                            allowClear
                        >
                            {classifications.map(c => (
                                <Select.Option key={c.id} value={c.name}>
                                    {c.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Text>Comentários (opcional):</Text>
                        <TextArea
                            rows={3}
                            placeholder="Observações sobre o atendimento..."
                            value={closingComments}
                            onChange={e => setClosingComments(e.target.value)}
                        />
                    </div>
                </Space>
            </Modal>

            {/* Edit Contact Modal */}
            <Modal
                title="Editar Nome do Contato"
                open={editContactModalOpen}
                onCancel={() => setEditContactModalOpen(false)}
                onOk={handleEditContactName}
                okText="Salvar"
            >
                <Input
                    placeholder="Nome personalizado"
                    value={editContactName}
                    onChange={e => setEditContactName(e.target.value)}
                />
            </Modal>

            {/* Media Preview Modal */}
            <Modal
                title={null}
                open={!!mediaPreview}
                onCancel={() => setMediaPreview(null)}
                footer={null}
                width="auto"
                centered
                bodyStyle={{ padding: 0, textAlign: 'center' }}
            >
                {mediaPreview?.type === 'image' && (
                    <img
                        src={mediaPreview.url}
                        alt="Preview"
                        style={{ maxWidth: '90vw', maxHeight: '80vh' }}
                    />
                )}
            </Modal>
        </Layout >
    );
};

export default ChatPage;
