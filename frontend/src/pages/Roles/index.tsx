/**
 * Roles management page with simplified permissions interface.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
    Table, Button, Space, Input, Modal, Form, message,
    Typography, Card, Tag, Switch, Divider
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Role, RoleCreate, RoleUpdate, Permission } from '../../types';
import { rolesApi, permissionsApi } from '../../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Module names in Portuguese
const moduleLabels: Record<string, string> = {
    users: '👥 Usuários',
    teams: '👔 Equipes',
    roles: '🎭 Cargos',
    permissions: '🔐 Permissões',
    clients: '🏢 Clientes',
    products: '📦 Produtos',
    checklists: '✅ Checklists',
    implementations: '🚀 Implantações',
    'service-orders': '🔧 Ordens de Serviço',
    tasks: '📅 Tarefas/Agenda',
    sprints: '🏃 Sprints',
    repository: '📁 Repositório',
    dashboard: '📊 Dashboard',
    backup: '💾 Backup',
    templates: '📄 Templates',
};

// Action names in Portuguese
const actionLabels: Record<string, string> = {
    read: 'Ver',
    create: 'Criar',
    update: 'Editar',
    delete: 'Excluir',
};

const Roles: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [form] = Form.useForm();

    // State for permission toggles: { resource: { action: boolean } }
    const [permissionToggles, setPermissionToggles] = useState<Record<string, Record<string, boolean>>>({});

    const fetchRoles = async (page = 1, size = 10, search = '') => {
        setLoading(true);
        try {
            const response = await rolesApi.list(page, size, search || undefined);
            setRoles(response.items);
            setPagination({ current: page, pageSize: size, total: response.total });
        } catch (error) {
            message.error('Erro ao carregar cargos');
        } finally {
            setLoading(false);
        }
    };

    const fetchPermissions = async () => {
        try {
            const response = await permissionsApi.list(1, 100);
            setPermissions(response.items);
        } catch {
            // Ignore
        }
    };

    useEffect(() => {
        fetchRoles();
        fetchPermissions();
    }, []);

    // Group permissions by resource
    const permissionsByResource = useMemo(() => {
        const grouped: Record<string, Permission[]> = {};
        permissions.forEach(p => {
            if (!grouped[p.resource]) grouped[p.resource] = [];
            grouped[p.resource].push(p);
        });
        return grouped;
    }, [permissions]);

    // Get sorted list of resources
    const resources = useMemo(() => {
        return Object.keys(permissionsByResource).sort((a, b) => {
            const labelA = moduleLabels[a] || a;
            const labelB = moduleLabels[b] || b;
            return labelA.localeCompare(labelB);
        });
    }, [permissionsByResource]);

    // Convert permission toggles to permission_ids
    const getPermissionIdsFromToggles = () => {
        const ids: string[] = [];
        Object.entries(permissionToggles).forEach(([resource, actions]) => {
            Object.entries(actions).forEach(([action, enabled]) => {
                if (enabled) {
                    const perm = permissions.find(p => p.resource === resource && p.action === action);
                    if (perm) ids.push(perm.id);
                }
            });
        });
        return ids;
    };

    // Convert permission objects to toggles state
    const setTogglesFromPermissions = (perms: { resource: string; action: string }[]) => {
        const toggles: Record<string, Record<string, boolean>> = {};
        perms.forEach(p => {
            if (!toggles[p.resource]) toggles[p.resource] = {};
            toggles[p.resource][p.action] = true;
        });
        setPermissionToggles(toggles);
    };

    const handleSearch = (value: string) => {
        setSearchText(value);
        fetchRoles(1, pagination.pageSize, value);
    };

    const handleTableChange = (paginationConfig: { current?: number; pageSize?: number }) => {
        fetchRoles(paginationConfig.current || 1, paginationConfig.pageSize || 10, searchText);
    };

    const handleAdd = () => {
        setEditingRole(null);
        form.resetFields();
        setPermissionToggles({});
        setModalOpen(true);
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        form.setFieldsValue({
            name: role.name,
            description: role.description,
        });
        setTogglesFromPermissions(role.permissions);
        setModalOpen(true);
    };

    const handleDelete = async (role: Role) => {
        Modal.confirm({
            title: 'Confirmar exclusão',
            content: `Deseja realmente excluir o cargo "${role.name}"?`,
            okText: 'Excluir',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await rolesApi.delete(role.id);
                    message.success('Cargo excluído com sucesso');
                    fetchRoles(pagination.current, pagination.pageSize, searchText);
                } catch (error) {
                    message.error('Erro ao excluir cargo');
                }
            },
        });
    };

    const handleSubmit = async (values: { name: string; description?: string }) => {
        try {
            const data: RoleCreate | RoleUpdate = {
                ...values,
                permission_ids: getPermissionIdsFromToggles(),
            };
            if (editingRole) {
                await rolesApi.update(editingRole.id, data);
                message.success('Cargo atualizado com sucesso');
            } else {
                await rolesApi.create(data as RoleCreate);
                message.success('Cargo criado com sucesso');
            }
            setModalOpen(false);
            fetchRoles(pagination.current, pagination.pageSize, searchText);
        } catch (error) {
            message.error(editingRole ? 'Erro ao atualizar cargo' : 'Erro ao criar cargo');
        }
    };

    const handleToggle = (resource: string, action: string, checked: boolean) => {
        setPermissionToggles(prev => ({
            ...prev,
            [resource]: {
                ...(prev[resource] || {}),
                [action]: checked,
            },
        }));
    };

    const handleToggleAllForResource = (resource: string, checked: boolean) => {
        const resourcePerms = permissionsByResource[resource] || [];
        const newActions: Record<string, boolean> = {};
        resourcePerms.forEach(p => {
            newActions[p.action] = checked;
        });
        setPermissionToggles(prev => ({
            ...prev,
            [resource]: newActions,
        }));
    };

    const columns: ColumnsType<Role> = [
        {
            title: 'Nome',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Descrição',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Módulos',
            dataIndex: 'permissions',
            key: 'permissions',
            render: (perms: Permission[]) => {
                const resources = [...new Set(perms.map(p => p.resource))];
                return (
                    <Space wrap>
                        {resources.slice(0, 4).map(r => (
                            <Tag key={r} color="purple">{moduleLabels[r] || r}</Tag>
                        ))}
                        {resources.length > 4 && <Tag>+{resources.length - 4}</Tag>}
                    </Space>
                );
            },
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
                <Title level={2} style={{ margin: 0 }}>Cargos</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Novo Cargo
                </Button>
            </div>

            <Card>
                <Space style={{ marginBottom: 16 }}>
                    <Input.Search
                        placeholder="Buscar por nome"
                        allowClear
                        onSearch={handleSearch}
                        style={{ width: 300 }}
                        prefix={<SearchOutlined />}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => fetchRoles(pagination.current, pagination.pageSize, searchText)}>
                        Atualizar
                    </Button>
                </Space>

                <Table
                    columns={columns}
                    dataSource={roles}
                    loading={loading}
                    rowKey="id"
                    pagination={{ ...pagination, showSizeChanger: true, showTotal: (total) => `Total: ${total} cargos` }}
                    onChange={handleTableChange}
                />
            </Card>

            <Modal
                title={editingRole ? 'Editar Cargo' : 'Novo Cargo'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                width={700}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Descrição">
                        <TextArea rows={2} />
                    </Form.Item>

                    <Divider>Permissões por Módulo</Divider>

                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#fafafa', position: 'sticky', top: 0 }}>
                                    <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>Módulo</th>
                                    <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', width: 60 }}>Todos</th>
                                    {['read', 'create', 'update', 'delete'].map(action => (
                                        <th key={action} style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid #f0f0f0', width: 70 }}>
                                            {actionLabels[action] || action}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {resources.map(resource => {
                                    const resourcePerms = permissionsByResource[resource] || [];
                                    const availableActions = resourcePerms.map(p => p.action);
                                    const allEnabled = availableActions.every(a => permissionToggles[resource]?.[a]);

                                    return (
                                        <tr key={resource} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '8px 12px' }}>
                                                <Text strong>{moduleLabels[resource] || resource}</Text>
                                            </td>
                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                <Switch
                                                    size="small"
                                                    checked={allEnabled}
                                                    onChange={(checked) => handleToggleAllForResource(resource, checked)}
                                                />
                                            </td>
                                            {['read', 'create', 'update', 'delete'].map(action => {
                                                const hasAction = availableActions.includes(action);
                                                return (
                                                    <td key={action} style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                        {hasAction ? (
                                                            <Switch
                                                                size="small"
                                                                checked={permissionToggles[resource]?.[action] || false}
                                                                onChange={(checked) => handleToggle(resource, action, checked)}
                                                            />
                                                        ) : (
                                                            <Text type="secondary">-</Text>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <Form.Item style={{ marginTop: 24 }}>
                        <Space>
                            <Button type="primary" htmlType="submit">{editingRole ? 'Salvar' : 'Criar'}</Button>
                            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Roles;
