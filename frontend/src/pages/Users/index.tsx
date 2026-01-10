/**
 * Users management page.
 */
import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Input, Modal, Form, message,
    Tag, Switch, Select, Typography, Card
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { User, UserCreate, UserUpdate, Team, Role } from '../../types';
import { usersApi, teamsApi, rolesApi } from '../../services/api';

const { Title } = Typography;

const Users: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [form] = Form.useForm();

    const fetchUsers = async (page = 1, size = 10, search = '') => {
        setLoading(true);
        try {
            const response = await usersApi.list(page, size, search || undefined);
            setUsers(response.items);
            setPagination({ current: page, pageSize: size, total: response.total });
        } catch (error) {
            message.error('Erro ao carregar usuários');
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamsAndRoles = async () => {
        try {
            const [teamsRes, rolesRes] = await Promise.all([
                teamsApi.list(1, 100),
                rolesApi.list(1, 100)
            ]);
            setTeams(teamsRes.items);
            setRoles(rolesRes.items);
        } catch {
            // Ignore errors for now
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchTeamsAndRoles();
    }, []);

    const handleSearch = (value: string) => {
        setSearchText(value);
        fetchUsers(1, pagination.pageSize, value);
    };

    const handleTableChange = (paginationConfig: { current?: number; pageSize?: number }) => {
        fetchUsers(paginationConfig.current || 1, paginationConfig.pageSize || 10, searchText);
    };

    const handleAdd = () => {
        setEditingUser(null);
        form.resetFields();
        setModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        form.setFieldsValue({
            email: user.email,
            name: user.name,
            is_active: user.is_active,
            is_superuser: user.is_superuser,
            team_ids: user.teams.map(t => t.id),
            role_ids: user.roles.map(r => r.id),
        });
        setModalOpen(true);
    };

    const handleDelete = async (user: User) => {
        Modal.confirm({
            title: 'Confirmar exclusão',
            content: `Deseja realmente excluir o usuário "${user.name}"?`,
            okText: 'Excluir',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await usersApi.delete(user.id);
                    message.success('Usuário excluído com sucesso');
                    fetchUsers(pagination.current, pagination.pageSize, searchText);
                } catch (error) {
                    message.error('Erro ao excluir usuário');
                }
            },
        });
    };

    const handleSubmit = async (values: UserCreate | UserUpdate) => {
        try {
            if (editingUser) {
                await usersApi.update(editingUser.id, values);
                message.success('Usuário atualizado com sucesso');
            } else {
                await usersApi.create(values as UserCreate);
                message.success('Usuário criado com sucesso');
            }
            setModalOpen(false);
            fetchUsers(pagination.current, pagination.pageSize, searchText);
        } catch (error) {
            message.error(editingUser ? 'Erro ao atualizar usuário' : 'Erro ao criar usuário');
        }
    };

    const columns: ColumnsType<User> = [
        {
            title: 'Nome',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Equipes',
            dataIndex: 'teams',
            key: 'teams',
            render: (teams: Team[]) => (
                <Space wrap>
                    {teams.map(team => (
                        <Tag key={team.id} color="blue">{team.name}</Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: 'Cargos',
            dataIndex: 'roles',
            key: 'roles',
            render: (roles: Role[]) => (
                <Space wrap>
                    {roles.map(role => (
                        <Tag key={role.id} color="green">{role.name}</Tag>
                    ))}
                </Space>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (isActive: boolean) => (
                <Tag color={isActive ? 'success' : 'default'}>
                    {isActive ? 'Ativo' : 'Inativo'}
                </Tag>
            ),
        },
        {
            title: 'Ações',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record)}
                    />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Usuários</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Novo Usuário
                </Button>
            </div>

            <Card>
                <Space style={{ marginBottom: 16 }}>
                    <Input.Search
                        placeholder="Buscar por nome ou email"
                        allowClear
                        onSearch={handleSearch}
                        style={{ width: 300 }}
                        prefix={<SearchOutlined />}
                    />
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => fetchUsers(pagination.current, pagination.pageSize, searchText)}
                    >
                        Atualizar
                    </Button>
                </Space>

                <Table
                    columns={columns}
                    dataSource={users}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showTotal: (total) => `Total: ${total} usuários`,
                    }}
                    onChange={handleTableChange}
                />
            </Card>

            <Modal
                title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    initialValues={{ is_active: true, is_superuser: false, team_ids: [], role_ids: [] }}
                >
                    <Form.Item
                        name="name"
                        label="Nome"
                        rules={[{ required: true, message: 'Informe o nome' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[
                            { required: true, message: 'Informe o email' },
                            { type: 'email', message: 'Email inválido' }
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    {!editingUser && (
                        <Form.Item
                            name="password"
                            label="Senha"
                            rules={[{ required: true, message: 'Informe a senha' }]}
                        >
                            <Input.Password />
                        </Form.Item>
                    )}

                    <Form.Item name="team_ids" label="Equipes">
                        <Select
                            mode="multiple"
                            placeholder="Selecione as equipes"
                            options={teams.map(t => ({ value: t.id, label: t.name }))}
                        />
                    </Form.Item>

                    <Form.Item name="role_ids" label="Cargos">
                        <Select
                            mode="multiple"
                            placeholder="Selecione os cargos"
                            options={roles.map(r => ({ value: r.id, label: r.name }))}
                        />
                    </Form.Item>

                    <Form.Item name="is_active" label="Ativo" valuePropName="checked">
                        <Switch />
                    </Form.Item>

                    <Form.Item name="is_superuser" label="Super usuário" valuePropName="checked">
                        <Switch />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {editingUser ? 'Salvar' : 'Criar'}
                            </Button>
                            <Button onClick={() => setModalOpen(false)}>
                                Cancelar
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Users;
