/**
 * Task detail page with diary and blockers.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Typography, Button, Space, Tag, Descriptions, Divider,
    Spin, Modal, Input, List, message, Timeline, Alert
} from 'antd';
import {
    ArrowLeftOutlined, CheckCircleOutlined,
    PlayCircleOutlined, PlusOutlined, LockOutlined, UnlockOutlined
} from '@ant-design/icons';
import type { Task, TaskStatus, TaskPriority } from '../../types';
import { tasksApi } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const statusColors: Record<TaskStatus, string> = {
    scheduled: 'blue',
    in_progress: 'processing',
    completed: 'success',
    blocked: 'error',
    cancelled: 'default',
};

const statusLabels: Record<TaskStatus, string> = {
    scheduled: 'Agendada',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    blocked: 'Bloqueada',
    cancelled: 'Cancelada',
};

const priorityColors: Record<TaskPriority, string> = {
    low: 'green',
    medium: 'blue',
    high: 'orange',
    urgent: 'red',
};

const priorityLabels: Record<TaskPriority, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
};

const TaskDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [diaryContent, setDiaryContent] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [unblockNotes, setUnblockNotes] = useState('');
    const [blockModal, setBlockModal] = useState(false);
    const [unblockModal, setUnblockModal] = useState(false);

    const fetchTask = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await tasksApi.get(id);
            setTask(data);
        } catch {
            message.error('Erro ao carregar tarefa');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTask(); }, [id]);

    const handleStatusChange = async (newStatus: TaskStatus) => {
        if (!id) return;
        try {
            await tasksApi.update(id, { status: newStatus });
            message.success('Status atualizado');
            fetchTask();
        } catch { message.error('Erro ao atualizar'); }
    };

    const handleAddDiary = async () => {
        if (!id || !diaryContent.trim()) return;
        try {
            await tasksApi.addDiaryEntry(id, { content: diaryContent });
            message.success('Entrada adicionada');
            setDiaryContent('');
            fetchTask();
        } catch { message.error('Erro ao adicionar'); }
    };

    const handleBlock = async () => {
        if (!id || !blockReason.trim()) return;
        try {
            await tasksApi.blockTask(id, { reason: blockReason });
            message.success('Tarefa bloqueada');
            setBlockModal(false);
            setBlockReason('');
            fetchTask();
        } catch { message.error('Erro ao bloquear'); }
    };

    const handleUnblock = async () => {
        if (!id) return;
        try {
            await tasksApi.unblockTask(id, { resolution_notes: unblockNotes });
            message.success('Tarefa desbloqueada');
            setUnblockModal(false);
            setUnblockNotes('');
            fetchTask();
        } catch { message.error('Erro ao desbloquear'); }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
    if (!task) return <Text>Tarefa não encontrada</Text>;

    const activeBlockers = task.blockers.filter(b => !b.resolved_at);

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/calendar')}>Voltar</Button>
                {task.status === 'scheduled' && (
                    <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStatusChange('in_progress')}>Iniciar</Button>
                )}
                {task.status === 'in_progress' && (
                    <>
                        <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleStatusChange('completed')}>Concluir</Button>
                        <Button danger icon={<LockOutlined />} onClick={() => setBlockModal(true)}>Bloquear</Button>
                    </>
                )}
                {task.status === 'blocked' && (
                    <Button type="primary" icon={<UnlockOutlined />} onClick={() => setUnblockModal(true)}>Desbloquear</Button>
                )}
            </Space>

            {activeBlockers.length > 0 && (
                <Alert
                    type="error"
                    message="Tarefa Bloqueada"
                    description={activeBlockers.map(b => b.reason).join('; ')}
                    style={{ marginBottom: 16 }}
                    showIcon
                />
            )}

            <Card style={{ marginBottom: 16 }}>
                <Title level={3}>{task.title}</Title>
                <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
                    <Descriptions.Item label="Cliente">{task.client?.company_name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Responsável">{task.assigned_user?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Equipe">{task.team?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Status">
                        <Tag color={statusColors[task.status]}>{statusLabels[task.status]}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Prioridade">
                        <Tag color={priorityColors[task.priority]}>{priorityLabels[task.priority]}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Duração">{task.duration_minutes} min</Descriptions.Item>
                    <Descriptions.Item label="Data">{task.scheduled_date ? dayjs(task.scheduled_date).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="Hora">{task.scheduled_time || (task.is_all_day ? 'Dia inteiro' : '-')}</Descriptions.Item>
                </Descriptions>
                <Divider />
                <Text strong>Descrição:</Text>
                <Paragraph>{task.description || 'Sem descrição'}</Paragraph>
            </Card>

            <Card title="Diário de Bordo" style={{ marginBottom: 16 }}>
                <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                    <TextArea
                        placeholder="Adicionar observação..."
                        value={diaryContent}
                        onChange={(e) => setDiaryContent(e.target.value)}
                        rows={2}
                        style={{ flex: 1 }}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddDiary}>Adicionar</Button>
                </Space.Compact>
                <Timeline items={task.diary_entries.map(e => ({
                    color: 'blue',
                    children: (
                        <>
                            <Text strong>{e.user.name}</Text> - <Text type="secondary">{dayjs(e.created_at).format('DD/MM/YYYY HH:mm')}</Text>
                            <Paragraph style={{ marginTop: 4 }}>{e.content}</Paragraph>
                        </>
                    )
                }))} />
                {task.diary_entries.length === 0 && <Text type="secondary">Nenhuma entrada no diário</Text>}
            </Card>

            <Card title="Histórico de Bloqueios">
                <List
                    dataSource={task.blockers}
                    renderItem={(b) => (
                        <List.Item>
                            <List.Item.Meta
                                title={<><Tag color={b.resolved_at ? 'default' : 'error'}>{b.resolved_at ? 'Resolvido' : 'Ativo'}</Tag> {b.reason}</>}
                                description={<>
                                    Bloqueado por {b.blocked_by.name} em {dayjs(b.blocked_at).format('DD/MM/YYYY HH:mm')}
                                    {b.resolved_at && <> | Resolvido em {dayjs(b.resolved_at).format('DD/MM/YYYY HH:mm')}: {b.resolution_notes}</>}
                                </>}
                            />
                        </List.Item>
                    )}
                    locale={{ emptyText: 'Nenhum bloqueio registrado' }}
                />
            </Card>

            <Modal title="Bloquear Tarefa" open={blockModal} onCancel={() => setBlockModal(false)} onOk={handleBlock}>
                <TextArea placeholder="Motivo do bloqueio" rows={3} value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
            </Modal>

            <Modal title="Desbloquear Tarefa" open={unblockModal} onCancel={() => setUnblockModal(false)} onOk={handleUnblock}>
                <TextArea placeholder="Notas de resolução (opcional)" rows={3} value={unblockNotes} onChange={(e) => setUnblockNotes(e.target.value)} />
            </Modal>
        </div>
    );
};

export default TaskDetail;
