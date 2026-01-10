/**
 * Service Orders list page.
 */
import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Input, Modal, Form, message,
    Typography, Card, Tag, Select
} from 'antd';
import {
    PlusOutlined, EyeOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import type { ServiceOrderListItem, ServiceOrderCreate, ServiceOrderStatus, ServiceOrderPriority } from '../../types';
import { serviceOrdersApi, clientsApi, usersApi, teamsApi } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;

const statusColors: Record<ServiceOrderStatus, string> = {
    open: 'blue',
    in_progress: 'processing',
    waiting_parts: 'orange',
    completed: 'success',
    cancelled: 'default',
};

const statusLabels: Record<ServiceOrderStatus, string> = {
    open: 'Aberta',
    in_progress: 'Em Andamento',
    waiting_parts: 'Aguardando Peças',
    completed: 'Concluída',
    cancelled: 'Cancelada',
};

const priorityColors: Record<ServiceOrderPriority, string> = {
    low: 'green',
    medium: 'blue',
    high: 'orange',
    urgent: 'red',
};

const priorityLabels: Record<ServiceOrderPriority, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
};

const ServiceOrders: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<ServiceOrderListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [form] = Form.useForm();

    const [clients, setClients] = useState<{ label: string; value: string }[]>([]);
    const [users, setUsers] = useState<{ label: string; value: string }[]>([]);
    const [teams, setTeams] = useState<{ label: string; value: string }[]>([]);

    const fetchOrders = async (page = 1, size = 10, filters?: { search?: string; status?: string }) => {
        setLoading(true);
        try {
            const response = await serviceOrdersApi.list(page, size, filters);
            setOrders(response.items);
            setPagination({ current: page, pageSize: size, total: response.total });
        } catch {
            message.error('Erro ao carregar ordens de serviço');
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const [clientsRes, usersRes, teamsRes] = await Promise.all([
                clientsApi.list(1, 100),
                usersApi.list(1, 100),
                teamsApi.list(1, 100),
            ]);
            setClients(clientsRes.items.map((c) => ({ label: c.company_name, value: c.id })));
            setUsers(usersRes.items.map((u) => ({ label: u.name, value: u.id })));
            setTeams(teamsRes.items.map((t) => ({ label: t.name, value: t.id })));
        } catch { /* ignore */ }
    };

    useEffect(() => { fetchOrders(); fetchOptions(); }, []);

    const handleSearch = (value: string) => {
        setSearchText(value);
        fetchOrders(1, pagination.pageSize, { search: value, status: statusFilter });
    };

    const handleStatusFilter = (value: string | undefined) => {
        setStatusFilter(value);
        fetchOrders(1, pagination.pageSize, { search: searchText, status: value });
    };

    const handleAdd = () => {
        form.resetFields();
        setModalOpen(true);
    };

    const handleView = (order: ServiceOrderListItem) => {
        navigate(`/service-orders/${order.id}`);
    };

    const handleDelete = async (order: ServiceOrderListItem) => {
        Modal.confirm({
            title: 'Confirmar exclusão',
            content: `Deseja excluir a OS "${order.title}"?`,
            okText: 'Excluir',
            okType: 'danger',
            onOk: async () => {
                try {
                    await serviceOrdersApi.delete(order.id);
                    message.success('OS excluída');
                    fetchOrders(pagination.current, pagination.pageSize);
                } catch { message.error('Erro ao excluir'); }
            },
        });
    };

    const handleSubmit = async (values: ServiceOrderCreate) => {
        try {
            await serviceOrdersApi.create(values);
            message.success('OS criada');
            setModalOpen(false);
            fetchOrders(pagination.current, pagination.pageSize);
        } catch { message.error('Erro ao criar OS'); }
    };

    const columns: ColumnsType<ServiceOrderListItem> = [
        { title: 'Título', dataIndex: 'title', key: 'title', ellipsis: true },
        { title: 'Cliente', key: 'client', render: (_, r) => r.client?.company_name || '-' },
        { title: 'Responsável', key: 'user', render: (_, r) => r.assigned_user?.name || '-' },
        {
            title: 'Status', dataIndex: 'status', key: 'status', width: 140,
            render: (s: ServiceOrderStatus) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag>
        },
        {
            title: 'Prioridade', dataIndex: 'priority', key: 'priority', width: 100,
            render: (p: ServiceOrderPriority) => <Tag color={priorityColors[p]}>{priorityLabels[p]}</Tag>
        },
        {
            title: 'Aberta em', dataIndex: 'opened_at', key: 'opened_at', width: 120,
            render: (d) => dayjs(d).format('DD/MM/YY HH:mm')
        },
        {
            title: 'Ações', key: 'actions', width: 100,
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Ordens de Serviço</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Nova OS</Button>
            </div>

            <Card>
                <Space style={{ marginBottom: 16 }} wrap>
                    <Input.Search placeholder="Buscar" allowClear onSearch={handleSearch} style={{ width: 250 }} prefix={<SearchOutlined />} />
                    <Select placeholder="Status" allowClear style={{ width: 150 }} onChange={handleStatusFilter}
                        options={Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v }))} />
                    <Button icon={<ReloadOutlined />} onClick={() => fetchOrders(pagination.current, pagination.pageSize)}>Atualizar</Button>
                </Space>
                <Table columns={columns} dataSource={orders} loading={loading} rowKey="id"
                    pagination={{ ...pagination, showSizeChanger: true, showTotal: (t) => `Total: ${t}` }}
                    onChange={(p) => fetchOrders(p.current, p.pageSize, { search: searchText, status: statusFilter })} />
            </Card>

            <Modal title="Nova Ordem de Serviço" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={600}>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="title" label="Título" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="client_id" label="Cliente" rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="label" options={clients} placeholder="Selecione o cliente" />
                    </Form.Item>
                    <Form.Item name="assigned_user_id" label="Responsável">
                        <Select allowClear showSearch optionFilterProp="label" options={users} />
                    </Form.Item>
                    <Form.Item name="team_id" label="Equipe">
                        <Select allowClear showSearch optionFilterProp="label" options={teams} />
                    </Form.Item>
                    <Form.Item name="priority" label="Prioridade" initialValue="medium">
                        <Select options={Object.entries(priorityLabels).map(([k, v]) => ({ value: k, label: v }))} />
                    </Form.Item>
                    <Form.Item name="equipment_serial" label="Nº Série Equipamento"><Input /></Form.Item>
                    <Form.Item name="equipment_description" label="Descrição do Equipamento"><TextArea rows={2} /></Form.Item>
                    <Form.Item name="description" label="Descrição do Problema"><TextArea rows={3} /></Form.Item>
                    <Form.Item><Space><Button type="primary" htmlType="submit">Criar</Button><Button onClick={() => setModalOpen(false)}>Cancelar</Button></Space></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ServiceOrders;
