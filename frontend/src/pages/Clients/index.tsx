/**
 * Clients management page.
 */
import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Input, Modal, Form, message,
    Typography, Card, Tag, Switch
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Client, ClientCreate, ClientUpdate } from '../../types';
import { clientsApi } from '../../services/api';

const { Title } = Typography;
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
            message.error('Erro ao carregar clientes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleSearch = (value: string) => {
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
        { title: 'Empresa', dataIndex: 'company_name', key: 'company_name', sorter: (a, b) => a.company_name.localeCompare(b.company_name) },
        { title: 'CNPJ', dataIndex: 'cnpj', key: 'cnpj' },
        { title: 'Cidade', dataIndex: 'city', key: 'city' },
        { title: 'Telefone', dataIndex: 'phone', key: 'phone' },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (active: boolean) => <Tag color={active ? 'success' : 'default'}>{active ? 'Ativo' : 'Inativo'}</Tag>
        },
        {
            title: 'Contatos',
            dataIndex: 'contacts',
            key: 'contacts',
            render: (contacts: Client['contacts']) => contacts?.length || 0,
        },
        {
            title: 'Ações',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Clientes</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Novo Cliente</Button>
            </div>

            <Card>
                <Space style={{ marginBottom: 16 }}>
                    <Input.Search placeholder="Buscar" allowClear onSearch={handleSearch} style={{ width: 300 }} prefix={<SearchOutlined />} />
                    <Button icon={<ReloadOutlined />} onClick={() => fetchClients(pagination.current, pagination.pageSize, searchText)}>Atualizar</Button>
                </Space>

                <Table
                    columns={columns}
                    dataSource={clients}
                    loading={loading}
                    rowKey="id"
                    pagination={{ ...pagination, showSizeChanger: true, showTotal: (total) => `Total: ${total}` }}
                    onChange={(p) => fetchClients(p.current, p.pageSize, searchText)}
                />
            </Card>

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
                    <Form.Item name="is_active" label="Ativo" valuePropName="checked">
                        <Switch />
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
