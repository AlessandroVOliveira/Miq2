/**
 * Chat configuration page for WhatsApp connection.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Button, Space, Input, Form, message, Typography, Tag, Spin,
    Alert, Tabs, Divider, Modal, Select, InputNumber, Switch, TimePicker
} from 'antd';
import {
    QrcodeOutlined, WifiOutlined, DisconnectOutlined, ReloadOutlined,
    MessageOutlined, SettingOutlined, CheckCircleOutlined, CloseCircleOutlined,
    LoadingOutlined, PhoneOutlined, DeleteOutlined
} from '@ant-design/icons';
import { chatApi, ChatConfig, QRCodeResponse, ChatbotConfig } from '../../services/api';
import { teamsApi } from '../../services/api';
import type { Team } from '../../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const ChatConfigPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<ChatConfig | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [pollingStatus, setPollingStatus] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [teams, setTeams] = useState<Team[]>([]);
    const [chatbotConfig, setChatbotConfig] = useState<ChatbotConfig | null>(null);
    const [savingChatbot, setSavingChatbot] = useState(false);

    const [form] = Form.useForm();
    const [chatbotForm] = Form.useForm();

    // Fetch configuration
    const fetchConfig = useCallback(async () => {
        try {
            const data = await chatApi.getConfig();
            setConfig(data);
            if (data.qrcode_base64) {
                setQrCode(data.qrcode_base64);
            }
        } catch (error: any) {
            if (error.response?.status === 404) {
                setConfig(null);
            } else {
                message.error('Erro ao carregar configuração');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch teams for chatbot menu
    const fetchTeams = useCallback(async () => {
        try {
            const response = await teamsApi.list(1, 100);
            setTeams(response.items);
        } catch {
            // Ignore
        }
    }, []);

    // Fetch chatbot config
    const fetchChatbotConfig = useCallback(async () => {
        try {
            const data = await chatApi.getChatbotConfig();
            setChatbotConfig(data);
            chatbotForm.setFieldsValue({
                is_active: data.is_active,
                welcome_message: data.welcome_message,
                menu_message: data.menu_message,
                invalid_option_message: data.invalid_option_message,
                queue_message: data.queue_message,
                rating_request_message: data.rating_request_message,
                rating_thanks_message: data.rating_thanks_message,
                offline_message: data.offline_message,
            });
        } catch {
            // Ignore - will create default when saving
        }
    }, [chatbotForm]);

    useEffect(() => {
        fetchConfig();
        fetchTeams();
        fetchChatbotConfig();
    }, [fetchConfig, fetchTeams, fetchChatbotConfig]);

    // Poll status when showing QR code or connecting
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (pollingStatus && config) {
            interval = setInterval(async () => {
                try {
                    const status = await chatApi.getStatus();
                    if (status.status === 'connected') {
                        setPollingStatus(false);
                        setQrCode(null);
                        message.success('WhatsApp conectado com sucesso!');
                        fetchConfig();
                    }
                } catch {
                    // Ignore polling errors
                }
            }, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [pollingStatus, config, fetchConfig]);

    // Create configuration
    const handleCreate = async (values: { instance_name: string; connection_type: string; token?: string; number?: string }) => {
        try {
            const data = await chatApi.createConfig({
                instance_name: values.instance_name,
                connection_type: values.connection_type,
                token: values.token,
                number: values.number
            });
            setConfig(data);
            setCreateModalOpen(false);
            message.success('Configuração criada com sucesso!');

            if (data.qrcode_base64) {
                setQrCode(data.qrcode_base64);
                setPollingStatus(true);
            }
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao criar configuração');
        }
    };

    // Connect to WhatsApp
    const handleConnect = async () => {
        setConnecting(true);
        try {
            const result = await chatApi.connect();
            if (result.base64) {
                setQrCode(result.base64);
                setPollingStatus(true);
            }
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao conectar');
        } finally {
            setConnecting(false);
        }
    };

    // Disconnect
    const handleDisconnect = async () => {
        Modal.confirm({
            title: 'Desconectar WhatsApp',
            content: 'Deseja realmente desconectar? Você precisará escanear o QR Code novamente.',
            okText: 'Desconectar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await chatApi.disconnect();
                    message.success('Desconectado com sucesso');
                    fetchConfig();
                } catch (error: any) {
                    message.error(error.response?.data?.detail || 'Erro ao desconectar');
                }
            }
        });
    };

    // Save chatbot config
    const handleSaveChatbot = async (values: any) => {
        setSavingChatbot(true);
        try {
            await chatApi.updateChatbotConfig(values);
            message.success('Configuração do chatbot salva com sucesso!');
            fetchChatbotConfig();
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao salvar configuração');
        } finally {
            setSavingChatbot(false);
        }
    };

    // Delete configuration
    const handleDeleteConfig = async () => {
        Modal.confirm({
            title: 'Excluir Configuração',
            content: 'Deseja realmente excluir a configuração? Isso removerá a instância do WhatsApp e você precisará configurar novamente.',
            okText: 'Excluir',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await chatApi.deleteConfig();
                    message.success('Configuração excluída com sucesso');
                    setConfig(null);
                    setQrCode(null);
                } catch (error: any) {
                    message.error(error.response?.data?.detail || 'Erro ao excluir configuração');
                }
            }
        });
    };

    // Get status tag
    const getStatusTag = () => {
        if (!config) return null;

        const statusConfig = {
            connected: { color: 'success', icon: <CheckCircleOutlined />, text: 'Conectado' },
            disconnected: { color: 'error', icon: <CloseCircleOutlined />, text: 'Desconectado' },
            connecting: { color: 'processing', icon: <LoadingOutlined />, text: 'Conectando...' },
            qrcode: { color: 'warning', icon: <QrcodeOutlined />, text: 'Aguardando QR Code' }
        };

        const status = statusConfig[config.connection_status] || statusConfig.disconnected;

        return (
            <Tag icon={status.icon} color={status.color} style={{ fontSize: 14, padding: '4px 12px' }}>
                {status.text}
            </Tag>
        );
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    // No config - show create button
    if (!config) {
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Title level={2} style={{ margin: 0 }}>
                        <MessageOutlined style={{ marginRight: 8 }} />
                        Configuração do Chat
                    </Title>
                </div>

                <Card style={{ textAlign: 'center', padding: 40 }}>
                    <PhoneOutlined style={{ fontSize: 64, color: '#25D366', marginBottom: 24 }} />
                    <Title level={3}>Configure o WhatsApp</Title>
                    <Paragraph type="secondary">
                        Para usar o módulo de chat, você precisa configurar a conexão com o WhatsApp.
                    </Paragraph>
                    <Button
                        type="primary"
                        size="large"
                        icon={<WifiOutlined />}
                        onClick={() => setCreateModalOpen(true)}
                    >
                        Configurar Conexão
                    </Button>
                </Card>

                <Modal
                    title="Configurar WhatsApp"
                    open={createModalOpen}
                    onCancel={() => setCreateModalOpen(false)}
                    footer={null}
                >
                    <Form form={form} layout="vertical" onFinish={handleCreate}>
                        <Form.Item
                            name="instance_name"
                            label="Nome da Instância"
                            rules={[{ required: true, message: 'Informe um nome' }]}
                            extra="Identificador único para esta conexão"
                        >
                            <Input placeholder="miq2-principal" />
                        </Form.Item>

                        <Form.Item
                            name="connection_type"
                            label="Tipo de Conexão"
                            initialValue="WHATSAPP-BAILEYS"
                        >
                            <Select>
                                <Select.Option value="WHATSAPP-BAILEYS">
                                    WhatsApp Baileys (Gratuito)
                                </Select.Option>
                                <Select.Option value="WHATSAPP-BUSINESS">
                                    WhatsApp Business API (Pago)
                                </Select.Option>
                            </Select>
                        </Form.Item>

                        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.connection_type !== currentValues.connection_type}>
                            {({ getFieldValue }) =>
                                getFieldValue('connection_type') === 'WHATSAPP-BUSINESS' ? (
                                    <>
                                        <Alert
                                            type="warning"
                                            showIcon
                                            message="API Oficial do Meta (Paga)"
                                            description="Requer configuração prévia no Meta Business. Você precisará do token de acesso e número verificado."
                                            style={{ marginBottom: 16 }}
                                        />
                                        <Form.Item
                                            name="token"
                                            label="Token de Acesso (Meta Business)"
                                            rules={[{ required: true, message: 'Token é obrigatório para API Business' }]}
                                        >
                                            <Input.Password placeholder="EAAxx..." />
                                        </Form.Item>
                                        <Form.Item
                                            name="number"
                                            label="Número do WhatsApp"
                                            rules={[{ required: true, message: 'Número é obrigatório' }]}
                                            extra="Formato: 5511999999999 (com DDI e DDD)"
                                        >
                                            <Input placeholder="5511999999999" />
                                        </Form.Item>
                                    </>
                                ) : (
                                    <Alert
                                        type="info"
                                        showIcon
                                        message="API Gratuita (Baileys)"
                                        description="Usa engenharia reversa do WhatsApp Web. Gratuito, mas pode sofrer instabilidade."
                                        style={{ marginBottom: 16 }}
                                    />
                                )
                            }
                        </Form.Item>

                        <Form.Item>
                            <Space>
                                <Button type="primary" htmlType="submit">
                                    Criar e Conectar
                                </Button>
                                <Button onClick={() => setCreateModalOpen(false)}>
                                    Cancelar
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Space>
                    <Title level={2} style={{ margin: 0 }}>
                        <MessageOutlined style={{ marginRight: 8 }} />
                        Configuração do Chat
                    </Title>
                    {getStatusTag()}
                </Space>
                <Button icon={<ReloadOutlined />} onClick={fetchConfig}>
                    Atualizar
                </Button>
            </div>

            <Tabs defaultActiveKey="connection">
                <TabPane
                    tab={<span><WifiOutlined /> Conexão</span>}
                    key="connection"
                >
                    <Card>
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                            {/* Connection Info */}
                            <div>
                                <Text type="secondary">Instância:</Text>
                                <Text strong style={{ marginLeft: 8 }}>{config.instance_name}</Text>
                            </div>

                            <div>
                                <Text type="secondary">Tipo:</Text>
                                <Tag style={{ marginLeft: 8 }}>
                                    {config.connection_type === 'WHATSAPP-BAILEYS' ? 'Baileys (Gratuito)' : 'Business API'}
                                </Tag>
                            </div>

                            {config.phone_number && (
                                <div>
                                    <Text type="secondary">Número conectado:</Text>
                                    <Text strong style={{ marginLeft: 8 }}>+{config.phone_number}</Text>
                                </div>
                            )}

                            <Divider />

                            {/* QR Code */}
                            {(qrCode || config.connection_status === 'qrcode') && (
                                <div style={{ textAlign: 'center' }}>
                                    <Title level={4}>Escaneie o QR Code</Title>
                                    <Paragraph type="secondary">
                                        Abra o WhatsApp no seu celular → Menu → Dispositivos conectados → Conectar dispositivo
                                    </Paragraph>
                                    {qrCode && (
                                        <img
                                            src={qrCode}
                                            alt="QR Code"
                                            style={{
                                                maxWidth: 256,
                                                border: '1px solid #d9d9d9',
                                                borderRadius: 8,
                                                padding: 8
                                            }}
                                        />
                                    )}
                                    {pollingStatus && (
                                        <div style={{ marginTop: 16 }}>
                                            <Spin /> <Text type="secondary">Aguardando conexão...</Text>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Connected */}
                            {config.connection_status === 'connected' && (
                                <Alert
                                    type="success"
                                    showIcon
                                    icon={<CheckCircleOutlined />}
                                    message="WhatsApp Conectado"
                                    description="O sistema está pronto para enviar e receber mensagens."
                                />
                            )}

                            {/* Actions */}
                            <Space>
                                {config.connection_status !== 'connected' && (
                                    <Button
                                        type="primary"
                                        icon={<QrcodeOutlined />}
                                        loading={connecting}
                                        onClick={handleConnect}
                                    >
                                        {qrCode ? 'Gerar Novo QR Code' : 'Conectar'}
                                    </Button>
                                )}

                                {config.connection_status === 'connected' && (
                                    <Button
                                        danger
                                        icon={<DisconnectOutlined />}
                                        onClick={handleDisconnect}
                                    >
                                        Desconectar
                                    </Button>
                                )}

                                <Button
                                    danger
                                    type="dashed"
                                    icon={<DeleteOutlined />}
                                    onClick={handleDeleteConfig}
                                >
                                    Excluir Configuração
                                </Button>
                            </Space>
                        </Space>
                    </Card>
                </TabPane>

                <TabPane
                    tab={<span><SettingOutlined /> Chatbot</span>}
                    key="chatbot"
                >
                    <Card>
                        <Form
                            form={chatbotForm}
                            layout="vertical"
                            onFinish={handleSaveChatbot}
                        >
                            <Form.Item
                                name="is_active"
                                label="Chatbot Ativo"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>

                            <Divider>Mensagens do Chatbot</Divider>

                            <Form.Item
                                name="welcome_message"
                                label="Mensagem de Boas-Vindas"
                            >
                                <TextArea rows={2} />
                            </Form.Item>

                            <Form.Item
                                name="menu_message"
                                label="Mensagem do Menu"
                            >
                                <TextArea rows={2} />
                            </Form.Item>

                            <Form.Item
                                name="invalid_option_message"
                                label="Mensagem de Opção Inválida"
                            >
                                <TextArea rows={2} />
                            </Form.Item>

                            <Form.Item
                                name="queue_message"
                                label="Mensagem de Fila"
                            >
                                <TextArea rows={2} />
                            </Form.Item>

                            <Form.Item
                                name="rating_request_message"
                                label="Solicitar Avaliação"
                            >
                                <TextArea rows={2} />
                            </Form.Item>

                            <Form.Item
                                name="rating_thanks_message"
                                label="Agradecimento da Avaliação"
                            >
                                <TextArea rows={2} />
                            </Form.Item>

                            <Form.Item
                                name="offline_message"
                                label="Mensagem Fora do Horário"
                            >
                                <TextArea rows={2} />
                            </Form.Item>

                            <Divider>Opções do Menu</Divider>

                            <Alert
                                type="info"
                                showIcon
                                message="Configure as opções numéricas do menu"
                                description="Cada opção direciona o cliente para a fila de uma equipe específica."
                                style={{ marginBottom: 16 }}
                            />

                            <Form.List name="menu_options">
                                {(fields, { add, remove }) => (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'option']}
                                                    rules={[{ required: true, message: 'Número' }]}
                                                >
                                                    <InputNumber placeholder="1" style={{ width: 60 }} />
                                                </Form.Item>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'text']}
                                                    rules={[{ required: true, message: 'Texto' }]}
                                                >
                                                    <Input placeholder="Suporte Técnico" style={{ width: 200 }} />
                                                </Form.Item>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'team_id']}
                                                >
                                                    <Select placeholder="Equipe" style={{ width: 150 }}>
                                                        {teams.map(team => (
                                                            <Select.Option key={team.id} value={team.id}>
                                                                {team.name}
                                                            </Select.Option>
                                                        ))}
                                                    </Select>
                                                </Form.Item>
                                                <Button type="link" danger onClick={() => remove(name)}>
                                                    Remover
                                                </Button>
                                            </Space>
                                        ))}
                                        <Form.Item>
                                            <Button type="dashed" onClick={() => add()} block>
                                                + Adicionar Opção
                                            </Button>
                                        </Form.Item>
                                    </>
                                )}
                            </Form.List>

                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={savingChatbot}>
                                    Salvar Configuração do Chatbot
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </TabPane>
            </Tabs>
        </div>
    );
};

export default ChatConfigPage;
