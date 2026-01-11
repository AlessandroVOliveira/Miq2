/**
 * Teams management page with Deep Blue design.
 */
import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Input, Modal, Form, message,
    Typography, Card
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined, TeamOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Team, TeamCreate, TeamUpdate } from '../../types';
import { teamsApi } from '../../services/api';
import styles from './teams.module.css';

const { Title } = Typography;
const { TextArea } = Input;

const Teams: React.FC = () => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [form] = Form.useForm();

    const fetchTeams = async (page = 1, size = 10, search = '') => {
        setLoading(true);
        try {
            const response = await teamsApi.list(page, size, search || undefined);
            setTeams(response.items);
            setPagination({ current: page, pageSize: size, total: response.total });
        } catch (error) {
            message.error('Erro ao carregar equipes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchText(value);
        fetchTeams(1, pagination.pageSize, value);
    };

    const handleTableChange = (paginationConfig: { current?: number; pageSize?: number }) => {
        fetchTeams(paginationConfig.current || 1, paginationConfig.pageSize || 10, searchText);
    };

    const handleAdd = () => {
        setEditingTeam(null);
        form.resetFields();
        setModalOpen(true);
    };

    const handleEdit = (team: Team) => {
        setEditingTeam(team);
        form.setFieldsValue({
            name: team.name,
            description: team.description,
        });
        setModalOpen(true);
    };

    const handleDelete = async (team: Team) => {
        Modal.confirm({
            title: 'Confirmar exclusão',
            content: `Deseja realmente excluir a equipe "${team.name}"?`,
            okText: 'Excluir',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await teamsApi.delete(team.id);
                    message.success('Equipe excluída');
                    fetchTeams(pagination.current, pagination.pageSize, searchText);
                } catch (error) {
                    message.error('Erro ao excluir equipe');
                }
            },
        });
    };

    const handleSubmit = async (values: TeamCreate | TeamUpdate) => {
        try {
            if (editingTeam) {
                await teamsApi.update(editingTeam.id, values);
                message.success('Equipe atualizada');
            } else {
                await teamsApi.create(values as TeamCreate);
                message.success('Equipe criada');
            }
            setModalOpen(false);
            fetchTeams(pagination.current, pagination.pageSize, searchText);
        } catch (error) {
            message.error(editingTeam ? 'Erro ao atualizar' : 'Erro ao criar');
        }
    };

    const columns: ColumnsType<Team> = [
        {
            title: 'NOME DA EQUIPE',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (text) => <span style={{ fontWeight: 600, color: '#0f172a' }}>{text}</span>
        },
        {
            title: 'DESCRIÇÃO',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
            render: (text) => <span style={{ color: '#64748b' }}>{text || '-'}</span>
        },
        {
            title: 'CRIADO EM',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => <span style={{ color: '#64748b' }}>{new Date(date).toLocaleDateString('pt-BR')}</span>,
        },
        {
            title: <div style={{ textAlign: 'right' }}>AÇÕES</div>,
            key: 'actions',
            render: (_, record) => (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
                </div>
            ),
        },
    ];

    return (
        <div style={{ minHeight: '100%', background: '#f8fafc' }}>
            <div className={styles.pageHeader}>
                <div className={styles.headerContent}>
                    <div className={styles.titleSection}>
                        <h2>Equipes</h2>
                        <p>Gerencie equipes operacionais e grupos.</p>
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        style={{ background: '#1064fe' }}
                        onClick={handleAdd}
                    >
                        Nova Equipe
                    </Button>
                </div>
            </div>

            <div className={styles.contentSection}>
                <div className={styles.tableCard}>
                    <div className={styles.actions}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Buscar equipes..."
                            style={{ width: 300, borderRadius: 8 }}
                            value={searchText}
                            onChange={handleSearch}
                        />
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => fetchTeams(pagination.current, pagination.pageSize, searchText)}
                        >
                            Atualizar
                        </Button>
                    </div>

                    <Table
                        columns={columns}
                        dataSource={teams}
                        loading={loading}
                        rowKey="id"
                        pagination={{
                            ...pagination,
                            showSizeChanger: true,
                            showTotal: (total) => `Total: ${total} equipes`,
                        }}
                        onChange={handleTableChange}
                    />
                </div>
            </div>

            <Modal
                title={editingTeam ? 'Editar Equipe' : 'Nova Equipe'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        name="name"
                        label="Nome da Equipe"
                        rules={[{ required: true, message: 'Campo obrigatório' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item name="description" label="Descrição">
                        <TextArea rows={3} />
                    </Form.Item>

                    <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="primary" htmlType="submit" style={{ background: '#1064fe' }}>
                                {editingTeam ? 'Salvar' : 'Criar'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Teams;
