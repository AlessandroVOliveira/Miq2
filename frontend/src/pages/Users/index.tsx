/**
 * Users management page with Deep Blue design.
 */
import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Input, Modal, Form, message,
    Tag, Switch, Select, Typography, Avatar, Dropdown
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, TeamOutlined, UserOutlined, MailOutlined,
    MoreOutlined, CheckCircleFilled, CloseCircleFilled
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { User, UserCreate, UserUpdate, Team, Role } from '../../types';
import { usersApi, teamsApi, rolesApi } from '../../services/api';
import styles from './users.module.css';

const { Title, Text } = Typography;

const Users: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [activeTab, setActiveTab] = useState('all');
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

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
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
                    message.success('Usuário excluído');
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
                message.success('Usuário atualizado');
            } else {
                await usersApi.create(values as UserCreate);
                message.success('Usuário criado');
            }
            setModalOpen(false);
            fetchUsers(pagination.current, pagination.pageSize, searchText);
        } catch (error) {
            message.error(editingUser ? 'Erro ao atualizar' : 'Erro ao criar');
        }
    };

    const columns: ColumnsType<User> = [
        {
            title: 'COLABORADOR',
            key: 'employee',
            render: (_: any, record: User) => (
                <div className={styles.userCell}>
                    <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: '#e2e8f0', color: '#64748b' }} src={record.profile_image} />
                    <div>
                        <div className={styles.userName}>{record.name}</div>
                        <div className={styles.userEmail}>{record.email}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'CARGO',
            key: 'role',
            render: (_: any, record: User) => (
                <Space wrap>
                    {record.roles.length > 0 ? record.roles.map(role => (
                        <Tag key={role.id} style={{ borderRadius: 99, border: 'none', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }}>{role.name}</Tag>
                    )) : <Text type="secondary" style={{ fontSize: 12 }}>Sem cargo</Text>}
                </Space>
            )
        },
        {
            title: 'EQUIPES',
            key: 'teams',
            render: (_: any, record: User) => (
                <Space wrap>
                    {record.teams.map(team => (
                        <Tag key={team.id} style={{ borderRadius: 99, border: 'none', background: '#f8fafc', color: '#64748b' }}>{team.name}</Tag>
                    ))}
                </Space>
            )
        },
        {
            title: 'STATUS',
            key: 'status',
            render: (_: any, record: User) => (
                <div className={styles.statusBadge}>
                    <div className={styles.statusDot} style={{ background: record.is_active ? '#22c55e' : '#cbd5e1' }}></div>
                    {record.is_active ? 'Ativo' : 'Inativo'}
                </div>
            )
        },
        {
            title: <div style={{ textAlign: 'right' }}>AÇÕES</div>,
            key: 'actions',
            render: (_, record) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button type="link" style={{ fontWeight: 700 }} onClick={() => handleEdit(record)}>Editar</Button>
                    <Button type="text" style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#64748b' }}>Permissões</Button>
                </div>
            ),
        },
    ];

    const stats = {
        total: users.length, // approximation based on current page/fetch
        active: users.filter(u => u.is_active).length,
        pending: 0 // placeholder
    };

    return (
        <div style={{ minHeight: '100%', background: '#f8fafc' }}>
            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.headerContent}>
                    <div className={styles.titleSection}>
                        <h2>Gestão de Equipes</h2>
                        <p>Configure cargos e níveis de acesso.</p>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        style={{ background: '#1064fe', boxShadow: '0 4px 12px rgba(16, 100, 254, 0.2)' }}
                        onClick={handleAdd}
                    >
                        Adicionar Membro
                    </Button>
                </div>

                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statInfo}>
                            <p>Total de Colaboradores</p>
                            <p>{pagination.total}</p>
                        </div>
                        <div className={styles.statIcon} style={{ background: '#f1f5f9', color: '#1064fe' }}>
                            <TeamOutlined />
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statInfo}>
                            <p>Ativos Agora</p>
                            <p>{stats.active}</p>
                        </div>
                        <div className={styles.statIcon} style={{ background: '#dcfce7', color: '#16a34a' }}>
                            <CheckCircleFilled />
                        </div>
                    </div>
                </div>

                <div className={styles.controlsSection}>

                    <div className={styles.tabs}>
                        <div className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`} onClick={() => setActiveTab('all')}>Todos</div>
                        <div className={`${styles.tab} ${activeTab === 'admins' ? styles.tabActive : ''}`} onClick={() => setActiveTab('admins')}>Administradores</div>
                        <div className={`${styles.tab} ${activeTab === 'techs' ? styles.tabActive : ''}`} onClick={() => setActiveTab('techs')}>Técnicos</div>
                        <div className={`${styles.tab} ${activeTab === 'support' ? styles.tabActive : ''}`} onClick={() => setActiveTab('support')}>Suporte</div>
                    </div>
                    <div className={styles.searchContainer}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Buscar membro..."
                            style={{ borderRadius: 8, padding: '8px 12px' }}
                            value={searchText}
                            onChange={handleSearch}
                        />
                    </div>
                </div>
            </div>

            {/* Table Content */}
            <div className={styles.contentSection}>
                <div className={styles.tableCard}>
                    <Table
                        columns={columns}
                        dataSource={users}
                        loading={loading}
                        rowKey="id"
                        pagination={{
                            ...pagination,
                            showSizeChanger: true,
                        }}
                        onChange={handleTableChange}
                    />
                </div>
            </div>

            {/* Modal */}
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
                    <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                        <Input />
                    </Form.Item>
                    {!editingUser && (
                        <Form.Item name="password" label="Senha" rules={[{ required: true }]}>
                            <Input.Password />
                        </Form.Item>
                    )}
                    <Form.Item name="team_ids" label="Equipes">
                        <Select mode="multiple" options={teams.map(t => ({ value: t.id, label: t.name }))} placeholder="Selecione equipes" />
                    </Form.Item>
                    <Form.Item name="role_ids" label="Cargos">
                        <Select mode="multiple" options={roles.map(r => ({ value: r.id, label: r.name }))} placeholder="Selecione cargos" />
                    </Form.Item>
                    <Space size="large">
                        <Form.Item name="is_active" label="Ativo" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                        <Form.Item name="is_superuser" label="Superusuário" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Space>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
                            <Button type="primary" htmlType="submit" style={{ background: '#1064fe' }}>
                                {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Users;
