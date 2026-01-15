/**
 * Chat page for WhatsApp conversations with Deep Blue design.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Layout, List, Avatar, Badge, Input, Button, Space, Typography, Tag, Spin,
    Empty, Tooltip, Dropdown, Modal, message, Select, Card, Popover
} from 'antd';
import {
    SendOutlined, UserOutlined, TeamOutlined, SwapOutlined, CloseCircleOutlined,
    SearchOutlined, ReloadOutlined, CheckCircleOutlined, MessageOutlined,
    SmileOutlined, PhoneOutlined, ThunderboltOutlined, EditOutlined,
    HistoryOutlined, EnterOutlined, PaperClipOutlined, FileOutlined,
    PlayCircleOutlined, SoundOutlined
} from '@ant-design/icons';
import { chatApi, teamsApi, usersApi, Chat, ChatMessage, ChatContact, QuickReply } from '../../services/api';
import type { Team, User as UserType } from '../../types';
import styles from './chat.module.css';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

// Component to lazy-load media from API
const MediaImage: React.FC<{ messageId: string; mediaUrl?: string; alt: string; style?: React.CSSProperties; onImageClick?: (src: string) => void }> = ({ messageId, mediaUrl, alt, style, onImageClick }) => {
    const [src, setSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (mediaUrl?.startsWith('data:')) {
            setSrc(mediaUrl);
            setLoading(false);
        } else {
            setLoading(true);
            chatApi.getMessageMedia(messageId)
                .then(response => {
                    setSrc(response.base64);
                    setLoading(false);
                })
                .catch(() => {
                    setError(true);
                    setLoading(false);
                });
        }
    }, [messageId, mediaUrl]);

    if (loading) {
        return <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: 8, minHeight: 100 }}><Spin /></div>;
    }

    if (error || !src) {
        return <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: 8, padding: 16, color: '#999' }}>
            <FileOutlined style={{ fontSize: 24, marginRight: 8 }} /> Mídia indisponível
        </div>;
    }

    return <img src={src} alt={alt} style={style} onClick={() => onImageClick?.(src)} />;
};

// Component to lazy-load audio from API
const MediaAudio: React.FC<{ messageId: string; mediaUrl?: string; style?: React.CSSProperties }> = ({ messageId, mediaUrl, style }) => {
    const [src, setSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Clean data URL format for browser compatibility
    const cleanDataUrl = (url: string): string => {
        // Fix malformed data URLs like "data:audio/ogg; codecs=opus;base64," 
        // to proper format "data:audio/ogg;base64,"
        return url.replace(/;\s*codecs=[^;]+;/i, ';');
    };

    useEffect(() => {
        if (mediaUrl?.startsWith('data:')) {
            setSrc(cleanDataUrl(mediaUrl));
            setLoading(false);
        } else {
            setLoading(true);
            chatApi.getMessageMedia(messageId)
                .then(response => {
                    const cleaned = cleanDataUrl(response.base64);
                    setSrc(cleaned);
                    setLoading(false);
                })
                .catch(() => {
                    setError(true);
                    setLoading(false);
                });
        }
    }, [messageId, mediaUrl]);

    if (loading) {
        return <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: 8, padding: 12 }}><Spin size="small" /> <span style={{ marginLeft: 8 }}>Carregando áudio...</span></div>;
    }

    if (error || !src) {
        return <div style={{ ...style, display: 'flex', alignItems: 'center', background: '#f0f0f0', borderRadius: 8, padding: 12, color: '#999' }}>
            <SoundOutlined style={{ fontSize: 20, marginRight: 8 }} /> Áudio indisponível
        </div>;
    }

    return <audio src={src} controls style={{ width: '100%', minWidth: 280, ...style }} />
};

// Component to lazy-load document from API
const MediaDocument: React.FC<{ messageId: string; mediaUrl?: string; filename?: string; style?: React.CSSProperties }> = ({ messageId, mediaUrl, filename, style }) => {
    const [src, setSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        if (src) {
            // Already have the data, trigger download
            const link = document.createElement('a');
            link.href = src;
            link.download = filename || 'documento';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        // Need to fetch first
        setDownloading(true);
        try {
            if (mediaUrl?.startsWith('data:')) {
                setSrc(mediaUrl);
                const link = document.createElement('a');
                link.href = mediaUrl;
                link.download = filename || 'documento';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                const response = await chatApi.getMessageMedia(messageId);
                setSrc(response.base64);
                const link = document.createElement('a');
                link.href = response.base64;
                link.download = filename || 'documento';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch {
            message.error('Erro ao baixar documento');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
            <FileOutlined style={{ fontSize: 24 }} />
            <Button
                type="link"
                onClick={handleDownload}
                loading={downloading || loading}
                style={{ padding: 0, color: 'inherit' }}
            >
                {filename || 'Documento'}
            </Button>
        </div>
    );
};

// Common emojis for quick access
const COMMON_EMOJIS = ['😊', '👍', '❤️', '😂', '🙏', '👋', '✅', '⭐', '🎉', '💯', '😁', '🤝', '👏', '🔥', '💪', '😍', '🙌', '✨', '💡', '📞'];

// Status colors
const statusColors: Record<string, string> = {
    waiting: '#faad14',
    in_progress: '#1064fe',
    closed: '#52c41a'
};

const statusLabels: Record<string, string> = {
    waiting: 'Aguardando',
    in_progress: 'Em Andamento',
    closed: 'Finalizado'
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
    const [statusFilter, setStatusFilter] = useState<string | undefined>('in_progress'); // Default to Active
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
    const [currentUserName, setCurrentUserName] = useState<string>('Atendente');
    const [transferTeamId, setTransferTeamId] = useState<string | null>(null);
    const [transferUserId, setTransferUserId] = useState<string | null>(null);
    const [teamUsers, setTeamUsers] = useState<UserType[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<any>(null);

    // Fetch conversations
    const fetchConversations = useCallback(async () => {
        try {
            // Note: If 'all' is selected (undefined), we might want to fetch all. 
            // The previous logic used statusFilter directly.
            // Design has "Active", "Waiting", "Closed".
            const status = statusFilter === 'all' ? undefined : statusFilter;
            const response = await chatApi.listConversations(1, 50, {
                status: status,
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
        } catch {
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
            // Ignore
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

    // Fetch ALL conversations for badge counts
    const fetchAllConversations = useCallback(async () => {
        try {
            const response = await chatApi.listConversations(1, 100, {});
            setAllConversations(response.items);
        } catch {
            // Ignore
        }
    }, []);

    // Fetch current user name from local storage
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                setCurrentUserName(user.name || 'Atendente');
            } catch {
                // Ignore
            }
        }
    }, []);

    // Fetch users for selected team in transfer modal
    const fetchTeamUsers = useCallback(async (teamId: string) => {
        try {
            const response = await usersApi.list(1, 100);
            // Filter users that belong to the selected team
            const usersInTeam = response.items.filter((u: UserType) =>
                u.teams?.some((t: any) => t.id === teamId)
            );
            setTeamUsers(usersInTeam);
        } catch {
            setTeamUsers([]);
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

        const interval = setInterval(() => {
            fetchConversations();
            fetchAllConversations();
        }, 10000);
        return () => clearInterval(interval);
    }, [fetchConversations, fetchTeams, fetchQuickReplies, fetchClassifications, fetchAllConversations]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSelectChat = (chat: Chat) => {
        setSelectedChat(chat);
        fetchMessages(chat.id);
    };

    const handleSendMessage = async () => {
        if (!messageText.trim() || !selectedChat) return;

        setSending(true);
        try {
            await chatApi.sendMessage(selectedChat.id, messageText);
            setMessageText('');
            setQuotedMessage(null); // Clear quote after send
            fetchMessages(selectedChat.id);
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao enviar mensagem');
        } finally {
            setSending(false);
        }
    };

    const handleSendMedia = async (file: File) => {
        if (!selectedChat) return;

        setSending(true);
        try {
            await chatApi.sendMedia(selectedChat.id, file);
            fetchMessages(selectedChat.id);
            message.success('Mídia enviada!');
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao enviar mídia');
        } finally {
            setSending(false);
        }
    };

    const handleFileUpload = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx';
        input.onchange = (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files[0]) {
                handleSendMedia(target.files[0]);
            }
        };
        input.click();
    };

    const handleTransfer = async (teamId: string, userId?: string) => {
        if (!selectedChat) return;
        try {
            await chatApi.transferChat(selectedChat.id, teamId, userId || undefined);
            message.success(userId ? 'Chat transferido para usuário' : 'Chat transferido para fila da equipe');
            setTransferModalOpen(false);
            setTransferTeamId(null);
            setTransferUserId(null);
            setTeamUsers([]);
            fetchConversations();
            const response = await chatApi.getConversation(selectedChat.id);
            setSelectedChat(response);
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao transferir');
        }
    };

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

    const handleReopenChat = async () => {
        if (!selectedChat) return;
        try {
            await chatApi.reopenChat(selectedChat.id);
            message.success('Chat reaberto');
            fetchConversations();
            fetchAllConversations();
            const updated = await chatApi.getConversation(selectedChat.id);
            setSelectedChat(updated);
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao reabrir');
        }
    };

    // Polling: atualiza lista de conversas a cada 5 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            fetchConversations();
            fetchAllConversations();
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchConversations, fetchAllConversations]);

    // Polling: atualiza mensagens do chat ativo a cada 3 segundos
    useEffect(() => {
        if (!selectedChat) return;
        const interval = setInterval(() => {
            fetchMessages(selectedChat.id);
        }, 3000);
        return () => clearInterval(interval);
    }, [selectedChat, fetchMessages]);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        if (diff < 60000) return 'Now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
        if (diff < 86400000) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    const getContactName = (contact?: ChatContact | null) => {
        if (!contact) return 'Unknown';
        return contact.custom_name || contact.push_name || contact.phone_number || 'Unknown';
    };

    const filteredConversations = conversations.filter(chat => {
        if (!searchText) return true;
        const name = getContactName(chat.contact);
        return name.toLowerCase().includes(searchText.toLowerCase()) ||
            chat.protocol.toLowerCase().includes(searchText.toLowerCase());
    });

    const statusCounts = {
        waiting: allConversations.filter(c => c.status === 'waiting').length,
        in_progress: allConversations.filter(c => c.status === 'in_progress').length,
    };

    return (
        <Layout className={styles.layout}>
            {/* Sidebar */}
            <Sider width={360} className={styles.sidebar} theme="light">
                <div className={styles.sidebarHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, background: '#1064fe', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                            {currentUserName.charAt(0).toUpperCase()}
                        </div>
                        <Title level={5} style={{ margin: 0 }}>{currentUserName}</Title>
                    </div>
                    <div className={styles.searchContainer}>
                        <SearchOutlined style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8', zIndex: 1 }} />
                        <Input
                            placeholder="Buscar tickets ou clientes..."
                            className={styles.searchInput}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.filterTabs}>
                    <button
                        className={`${styles.filterTab} ${statusFilter === 'in_progress' ? styles.filterTabActive : ''}`}
                        onClick={() => setStatusFilter('in_progress')}
                    >
                        Em Andamento ({statusCounts.in_progress})
                    </button>
                    <button
                        className={`${styles.filterTab} ${statusFilter === 'waiting' ? styles.filterTabActive : ''}`}
                        onClick={() => setStatusFilter('waiting')}
                    >
                        Aguardando ({statusCounts.waiting})
                    </button>
                    <button
                        className={`${styles.filterTab} ${statusFilter === 'closed' ? styles.filterTabActive : ''}`}
                        onClick={() => setStatusFilter('closed')}
                    >
                        Finalizado
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
                    ) : (
                        <List
                            dataSource={filteredConversations}
                            renderItem={chat => (
                                <div
                                    className={`${styles.chatItem} ${selectedChat?.id === chat.id ? styles.chatItemActive : ''}`}
                                    onClick={() => handleSelectChat(chat)}
                                >
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <Badge dot color={statusColors[chat.status]} offset={[-4, 38]}>
                                            <Avatar size={48} icon={<UserOutlined />} style={{ backgroundColor: '#e2e8f0', color: '#64748b' }} />
                                        </Badge>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Text strong style={{ fontSize: 14 }}>{getContactName(chat.contact)}</Text>
                                                <Text type="secondary" style={{ fontSize: 11 }}>{formatTime(chat.updated_at)}</Text>
                                            </div>
                                            <Text type="secondary" ellipsis style={{ fontSize: 12, display: 'block' }}>
                                                Ticket #{chat.protocol}
                                            </Text>
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                    )}
                </div>
            </Sider>

            {/* Main Chat Area */}
            <Content style={{ display: 'flex', flexDirection: 'column', background: '#fff', height: '100%', overflow: 'hidden' }}>
                {!selectedChat ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
                        <MessageOutlined style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }} />
                        <Text type="secondary">Selecione uma conversa para iniciar</Text>
                    </div>
                ) : (
                    <>
                        <div className={styles.chatHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Title level={4} style={{ margin: 0, fontSize: 18 }}>{getContactName(selectedChat.contact)}</Title>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<EditOutlined />}
                                    onClick={() => {
                                        setEditContactName(selectedChat.contact?.custom_name || selectedChat.contact?.push_name || '');
                                        setEditContactModalOpen(true);
                                    }}
                                />
                            </div>
                            <Space>
                                {showMessageSearch ? (
                                    <Input
                                        placeholder="Buscar na conversa..."
                                        value={messageSearchText}
                                        onChange={e => setMessageSearchText(e.target.value)}
                                        style={{ width: 200 }}
                                        suffix={<CloseCircleOutlined onClick={() => { setShowMessageSearch(false); setMessageSearchText(''); }} />}
                                    />
                                ) : (
                                    <Button className={styles.actionButton} icon={<SearchOutlined />} onClick={() => setShowMessageSearch(true)}>Buscar</Button>
                                )}
                                <Button className={styles.actionButton} icon={<SwapOutlined />} onClick={() => setTransferModalOpen(true)}>Transferir</Button>
                                {selectedChat.status !== 'closed' ? (
                                    <Button
                                        type="primary"
                                        className={styles.actionButton}
                                        style={{ background: '#1064fe', boxShadow: '0 4px 12px rgba(16, 100, 254, 0.2)' }}
                                        icon={<CheckCircleOutlined />}
                                        onClick={() => setCloseModalOpen(true)}
                                    >
                                        Resolver Ticket
                                    </Button>
                                ) : (
                                    <Button type="primary" onClick={handleReopenChat}>Reabrir</Button>
                                )}
                            </Space>
                        </div>

                        <div className={styles.messageContainer}>
                            {/* Date Separator */}
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <span style={{ background: '#f8fafc', padding: '4px 12px', borderRadius: 99, fontSize: 12, color: '#64748b', fontWeight: 500 }}>Hoje</span>
                            </div>

                            {messages
                                .filter(msg => !messageSearchText || msg.content?.toLowerCase().includes(messageSearchText.toLowerCase()))
                                .map(msg => (
                                    <div
                                        key={msg.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: msg.from_me ? 'flex-end' : 'flex-start',
                                            marginBottom: 16,
                                            gap: 12
                                        }}
                                    >
                                        {!msg.from_me && <Avatar size={32} icon={<UserOutlined />} />}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.from_me ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                                            <div
                                                className={`${styles.messageBubble} ${msg.from_me ? styles.messageStaff : styles.messageClient}`}
                                                style={{ position: 'relative', whiteSpace: 'pre-wrap' }}
                                            >
                                                {/* Render media based on message type */}
                                                {msg.message_type === 'image' && (
                                                    <MediaImage
                                                        messageId={msg.id}
                                                        mediaUrl={msg.media_url}
                                                        alt="Imagem"
                                                        style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, marginBottom: msg.content ? 8 : 0, cursor: 'pointer' }}
                                                        onImageClick={(src) => setMediaPreview({ url: src, type: 'image' })}
                                                    />
                                                )}
                                                {msg.message_type === 'video' && msg.media_url && (
                                                    <video
                                                        src={msg.media_url}
                                                        controls
                                                        style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, marginBottom: msg.content ? 8 : 0 }}
                                                    />
                                                )}
                                                {msg.message_type === 'audio' && (
                                                    <MediaAudio
                                                        messageId={msg.id}
                                                        mediaUrl={msg.media_url}
                                                        style={{ marginBottom: msg.content ? 8 : 0 }}
                                                    />
                                                )}
                                                {msg.message_type === 'document' && (
                                                    <MediaDocument
                                                        messageId={msg.id}
                                                        mediaUrl={msg.media_url}
                                                        filename={msg.media_filename}
                                                        style={{ marginBottom: msg.content ? 8 : 0 }}
                                                    />
                                                )}
                                                {msg.message_type === 'sticker' && msg.media_url && (
                                                    <img
                                                        src={msg.media_url}
                                                        alt="Sticker"
                                                        style={{ maxWidth: 150, maxHeight: 150 }}
                                                    />
                                                )}
                                                {/* Text content (or caption for media) */}
                                                {msg.content && <span>{msg.content}</span>}
                                                {/* Reply button */}
                                                {!msg.from_me && (
                                                    <Tooltip title="Responder">
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<EnterOutlined />}
                                                            onClick={() => setQuotedMessage(msg)}
                                                            style={{ position: 'absolute', right: -32, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}
                                                        />
                                                    </Tooltip>
                                                )}
                                            </div>
                                            <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
                                                {msg.from_me ? 'Você' : getContactName(selectedChat.contact)} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </div>
                                        {msg.from_me && <Avatar size={32} src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqdPZPXzhrQSxnSLRNUxsZDfjnLb1UL-2GPHbNYFpaYe0nfr2WDMFKAtu34RINierXsilyKHrg25G8guK45DJa_DA4aKe84hLcArNTaj_Gyg45MfwSjbwn0MnbC9mOBbxufpQGHgOGvRMQHzdffvYCLGbHIt5ww9xgLR4PWYLfIJkZ2CQEP1S0_19ji2lwsEZAX6TfVFQX27dNtlQ82O99pkFT9yHZXwajtMIIrfkREdCifZ0EBZDaleb1R1ta-f6UD4asnXuG6N4j" />}
                                    </div>
                                ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className={styles.inputArea}>
                            {quotedMessage && (
                                <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11 }}>Respondendo a:</Text>
                                        <Text style={{ fontSize: 13, display: 'block' }}>{quotedMessage.content?.substring(0, 50)}...</Text>
                                    </div>
                                    <Button type="text" size="small" icon={<CloseCircleOutlined />} onClick={() => setQuotedMessage(null)} />
                                </div>
                            )}
                            <div className={styles.inputBar}>
                                <Button type="text" shape="circle" icon={<SearchOutlined style={{ fontSize: 20, color: '#94a3b8' }} />} />
                                <TextArea
                                    className={styles.inputField}
                                    placeholder="Digite sua resposta..."
                                    autoSize
                                    value={messageText}
                                    onChange={e => setMessageText(e.target.value)}
                                    ref={inputRef}
                                    onPressEnter={(e) => {
                                        if (!e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <Space>
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
                                        <Button type="text" shape="circle" icon={<SmileOutlined style={{ fontSize: 20, color: '#94a3b8' }} />} />
                                    </Popover>
                                    <Tooltip title="Anexar arquivo">
                                        <Button
                                            type="text"
                                            shape="circle"
                                            icon={<PaperClipOutlined style={{ fontSize: 20, color: '#94a3b8' }} />}
                                            onClick={handleFileUpload}
                                        />
                                    </Tooltip>
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
                                        <Button type="text" shape="circle" icon={<ThunderboltOutlined style={{ fontSize: 20, color: '#94a3b8' }} />} />
                                    </Dropdown>
                                    <Button
                                        type="primary"
                                        shape="circle"
                                        icon={<SendOutlined />}
                                        size="large"
                                        style={{ background: '#1064fe', boxShadow: '0 4px 10px rgba(16, 100, 254, 0.3)' }}
                                        onClick={handleSendMessage}
                                        loading={sending}
                                    />
                                </Space>
                            </div>
                            <div style={{ textAlign: 'center', marginTop: 8 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>Pressione <Text strong>Enter</Text> para enviar</Text>
                            </div>
                        </div>
                    </>
                )}
            </Content>

            {/* Modals placed here for context */}
            <Modal
                title="Transferir Conversa"
                open={transferModalOpen}
                onCancel={() => {
                    setTransferModalOpen(false);
                    setTransferTeamId(null);
                    setTransferUserId(null);
                    setTeamUsers([]);
                }}
                onOk={() => {
                    if (transferTeamId) {
                        handleTransfer(transferTeamId, transferUserId || undefined);
                    }
                }}
                okText={transferUserId ? 'Transferir para Usuário' : 'Transferir para Fila'}
                okButtonProps={{ disabled: !transferTeamId }}
            >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                        <Text strong>Equipe:</Text>
                        <Select
                            placeholder="Selecione a equipe"
                            value={transferTeamId}
                            onChange={(value) => {
                                setTransferTeamId(value);
                                setTransferUserId(null);
                                if (value) fetchTeamUsers(value);
                            }}
                            style={{ width: '100%', marginTop: 8 }}
                        >
                            {teams.map(team => (
                                <Select.Option key={team.id} value={team.id}>{team.name}</Select.Option>
                            ))}
                        </Select>
                    </div>
                    {transferTeamId && (
                        <div>
                            <Text strong>Usuário (opcional):</Text>
                            <Select
                                placeholder="Deixe vazio para fila geral"
                                value={transferUserId}
                                onChange={setTransferUserId}
                                style={{ width: '100%', marginTop: 8 }}
                                allowClear
                            >
                                {teamUsers.map(user => (
                                    <Select.Option key={user.id} value={user.id}>{user.name}</Select.Option>
                                ))}
                            </Select>
                            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                                {transferUserId ? 'O chamado irá para "Em Andamento" do usuário selecionado' : 'O chamado irá para a fila "Aguardando" da equipe'}
                            </Text>
                        </div>
                    )}
                </Space>
            </Modal>

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
                            {classifications.map(c => <Select.Option key={c.id} value={c.name}>{c.name}</Select.Option>)}
                        </Select>
                    </div>
                    <div>
                        <Text>Comentários finais:</Text>
                        <TextArea
                            value={closingComments}
                            onChange={e => setClosingComments(e.target.value)}
                            style={{ marginTop: 8 }}
                        />
                    </div>
                </Space>
            </Modal>

            <Modal
                title="Editar Contato"
                open={editContactModalOpen}
                onCancel={() => setEditContactModalOpen(false)}
                onOk={handleEditContactName}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>Nome do contato:</Text>
                    <Input
                        value={editContactName}
                        onChange={e => setEditContactName(e.target.value)}
                    />
                </Space>
            </Modal>

            {/* Image Preview Modal */}
            <Modal
                open={!!mediaPreview}
                footer={null}
                onCancel={() => setMediaPreview(null)}
                width="80%"
                centered
                styles={{ body: { padding: 0, textAlign: 'center', background: '#000' } }}
            >
                {mediaPreview && (
                    <img
                        src={mediaPreview.url}
                        alt="Preview"
                        style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                    />
                )}
            </Modal>
        </Layout>
    );
};

export default ChatPage;
