/**
 * Teams management page.
 */
import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Input, Modal, Form, message,
    Typography, Card
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Team, TeamCreate, TeamUpdate } from '../../types';
import { teamsApi } from '../../services/api';

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

    const handleSearch = (value: string) => {
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
                    message.success('Equipe excluída com sucesso');
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
                message.success('Equipe atualizada com sucesso');
            } else {
                await teamsApi.create(values as TeamCreate);
                message.success('Equipe criada com sucesso');
            }
            setModalOpen(false);
            fetchTeams(pagination.current, pagination.pageSize, searchText);
        } catch (error) {
            message.error(editingTeam ? 'Erro ao atualizar equipe' : 'Erro ao criar equipe');
        }
    };

    const columns: ColumnsType<Team> = [
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
            title: 'Criado em',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => new Date(date).toLocaleDateString('pt-BR'),
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
                <Title level={2} style={{ margin: 0 }}>Equipes</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Nova Equipe
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
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => fetchTeams(pagination.current, pagination.pageSize, searchText)}
                    >
                        Atualizar
                    </Button>
                </Space>

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
            </Card>

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
                        label="Nome"
                        rules={[{ required: true, message: 'Informe o nome' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item name="description" label="Descrição">
                        <TextArea rows={3} />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {editingTeam ? 'Salvar' : 'Criar'}
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

export default Teams;
