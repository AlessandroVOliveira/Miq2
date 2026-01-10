/**
 * Permissions management page.
 */
import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, message, Typography, Card, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Permission, PermissionCreate } from '../../types';
import { permissionsApi } from '../../services/api';

const { Title } = Typography;

const Permissions: React.FC = () => {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
    const [form] = Form.useForm();

    const fetchPermissions = async (page = 1, size = 20) => {
        setLoading(true);
        try {
            const response = await permissionsApi.list(page, size);
            setPermissions(response.items);
            setPagination({ current: page, pageSize: size, total: response.total });
        } catch (error) {
            message.error('Erro ao carregar permissões');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPermissions();
    }, []);

    const handleAdd = () => {
        form.resetFields();
        setModalOpen(true);
    };

    const handleDelete = async (permission: Permission) => {
        Modal.confirm({
            title: 'Confirmar exclusão',
            content: `Deseja excluir a permissão "${permission.resource}:${permission.action}"?`,
            okText: 'Excluir',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await permissionsApi.delete(permission.id);
                    message.success('Permissão excluída');
                    fetchPermissions(pagination.current, pagination.pageSize);
                } catch {
                    message.error('Erro ao excluir');
                }
            },
        });
    };

    const handleSubmit = async (values: PermissionCreate) => {
        try {
            await permissionsApi.create(values);
            message.success('Permissão criada');
            setModalOpen(false);
            fetchPermissions(pagination.current, pagination.pageSize);
        } catch {
            message.error('Erro ao criar (pode já existir)');
        }
    };

    const columns: ColumnsType<Permission> = [
        {
            title: 'Recurso',
            dataIndex: 'resource',
            key: 'resource',
            render: (resource: string) => <Tag color="blue">{resource}</Tag>,
        },
        {
            title: 'Ação',
            dataIndex: 'action',
            key: 'action',
            render: (action: string) => <Tag color="green">{action}</Tag>,
        },
        {
            title: 'Descrição',
            dataIndex: 'description',
            key: 'description',
        },
        {
            title: 'Ações',
            key: 'actions',
            render: (_, record) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Permissões</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Nova Permissão
                </Button>
            </div>

            <Card>
                <Space style={{ marginBottom: 16 }}>
                    <Button icon={<ReloadOutlined />} onClick={() => fetchPermissions(pagination.current, pagination.pageSize)}>
                        Atualizar
                    </Button>
                </Space>

                <Table
                    columns={columns}
                    dataSource={permissions}
                    loading={loading}
                    rowKey="id"
                    pagination={{ ...pagination, showSizeChanger: true, showTotal: (total) => `Total: ${total}` }}
                    onChange={(p) => fetchPermissions(p.current, p.pageSize)}
                />
            </Card>

            <Modal title="Nova Permissão" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="resource" label="Recurso" rules={[{ required: true }]}>
                        <Input placeholder="Ex: users, clients, teams" />
                    </Form.Item>
                    <Form.Item name="action" label="Ação" rules={[{ required: true }]}>
                        <Input placeholder="Ex: create, read, update, delete" />
                    </Form.Item>
                    <Form.Item name="description" label="Descrição">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">Criar</Button>
                            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Permissions;
