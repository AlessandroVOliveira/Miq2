/**
 * Implementations list page.
 */
import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Input, Modal, Form, message,
    Typography, Card, Tag, Progress, Select, DatePicker
} from 'antd';
import {
    PlusOutlined, EyeOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import type { ImplementationListItem, ImplementationCreate, ImplementationStatus } from '../../types';
import { implementationsApi, clientsApi, productsApi, checklistsApi, usersApi } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const statusColors: Record<ImplementationStatus, string> = {
    pending: 'default',
    in_progress: 'processing',
    completed: 'success',
    cancelled: 'error',
};

const statusLabels: Record<ImplementationStatus, string> = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    cancelled: 'Cancelada',
};

const Implementations: React.FC = () => {
    const navigate = useNavigate();
    const [implementations, setImplementations] = useState<ImplementationListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [form] = Form.useForm();

    // Options for form
    const [clients, setClients] = useState<{ label: string; value: string }[]>([]);
    const [products, setProducts] = useState<{ label: string; value: string }[]>([]);
    const [checklists, setChecklists] = useState<{ label: string; value: string }[]>([]);
    const [users, setUsers] = useState<{ label: string; value: string }[]>([]);

    const fetchImplementations = async (page = 1, size = 10, filters?: { search?: string; status?: string }) => {
        setLoading(true);
        try {
            const response = await implementationsApi.list(page, size, filters);
            setImplementations(response.items);
            setPagination({ current: page, pageSize: size, total: response.total });
        } catch {
            message.error('Erro ao carregar implantações');
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const [clientsRes, productsRes, checklistsRes, usersRes] = await Promise.all([
                clientsApi.list(1, 100),
                productsApi.list(1, 100),
                checklistsApi.list(1, 100),
                usersApi.list(1, 100),
            ]);
            setClients(clientsRes.items.map((c) => ({ label: c.company_name, value: c.id })));
            setProducts(productsRes.items.map((p) => ({ label: p.name, value: p.id })));
            setChecklists(checklistsRes.items.map((t) => ({ label: t.name, value: t.id })));
            setUsers(usersRes.items.map((u) => ({ label: u.name, value: u.id })));
        } catch { /* ignore */ }
    };

    useEffect(() => { fetchImplementations(); fetchOptions(); }, []);

    const handleSearch = (value: string) => {
        setSearchText(value);
        fetchImplementations(1, pagination.pageSize, { search: value, status: statusFilter });
    };

    const handleStatusFilter = (value: string | undefined) => {
        setStatusFilter(value);
        fetchImplementations(1, pagination.pageSize, { search: searchText, status: value });
    };

    const handleAdd = () => {
        form.resetFields();
        setModalOpen(true);
    };

    const handleView = (impl: ImplementationListItem) => {
        navigate(`/implementations/${impl.id}`);
    };

    const handleDelete = async (impl: ImplementationListItem) => {
        Modal.confirm({
            title: 'Confirmar exclusão',
            content: `Deseja excluir "${impl.title}"?`,
            okText: 'Excluir',
            okType: 'danger',
            onOk: async () => {
                try {
                    await implementationsApi.delete(impl.id);
                    message.success('Implantação excluída');
                    fetchImplementations(pagination.current, pagination.pageSize);
                } catch { message.error('Erro ao excluir'); }
            },
        });
    };

    const handleSubmit = async (values: ImplementationCreate & { dates?: dayjs.Dayjs[] }) => {
        try {
            const data: ImplementationCreate = {
                ...values,
                start_date: values.dates?.[0]?.format('YYYY-MM-DD'),
                estimated_end_date: values.dates?.[1]?.format('YYYY-MM-DD'),
            };
            delete (data as Record<string, unknown>).dates;
            await implementationsApi.create(data);
            message.success('Implantação criada');
            setModalOpen(false);
            fetchImplementations(pagination.current, pagination.pageSize);
        } catch { message.error('Erro ao criar implantação'); }
    };

    const columns: ColumnsType<ImplementationListItem> = [
        { title: 'Título', dataIndex: 'title', key: 'title', ellipsis: true },
        { title: 'Cliente', key: 'client', render: (_, r) => r.client?.company_name || '-' },
        { title: 'Produto', key: 'product', render: (_, r) => r.product?.name || '-' },
        {
            title: 'Status', dataIndex: 'status', key: 'status', width: 120,
            render: (s: ImplementationStatus) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag>
        },
        {
            title: 'Progresso', key: 'progress', width: 150,
            render: (_, r) => <Progress percent={r.progress_percentage} size="small" />
        },
        {
            title: 'Início', dataIndex: 'start_date', key: 'start_date', width: 100,
            render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-'
        },
        {
            title: 'Ações', key: 'actions', width: 100,
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)} title="Ver detalhes" />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Implantações</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Nova Implantação</Button>
            </div>

            <Card>
                <Space style={{ marginBottom: 16 }} wrap>
                    <Input.Search placeholder="Buscar" allowClear onSearch={handleSearch} style={{ width: 250 }} prefix={<SearchOutlined />} />
                    <Select placeholder="Status" allowClear style={{ width: 150 }} onChange={handleStatusFilter}
                        options={Object.entries(statusLabels).map(([k, v]) => ({ value: k, label: v }))} />
                    <Button icon={<ReloadOutlined />} onClick={() => fetchImplementations(pagination.current, pagination.pageSize)}>Atualizar</Button>
                </Space>
                <Table columns={columns} dataSource={implementations} loading={loading} rowKey="id"
                    pagination={{ ...pagination, showSizeChanger: true, showTotal: (t) => `Total: ${t}` }}
                    onChange={(p) => fetchImplementations(p.current, p.pageSize, { search: searchText, status: statusFilter })} />
            </Card>

            <Modal title="Nova Implantação" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={600}>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="title" label="Título" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="client_id" label="Cliente" rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="label" options={clients} placeholder="Selecione o cliente" />
                    </Form.Item>
                    <Form.Item name="product_id" label="Produto">
                        <Select allowClear showSearch optionFilterProp="label" options={products} placeholder="Selecione o produto" />
                    </Form.Item>
                    <Form.Item name="checklist_template_id" label="Template de Checklist">
                        <Select allowClear showSearch optionFilterProp="label" options={checklists} placeholder="Clonar itens de..." />
                    </Form.Item>
                    <Form.Item name="responsible_user_id" label="Responsável">
                        <Select allowClear showSearch optionFilterProp="label" options={users} placeholder="Selecione o responsável" />
                    </Form.Item>
                    <Form.Item name="dates" label="Período">
                        <RangePicker format="DD/MM/YYYY" />
                    </Form.Item>
                    <Form.Item name="description" label="Descrição"><TextArea rows={2} /></Form.Item>
                    <Form.Item><Space><Button type="primary" htmlType="submit">Criar</Button><Button onClick={() => setModalOpen(false)}>Cancelar</Button></Space></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Implementations;
