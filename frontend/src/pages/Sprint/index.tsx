/**
 * Sprint Semanal - Visualizador de tarefas por período.
 * Mostra tarefas em aberto (agrupadas por responsável) e
 * tarefas finalizadas no período selecionado.
 * Permite filtrar por equipe e ver diário de bordo.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
    Card, Typography, Button, Space, Row, Col, Statistic,
    List, Tag, DatePicker, Collapse, Empty, Spin, Select, Modal, Tooltip, Timeline, Progress
} from 'antd';
import {
    CheckCircleOutlined, ClockCircleOutlined,
    UserOutlined, WarningOutlined, SearchOutlined, TeamOutlined,
    FileTextOutlined, BookOutlined, RocketOutlined
} from '@ant-design/icons';
import type { TaskListItem, Team, Task } from '../../types';
import { tasksApi, teamsApi, implementationsApi } from '../../services/api';
import dayjs, { Dayjs } from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const statusLabels: Record<string, string> = {
    scheduled: 'Agendada',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    blocked: 'Bloqueada',
    cancelled: 'Cancelada',
};

const statusColors: Record<string, string> = {
    scheduled: 'blue',
    in_progress: 'processing',
    completed: 'success',
    blocked: 'error',
    cancelled: 'default',
};

const priorityColors: Record<string, string> = {
    low: 'green',
    medium: 'blue',
    high: 'orange',
    urgent: 'red',
};

const priorityLabels: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
};

interface GroupedTasks {
    [userId: string]: {
        userName: string;
        tasks: TaskListItem[];
    };
}

const SprintPage: React.FC = () => {
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
        dayjs().startOf('week'),
        dayjs().endOf('week')
    ]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(undefined);
    const [teamUsers, setTeamUsers] = useState<string[]>([]);
    const [openTasks, setOpenTasks] = useState<TaskListItem[]>([]);
    const [completedTasks, setCompletedTasks] = useState<TaskListItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Diary modal state
    const [diaryModalOpen, setDiaryModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [loadingDiary, setLoadingDiary] = useState(false);

    // Implementations state
    const [implementationsData, setImplementationsData] = useState<any>(null);

    // Load teams on mount
    useEffect(() => {
        const loadTeams = async () => {
            try {
                const res = await teamsApi.list(1, 100);
                setTeams(res.items);
            } catch (e) {
                console.error('Erro ao carregar equipes:', e);
            }
        };
        loadTeams();
    }, []);

    // Load team members when team changes
    useEffect(() => {
        const loadTeamMembers = async () => {
            if (!selectedTeamId) {
                setTeamUsers([]);
                return;
            }
            try {
                const team = await teamsApi.get(selectedTeamId);
                if (team.members) {
                    setTeamUsers(team.members.map(m => m.id));
                } else {
                    setTeamUsers([]);
                }
            } catch (e) {
                console.error('Erro ao carregar membros da equipe:', e);
                setTeamUsers([]);
            }
        };
        loadTeamMembers();
    }, [selectedTeamId]);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const [scheduled, inProgress, blocked, completed] = await Promise.all([
                tasksApi.list(1, 100, { status: 'scheduled' }),
                tasksApi.list(1, 100, { status: 'in_progress' }),
                tasksApi.list(1, 100, { status: 'blocked' }),
                tasksApi.list(1, 100, {
                    status: 'completed',
                    completed_after: dateRange[0].format('YYYY-MM-DD'),
                    completed_before: dateRange[1].format('YYYY-MM-DD')
                })
            ]);

            let allOpen = [...scheduled.items, ...inProgress.items, ...blocked.items];
            let allCompleted = completed.items;

            if (selectedTeamId && teamUsers.length > 0) {
                allOpen = allOpen.filter(t => t.assigned_user && teamUsers.includes(t.assigned_user.id));
                allCompleted = allCompleted.filter(t => t.assigned_user && teamUsers.includes(t.assigned_user.id));
            }

            setOpenTasks(allOpen);
            setCompletedTasks(allCompleted);

            // Fetch implementations progress
            const implProgress = await implementationsApi.getSprintProgress(
                dateRange[0].format('YYYY-MM-DD'),
                dateRange[1].format('YYYY-MM-DD'),
                selectedTeamId
            );
            setImplementationsData(implProgress);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    // Open diary modal
    const handleViewDiary = async (taskId: string) => {
        setLoadingDiary(true);
        setDiaryModalOpen(true);
        try {
            const task = await tasksApi.get(taskId);
            setSelectedTask(task);
        } catch (e) {
            console.error('Erro ao carregar tarefa:', e);
        } finally {
            setLoadingDiary(false);
        }
    };

    // Group tasks by assigned user
    const groupByUser = (tasks: TaskListItem[]): GroupedTasks => {
        const grouped: GroupedTasks = {};
        tasks.forEach(task => {
            const userId = task.assigned_user?.id || 'unassigned';
            const userName = task.assigned_user?.name || 'Sem Responsável';
            if (!grouped[userId]) {
                grouped[userId] = { userName, tasks: [] };
            }
            grouped[userId].tasks.push(task);
        });
        Object.values(grouped).forEach(group => {
            group.tasks.sort((a, b) => {
                if (!a.scheduled_date) return 1;
                if (!b.scheduled_date) return -1;
                return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
            });
        });
        return grouped;
    };

    const groupedOpen = useMemo(() => groupByUser(openTasks), [openTasks]);
    const groupedCompleted = useMemo(() => groupByUser(completedTasks), [completedTasks]);

    const today = dayjs().startOf('day');
    const overdueTasks = openTasks.filter(t =>
        t.scheduled_date && dayjs(t.scheduled_date).isBefore(today)
    );

    const isOverdue = (task: TaskListItem) => {
        return task.scheduled_date && dayjs(task.scheduled_date).isBefore(today);
    };

    const handleSearch = () => {
        fetchTasks();
    };

    const renderTaskItem = (task: TaskListItem, showCompleted = false) => {
        const overdue = !showCompleted && isOverdue(task);
        return (
            <List.Item
                key={task.id}
                style={{
                    background: overdue ? '#fff1f0' : undefined,
                    padding: '8px 12px',
                    borderLeft: overdue ? '3px solid #ff4d4f' : undefined
                }}
                actions={[
                    <Tooltip title="Ver Diário de Bordo" key="diary">
                        <Button
                            type="text"
                            size="small"
                            icon={<BookOutlined />}
                            onClick={() => handleViewDiary(task.id)}
                        />
                    </Tooltip>
                ]}
            >
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag color={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Tag>
                        <Text strong style={{ flex: 1 }}>{task.title}</Text>
                        <Tag color={statusColors[task.status]}>{statusLabels[task.status]}</Tag>
                    </div>
                    <div style={{ marginTop: 4, display: 'flex', gap: 16 }}>
                        {task.client && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                🏢 {task.client.company_name}
                            </Text>
                        )}
                        {task.scheduled_date && (
                            <Text type={overdue ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                                📅 {dayjs(task.scheduled_date).format('DD/MM/YYYY')}
                                {task.scheduled_time && ` às ${task.scheduled_time.substring(0, 5)}`}
                                {overdue && ' (ATRASADA)'}
                            </Text>
                        )}
                    </div>
                </div>
            </List.Item>
        );
    };

    const selectedTeamName = teams.find(t => t.id === selectedTeamId)?.name;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <Title level={2} style={{ margin: 0 }}>
                    Sprint Semanal
                    {selectedTeamName && <Tag color="blue" style={{ marginLeft: 12 }}>{selectedTeamName}</Tag>}
                </Title>
                <Space wrap>
                    <Select
                        placeholder="Filtrar por Equipe"
                        allowClear
                        style={{ width: 200 }}
                        value={selectedTeamId}
                        onChange={setSelectedTeamId}
                        options={teams.map(t => ({ value: t.id, label: t.name }))}
                        suffixIcon={<TeamOutlined />}
                    />
                    <RangePicker
                        value={dateRange}
                        onChange={(dates) => dates && setDateRange([dates[0]!, dates[1]!])}
                        format="DD/MM/YYYY"
                        placeholder={['Data Início', 'Data Fim']}
                    />
                    <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch} loading={loading}>
                        Consultar
                    </Button>
                </Space>
            </div>

            {/* Summary Cards */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Tarefas em Aberto"
                            value={openTasks.length}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title={`Finalizadas (${dateRange[0].format('DD/MM')} - ${dateRange[1].format('DD/MM')})`}
                            value={completedTasks.length}
                            prefix={<CheckCircleOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="Atrasadas"
                            value={overdueTasks.length}
                            prefix={<WarningOutlined />}
                            valueStyle={{ color: overdueTasks.length > 0 ? '#ff4d4f' : '#52c41a' }}
                        />
                    </Card>
                </Col>
            </Row>

            <Spin spinning={loading}>
                {/* Open Tasks */}
                <Card
                    title={
                        <Space>
                            <ClockCircleOutlined style={{ color: '#1890ff' }} />
                            <span>Tarefas em Aberto ({openTasks.length})</span>
                        </Space>
                    }
                    style={{ marginBottom: 24 }}
                >
                    {Object.keys(groupedOpen).length === 0 ? (
                        <Empty description="Nenhuma tarefa em aberto" />
                    ) : (
                        <Collapse
                            defaultActiveKey={Object.keys(groupedOpen)}
                            items={Object.entries(groupedOpen).map(([userId, group]) => ({
                                key: userId,
                                label: (
                                    <Space>
                                        <UserOutlined />
                                        <Text strong>{group.userName}</Text>
                                        <Tag>{group.tasks.length} tarefas</Tag>
                                        {group.tasks.some(isOverdue) && (
                                            <Tag color="error">
                                                {group.tasks.filter(isOverdue).length} atrasadas
                                            </Tag>
                                        )}
                                    </Space>
                                ),
                                children: (
                                    <List
                                        size="small"
                                        dataSource={group.tasks}
                                        renderItem={(task) => renderTaskItem(task)}
                                    />
                                )
                            }))}
                        />
                    )}
                </Card>

                {/* Completed Tasks */}
                <Card
                    title={
                        <Space>
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            <span>Finalizadas no Período ({completedTasks.length})</span>
                            <Text type="secondary">
                                {dateRange[0].format('DD/MM/YYYY')} - {dateRange[1].format('DD/MM/YYYY')}
                            </Text>
                        </Space>
                    }
                >
                    {Object.keys(groupedCompleted).length === 0 ? (
                        <Empty description="Nenhuma tarefa finalizada neste período" />
                    ) : (
                        <Collapse
                            defaultActiveKey={Object.keys(groupedCompleted)}
                            items={Object.entries(groupedCompleted).map(([userId, group]) => ({
                                key: userId,
                                label: (
                                    <Space>
                                        <UserOutlined />
                                        <Text strong>{group.userName}</Text>
                                        <Tag color="success">{group.tasks.length} finalizadas</Tag>
                                    </Space>
                                ),
                                children: (
                                    <List
                                        size="small"
                                        dataSource={group.tasks}
                                        renderItem={(task) => renderTaskItem(task, true)}
                                    />
                                )
                            }))}
                        />
                    )}
                </Card>

                {/* Implementations Progress */}
                <Card
                    title={
                        <Space>
                            <RocketOutlined style={{ color: '#722ed1' }} />
                            <span>Implantações - Progresso no Período ({implementationsData?.total_implementations || 0})</span>
                            <Text type="secondary">
                                {dateRange[0].format('DD/MM/YYYY')} - {dateRange[1].format('DD/MM/YYYY')}
                            </Text>
                        </Space>
                    }
                    style={{ marginTop: 24 }}
                >
                    {!implementationsData || implementationsData.groups?.length === 0 ? (
                        <Empty description="Nenhum progresso de implantação neste período" />
                    ) : (
                        <Collapse
                            defaultActiveKey={implementationsData?.groups?.map((g: any) => g.user_id) || []}
                            items={implementationsData?.groups?.map((group: any) => ({
                                key: group.user_id,
                                label: (
                                    <Space>
                                        <UserOutlined />
                                        <Text strong>{group.user_name}</Text>
                                        <Tag color="purple">{group.implementations.length} implantações</Tag>
                                    </Space>
                                ),
                                children: (
                                    <List
                                        size="small"
                                        dataSource={group.implementations}
                                        renderItem={(impl: any) => (
                                            <List.Item>
                                                <div style={{ width: '100%' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <Text strong>{impl.title}</Text>
                                                            {impl.client && (
                                                                <Text type="secondary" style={{ marginLeft: 8 }}>
                                                                    🏢 {impl.client.company_name}
                                                                </Text>
                                                            )}
                                                        </div>
                                                        <Space>
                                                            <Tag color="green">+{impl.completed_in_period} no período</Tag>
                                                            <Tag>{impl.completed_total}/{impl.total_items}</Tag>
                                                        </Space>
                                                    </div>
                                                    <Progress
                                                        percent={impl.progress_percentage}
                                                        size="small"
                                                        style={{ marginTop: 8 }}
                                                        strokeColor="#722ed1"
                                                    />
                                                    {impl.items_completed_in_period?.length > 0 && (
                                                        <Collapse
                                                            size="small"
                                                            style={{ marginTop: 8 }}
                                                            items={[{
                                                                key: 'items',
                                                                label: <Text type="secondary">Itens concluídos no período ({impl.items_completed_in_period.length})</Text>,
                                                                children: (
                                                                    <List
                                                                        size="small"
                                                                        dataSource={impl.items_completed_in_period}
                                                                        renderItem={(item: any) => (
                                                                            <List.Item style={{ padding: '4px 0' }}>
                                                                                <Space>
                                                                                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                                                                    <Text>{item.title}</Text>
                                                                                    {item.category && <Tag>{item.category}</Tag>}
                                                                                </Space>
                                                                            </List.Item>
                                                                        )}
                                                                    />
                                                                )
                                                            }]}
                                                        />
                                                    )}
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                )
                            })) || []}
                        />
                    )}
                </Card>
            </Spin>

            {/* Diary Modal */}
            <Modal
                title={
                    <Space>
                        <BookOutlined />
                        <span>Diário de Bordo</span>
                        {selectedTask && <Text type="secondary">- {selectedTask.title}</Text>}
                    </Space>
                }
                open={diaryModalOpen}
                onCancel={() => { setDiaryModalOpen(false); setSelectedTask(null); }}
                footer={[
                    <Button key="close" onClick={() => { setDiaryModalOpen(false); setSelectedTask(null); }}>
                        Fechar
                    </Button>
                ]}
                width={600}
            >
                <Spin spinning={loadingDiary}>
                    {selectedTask && (
                        <>
                            {/* Task info */}
                            <Card size="small" style={{ marginBottom: 16 }}>
                                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                    <Text strong>{selectedTask.title}</Text>
                                    <Space>
                                        <Tag color={priorityColors[selectedTask.priority]}>{priorityLabels[selectedTask.priority]}</Tag>
                                        <Tag color={statusColors[selectedTask.status]}>{statusLabels[selectedTask.status]}</Tag>
                                        {selectedTask.assigned_user && (
                                            <Text type="secondary"><UserOutlined /> {selectedTask.assigned_user.name}</Text>
                                        )}
                                    </Space>
                                    {selectedTask.description && (
                                        <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                                            {selectedTask.description}
                                        </Paragraph>
                                    )}
                                </Space>
                            </Card>

                            {/* Diary entries */}
                            {selectedTask.diary_entries && selectedTask.diary_entries.length > 0 ? (
                                <Timeline
                                    items={selectedTask.diary_entries.map(entry => ({
                                        color: 'blue',
                                        children: (
                                            <div key={entry.id}>
                                                <Text strong>{entry.user?.name || 'Usuário'}</Text>
                                                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                                    {dayjs(entry.created_at).format('DD/MM/YYYY HH:mm')}
                                                </Text>
                                                <Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                                                    {entry.content}
                                                </Paragraph>
                                            </div>
                                        )
                                    }))}
                                />
                            ) : (
                                <Empty
                                    description="Nenhuma entrada no diário de bordo"
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                />
                            )}
                        </>
                    )}
                </Spin>
            </Modal>
        </div>
    );
};

export default SprintPage;
