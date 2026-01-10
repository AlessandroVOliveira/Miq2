/**
 * Checklists templates management page.
 */
import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Input, Modal, Form, message,
    Typography, Card, Tag, Switch, List, InputNumber, Collapse
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined, OrderedListOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ChecklistTemplate, ChecklistTemplateCreate, ChecklistItem, ChecklistItemCreate } from '../../types';
import { checklistsApi } from '../../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Checklists: React.FC = () => {
    const [checklists, setChecklists] = useState<ChecklistTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [itemsModalOpen, setItemsModalOpen] = useState(false);
    const [editingChecklist, setEditingChecklist] = useState<ChecklistTemplate | null>(null);
    const [selectedChecklist, setSelectedChecklist] = useState<ChecklistTemplate | null>(null);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [form] = Form.useForm();
    const [itemForm] = Form.useForm();

    const fetchChecklists = async (page = 1, size = 10, search = '') => {
        setLoading(true);
        try {
            const response = await checklistsApi.list(page, size, search || undefined);
            setChecklists(response.items);
            setPagination({ current: page, pageSize: size, total: response.total });
        } catch {
            message.error('Erro ao carregar checklists');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchChecklists(); }, []);

    const handleSearch = (value: string) => {
        setSearchText(value);
        fetchChecklists(1, pagination.pageSize, value);
    };

    const handleAdd = () => {
        setEditingChecklist(null);
        form.resetFields();
        form.setFieldsValue({ is_active: true, version: '1.0' });
        setModalOpen(true);
    };

    const handleEdit = (checklist: ChecklistTemplate) => {
        setEditingChecklist(checklist);
        form.setFieldsValue(checklist);
        setModalOpen(true);
    };

    const handleViewItems = async (checklist: ChecklistTemplate) => {
        const full = await checklistsApi.get(checklist.id);
        setSelectedChecklist(full);
        setItemsModalOpen(true);
    };

    const handleDelete = async (checklist: ChecklistTemplate) => {
        Modal.confirm({
            title: 'Confirmar exclusão',
            content: `Deseja excluir o checklist "${checklist.name}"?`,
            okText: 'Excluir',
            okType: 'danger',
            onOk: async () => {
                try {
                    await checklistsApi.delete(checklist.id);
                    message.success('Checklist excluído');
                    fetchChecklists(pagination.current, pagination.pageSize, searchText);
                } catch { message.error('Erro ao excluir'); }
            },
        });
    };

    const handleSubmit = async (values: ChecklistTemplateCreate) => {
        try {
            if (editingChecklist) {
                await checklistsApi.update(editingChecklist.id, values);
                message.success('Checklist atualizado');
            } else {
                await checklistsApi.create(values);
                message.success('Checklist criado');
            }
            setModalOpen(false);
            fetchChecklists(pagination.current, pagination.pageSize, searchText);
        } catch { message.error('Erro ao salvar checklist'); }
    };

    const handleAddItem = async (values: ChecklistItemCreate) => {
        if (!selectedChecklist) return;
        try {
            await checklistsApi.addItem(selectedChecklist.id, values);
            message.success('Item adicionado');
            const updated = await checklistsApi.get(selectedChecklist.id);
            setSelectedChecklist(updated);
            itemForm.resetFields();
        } catch { message.error('Erro ao adicionar item'); }
    };

    const handleDeleteItem = async (item: ChecklistItem) => {
        if (!selectedChecklist) return;
        try {
            await checklistsApi.deleteItem(selectedChecklist.id, item.id);
            message.success('Item excluído');
            const updated = await checklistsApi.get(selectedChecklist.id);
            setSelectedChecklist(updated);
        } catch { message.error('Erro ao excluir item'); }
    };

    const columns: ColumnsType<ChecklistTemplate> = [
        { title: 'Nome', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
        { title: 'Versão', dataIndex: 'version', key: 'version', width: 100 },
        { title: 'Itens', key: 'items', width: 80, render: (_, r) => r.items?.length || 0 },
        {
            title: 'Status', dataIndex: 'is_active', key: 'is_active', width: 100,
            render: (active: boolean) => <Tag color={active ? 'success' : 'default'}>{active ? 'Ativo' : 'Inativo'}</Tag>
        },
        {
            title: 'Ações', key: 'actions', width: 140,
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<OrderedListOutlined />} onClick={() => handleViewItems(record)} title="Ver itens" />
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Templates de Checklist</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Novo Template</Button>
            </div>

            <Card>
                <Space style={{ marginBottom: 16 }}>
                    <Input.Search placeholder="Buscar" allowClear onSearch={handleSearch} style={{ width: 300 }} prefix={<SearchOutlined />} />
                    <Button icon={<ReloadOutlined />} onClick={() => fetchChecklists(pagination.current, pagination.pageSize, searchText)}>Atualizar</Button>
                </Space>
                <Table columns={columns} dataSource={checklists} loading={loading} rowKey="id"
                    pagination={{ ...pagination, showSizeChanger: true, showTotal: (t) => `Total: ${t}` }}
                    onChange={(p) => fetchChecklists(p.current, p.pageSize, searchText)} />
            </Card>

            <Modal title={editingChecklist ? 'Editar Template' : 'Novo Template'} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="name" label="Nome" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="version" label="Versão"><Input placeholder="Ex: 1.0" /></Form.Item>
                    <Form.Item name="description" label="Descrição"><TextArea rows={2} /></Form.Item>
                    <Form.Item name="is_active" label="Ativo" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item><Space><Button type="primary" htmlType="submit">{editingChecklist ? 'Salvar' : 'Criar'}</Button><Button onClick={() => setModalOpen(false)}>Cancelar</Button></Space></Form.Item>
                </Form>
            </Modal>

            <Modal title={`Itens de: ${selectedChecklist?.name || ''}`} open={itemsModalOpen} onCancel={() => setItemsModalOpen(false)} footer={null} width={700}>
                <Collapse defaultActiveKey={['add']} items={[{
                    key: 'add',
                    label: 'Adicionar Item',
                    children: (
                        <Form form={itemForm} layout="inline" onFinish={handleAddItem}>
                            <Form.Item name="title" rules={[{ required: true }]} style={{ flex: 2 }}><Input placeholder="Título do item" /></Form.Item>
                            <Form.Item name="category"><Input placeholder="Categoria" style={{ width: 120 }} /></Form.Item>
                            <Form.Item name="estimated_hours"><InputNumber placeholder="Horas" min={0} style={{ width: 80 }} /></Form.Item>
                            <Form.Item><Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Adicionar</Button></Form.Item>
                        </Form>
                    )
                }]} />
                <List style={{ marginTop: 16 }} dataSource={selectedChecklist?.items || []} renderItem={(item, i) => (
                    <List.Item actions={[<Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteItem(item)} />]}>
                        <Space>
                            <Text type="secondary">{i + 1}.</Text>
                            <Text strong>{item.title}</Text>
                            {item.category && <Tag>{item.category}</Tag>}
                            {item.estimated_hours > 0 && <Text type="secondary">{item.estimated_hours}h</Text>}
                        </Space>
                    </List.Item>
                )} />
            </Modal>
        </div>
    );
};

export default Checklists;
