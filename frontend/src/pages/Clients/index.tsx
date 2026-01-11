/**
 * Clients management page with Deep Blue design.
 */
import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Input, Modal, Form, message,
    Typography, Row, Col, Tag, Avatar, Badge, Dropdown, Menu
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined, MoreOutlined,
    CheckCircleOutlined, SyncOutlined, UserOutlined, MailOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Client, ClientCreate, ClientUpdate } from '../../types';
import { clientsApi } from '../../services/api';
import styles from './clients.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Clients: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [form] = Form.useForm();

    const fetchClients = async (page = 1, size = 10, search = '') => {
        setLoading(true);
        try {
            const response = await clientsApi.list(page, size, search || undefined);
            setClients(response.items);
            setPagination({ current: page, pageSize: size, total: response.total });
        } catch {
            // Fallback empty if fail
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchText(value);
        fetchClients(1, pagination.pageSize, value);
    };

    const handleAdd = () => {
        setEditingClient(null);
        form.resetFields();
        form.setFieldValue('is_active', true);
        setModalOpen(true);
    };

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        form.setFieldsValue(client);
        setModalOpen(true);
    };

    const handleDelete = async (client: Client) => {
        Modal.confirm({
            title: 'Confirmar exclusão',
            content: `Deseja excluir o cliente "${client.company_name}"?`,
            okText: 'Excluir',
            okType: 'danger',
            onOk: async () => {
                try {
                    await clientsApi.delete(client.id);
                    message.success('Cliente excluído');
                    fetchClients(pagination.current, pagination.pageSize, searchText);
                } catch {
                    message.error('Erro ao excluir');
                }
            },
        });
    };

    const handleSubmit = async (values: ClientCreate | ClientUpdate) => {
        try {
            if (editingClient) {
                await clientsApi.update(editingClient.id, values);
                message.success('Cliente atualizado');
            } else {
                await clientsApi.create(values as ClientCreate);
                message.success('Cliente criado');
            }
            setModalOpen(false);
            fetchClients(pagination.current, pagination.pageSize, searchText);
        } catch {
            message.error('Erro ao salvar cliente');
        }
    };

    const columns: ColumnsType<Client> = [
        {
            title: 'NOME DO CLIENTE',
            dataIndex: 'company_name',
            key: 'company_name',
            render: (text: string, record: Client) => {
                const colors = ['#e0e7ff', '#ffedd5', '#ecfeff', '#fce7f3'];
                const textColors = ['#4338ca', '#c2410c', '#0891b2', '#be185d'];
                const index = (record.id % colors.length) || 0; // Simple hash mock
                const initial = text.charAt(0).toUpperCase();

                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className={styles.avatarBox} style={{ background: colors[index], color: textColors[index] }}>
                            {initial}
                        </div>
                        <div>
                            <Text strong style={{ display: 'block', color: '#1a1a1a' }}>{text}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>ID: #{record.id.toString().padStart(4, '0')}</Text>
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'CONTATO',
            key: 'contact',
            render: (_: unknown, record: Client) => {
                const contact = record.contacts?.[0] || { name: 'Admin', email: record.email || 'N/A' };
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                            <UserOutlined style={{ color: '#9ca3af' }} />
                            <span>{contact.name || 'Admin'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
                            <MailOutlined style={{ color: '#9ca3af' }} />
                            <span>{contact.email || record.email || 'N/A'}</span>
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'LOCALIZAÇÃO',
            key: 'location',
            render: (_: unknown, record: Client) => (
                <Text>{record.city} / {record.state}</Text>
            )
        },
        {
            title: 'STATUS',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (active: boolean) => (
                <Tag
                    color={active ? 'success' : 'default'}
                    style={{
                        borderRadius: 999,
                        padding: '2px 10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 700
                    }}
                >
                    <Badge status={active ? 'success' : 'default'} text={null} />
                    {active ? 'Ativo' : 'Inativo'}
                </Tag>
            )
        },
        {
            title: 'AÇÕES',
            key: 'actions',
            align: 'right',
            render: (_, record) => (
                <Dropdown overlay={
                    <Menu items={[
                        { key: 'edit', label: 'Editar', icon: <EditOutlined />, onClick: () => handleEdit(record) },
                        { key: 'delete', label: 'Excluir', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(record) }
                    ]} />
                } trigger={['click']}>
                    <Button type="text" icon={<MoreOutlined style={{ color: '#9ca3af', fontSize: 20 }} />} />
                </Dropdown>
            ),
        },
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            {/* Header Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.025em' }}>Gestão de Clientes</Title>
                        <Text type="secondary" style={{ marginTop: 8, display: 'block', maxWidth: 600 }}>
                            Gerencie seus clientes cadastrados, monitore o status dos serviços e cuide de novas implantações de forma eficiente.
                        </Text>
                    </div>
                    <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleAdd} style={{ boxShadow: '0 4px 6px -1px rgba(16, 100, 254, 0.2)' }}>
                        Adicionar Cliente
                    </Button>
                </div>
            </div>

            {/* Filter & Stats Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {/* Stats Card 1 */}
                <Col xs={24} sm={12} md={8}>
                    <div className={styles.statsCard}>
                        <div className={styles.iconBox} style={{ background: '#dcfce7', color: '#16a34a' }}>
                            <CheckCircleOutlined />
                        </div>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clientes Ativos</div>
                            <div style={{ fontSize: 24, fontWeight: 700 }}>{pagination.total}</div>
                        </div>
                    </div>
                </Col>
                {/* Search */}
                <Col xs={24} md={16}>
                    <div className={styles.filterCard}>
                        <SearchOutlined style={{ fontSize: 20, color: '#9ca3af', marginLeft: 8 }} />
                        <Input
                            placeholder="Buscar por nome, email..."
                            className={styles.searchInput}
                            onChange={handleSearch}
                            value={searchText}
                        />
                        <div style={{ width: 1, height: 32, background: '#e5e7eb', margin: '0 8px' }}></div>
                        {/* Dummy select for visual match */}
                        <div style={{ width: 140, padding: '0 8px', fontWeight: 500, color: '#1a1a1a', cursor: 'pointer' }}>
                            Todos os Status
                        </div>
                    </div>
                </Col>
            </Row>


            <Table
                columns={columns}
                dataSource={clients}
                loading={loading}
                rowKey="id"
                pagination={{ ...pagination, showSizeChanger: true, showTotal: (total) => `Total: ${total} clientes` }}
                onChange={(p) => fetchClients(p.current, p.pageSize, searchText)}
                style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e6ebf4' }}
            />

            <Modal title={editingClient ? 'Editar Cliente' : 'Novo Cliente'} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={700}>
                <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ is_active: true }}>
                    <Form.Item name="company_name" label="Nome da Empresa" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Space style={{ display: 'flex' }} align="start">
                        <Form.Item name="cnpj" label="CNPJ" style={{ flex: 1 }}>
                            <Input placeholder="00.000.000/0000-00" />
                        </Form.Item>
                        <Form.Item name="phone" label="Telefone" style={{ flex: 1 }}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="email" label="Email" style={{ flex: 1 }}>
                            <Input />
                        </Form.Item>
                    </Space>
                    <Form.Item name="address" label="Endereço">
                        <Input />
                    </Form.Item>
                    <Space style={{ display: 'flex' }} align="start">
                        <Form.Item name="city" label="Cidade" style={{ flex: 2 }}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="state" label="UF" style={{ flex: 1 }}>
                            <Input maxLength={2} />
                        </Form.Item>
                        <Form.Item name="zip_code" label="CEP" style={{ flex: 1 }}>
                            <Input />
                        </Form.Item>
                    </Space>
                    <Form.Item name="notes" label="Observações">
                        <TextArea rows={2} />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">{editingClient ? 'Salvar' : 'Criar'}</Button>
                            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Clients;
