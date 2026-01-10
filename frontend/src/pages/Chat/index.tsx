/**
 * Chat page for WhatsApp conversations.
 * Features a split view: conversation list on the left, chat detail on the right.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Layout, List, Avatar, Badge, Input, Button, Space, Typography, Tag, Spin,
    Empty, Tooltip, Dropdown, Modal, Select, Rate, message, Card
} from 'antd';
import {
    SendOutlined, UserOutlined, TeamOutlined, SwapOutlined, CloseCircleOutlined,
    SearchOutlined, ReloadOutlined, FilterOutlined, CheckCircleOutlined,
    ClockCircleOutlined, MessageOutlined, PaperClipOutlined, SmileOutlined,
    MoreOutlined, PhoneOutlined
} from '@ant-design/icons';
import { chatApi, teamsApi, Chat, ChatMessage, ChatContact } from '../../services/api';
import type { Team } from '../../types';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;
const { TextArea } = Input;

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
    const [closingRating, setClosingRating] = useState(0);
    const [closingComments, setClosingComments] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        fetchConversations();
        fetchTeams();

        // Poll for new conversations every 10 seconds
        const interval = setInterval(fetchConversations, 10000);
        return () => clearInterval(interval);
    }, [fetchConversations, fetchTeams]);

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
                rating: closingRating || undefined,
                closing_comments: closingComments || undefined
            });
            message.success('Chat encerrado');
            setCloseModalOpen(false);
            setClosingRating(0);
            setClosingComments('');
            fetchConversations();
            setSelectedChat(null);
            setMessages([]);
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao encerrar');
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

    return (
        <Layout style={{ height: 'calc(100vh - 64px)', background: '#f0f2f5' }}>
            {/* Conversations List */}
            <Sider
                width={350}
                style={{
                    background: '#fff',
                    borderRight: '1px solid #f0f0f0',
                    overflow: 'auto'
                }}
            >
                {/* Header */}
                <div style={{ padding: 16, borderBottom: '1px solid #f0f0f0' }}>
                    <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Title level={4} style={{ margin: 0 }}>
                                <MessageOutlined style={{ marginRight: 8 }} />
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
                            prefix={<SearchOutlined />}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            allowClear
                        />
                        <Select
                            placeholder="Filtrar por status"
                            allowClear
                            style={{ width: '100%' }}
                            value={statusFilter}
                            onChange={setStatusFilter}
                        >
                            <Select.Option value="waiting">Aguardando</Select.Option>
                            <Select.Option value="in_progress">Em Atendimento</Select.Option>
                            <Select.Option value="closed">Encerrado</Select.Option>
                        </Select>
                    </Space>
                </div>

                {/* Conversations */}
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                        <Spin />
                    </div>
                ) : filteredConversations.length === 0 ? (
                    <Empty
                        description="Nenhuma conversa"
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
                                    background: selectedChat?.id === chat.id ? '#e6f7ff' : 'transparent',
                                    borderBottom: '1px solid #f0f0f0'
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
                                            <Text strong ellipsis style={{ maxWidth: 150 }}>
                                                {getContactName(chat.contact)}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                {formatTime(chat.updated_at)}
                                            </Text>
                                        </div>
                                    }
                                    description={
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
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
                                    <Text strong>{getContactName(selectedChat.contact)}</Text>
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
                                    {messages.map(msg => (
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
                                                    borderRadius: 8
                                                }}
                                                bodyStyle={{ padding: '8px 12px' }}
                                            >
                                                <Text>{msg.content || '[Mídia]'}</Text>
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
                                padding: 16,
                                borderTop: '1px solid #f0f0f0',
                                background: '#fff'
                            }}>
                                <Space.Compact style={{ width: '100%' }}>
                                    <TextArea
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
                        <Text>Avaliação do atendimento (opcional):</Text>
                        <br />
                        <Rate
                            count={10}
                            value={closingRating}
                            onChange={setClosingRating}
                        />
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
        </Layout>
    );
};

export default ChatPage;
