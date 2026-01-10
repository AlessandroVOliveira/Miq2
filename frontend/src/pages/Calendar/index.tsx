/**
 * Calendar page for tasks/agenda.
 */
import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Button, Space, Modal, Form, Input, Select,
    DatePicker, TimePicker, Switch, message, Tag, List, Badge
} from 'antd';
import {
    PlusOutlined, LeftOutlined, RightOutlined,
    CalendarOutlined, UnorderedListOutlined, DeleteOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { CalendarEvent, TaskCreate, TaskPriority, TaskListItem } from '../../types';
import { tasksApi, clientsApi, usersApi } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const priorityLabels: Record<TaskPriority, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
};

const Calendar: React.FC = () => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [allTasks, setAllTasks] = useState<TaskListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
    const [form] = Form.useForm();

    const [clients, setClients] = useState<{ label: string; value: string }[]>([]);
    const [users, setUsers] = useState<{ label: string; value: string }[]>([]);

    // Fetch events for calendar view (month-based)
    const fetchEvents = async () => {
        setLoading(true);
        const startDate = currentDate.startOf('month').format('YYYY-MM-DD');
        const endDate = currentDate.endOf('month').format('YYYY-MM-DD');
        try {
            const response = await tasksApi.getCalendar(startDate, endDate);
            setEvents(response.events);
        } catch {
            message.error('Erro ao carregar agenda');
        } finally {
            setLoading(false);
        }
    };

    // Fetch all pending tasks for list view (not completed/cancelled)
    const fetchAllPendingTasks = async () => {
        setLoading(true);
        try {
            // Fetch tasks that are scheduled, in_progress, or blocked (not completed/cancelled)
            const [scheduled, inProgress, blocked] = await Promise.all([
                tasksApi.list(1, 100, { status: 'scheduled' }),
                tasksApi.list(1, 100, { status: 'in_progress' }),
                tasksApi.list(1, 100, { status: 'blocked' }),
            ]);
            const combined = [...scheduled.items, ...inProgress.items, ...blocked.items];
            // Sort by scheduled_date
            combined.sort((a, b) => {
                if (!a.scheduled_date && !b.scheduled_date) return 0;
                if (!a.scheduled_date) return 1;
                if (!b.scheduled_date) return -1;
                return a.scheduled_date.localeCompare(b.scheduled_date);
            });
            setAllTasks(combined);
        } catch {
            message.error('Erro ao carregar tarefas');
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const [clientsRes, usersRes] = await Promise.all([
                clientsApi.list(1, 100),
                usersApi.list(1, 100),
            ]);
            setClients(clientsRes.items.map((c) => ({ label: c.company_name, value: c.id })));
            setUsers(usersRes.items.map((u) => ({ label: u.name, value: u.id })));
        } catch { /* ignore */ }
    };

    useEffect(() => { fetchOptions(); }, []);

    // Fetch data based on view mode
    useEffect(() => {
        if (viewMode === 'month') {
            fetchEvents();
        } else {
            fetchAllPendingTasks();
        }
    }, [viewMode, currentDate]);

    const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
    const handleNextMonth = () => setCurrentDate(currentDate.add(1, 'month'));
    const handleToday = () => setCurrentDate(dayjs());

    const handleAdd = () => {
        form.resetFields();
        form.setFieldsValue({ priority: 'medium', duration_minutes: 60, is_all_day: false });
        setModalOpen(true);
    };

    const handleSubmit = async (values: TaskCreate & { date?: dayjs.Dayjs; time?: dayjs.Dayjs }) => {
        try {
            const { date, time, ...restValues } = values;
            const data: TaskCreate = {
                ...restValues,
                scheduled_date: date?.format('YYYY-MM-DD'),
                scheduled_time: time?.format('HH:mm:ss'),
            };
            await tasksApi.create(data);
            message.success('Tarefa criada');
            setModalOpen(false);
            fetchEvents();
        } catch { message.error('Erro ao criar tarefa'); }
    };

    const handleEventClick = (event: CalendarEvent) => {
        navigate(`/tasks/${event.id}`);
    };

    const handleDeleteTaskFromList = (task: TaskListItem) => {
        Modal.confirm({
            title: 'Confirmar exclusão',
            content: `Deseja excluir a tarefa "${task.title}"?`,
            okText: 'Excluir',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: async () => {
                try {
                    await tasksApi.delete(task.id);
                    message.success('Tarefa excluída');
                    fetchAllPendingTasks();
                } catch { message.error('Erro ao excluir tarefa'); }
            },
        });
    };

    // Generate calendar grid
    const daysInMonth = currentDate.daysInMonth();
    const firstDayOfMonth = currentDate.startOf('month').day();
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
        currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }

    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
            currentWeek.push(null);
        }
        weeks.push(currentWeek);
    }

    const getEventsForDay = (day: number) => {
        const dateStr = currentDate.date(day).format('YYYY-MM-DD');
        return events.filter(e => e.start.startsWith(dateStr));
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Agenda</Title>
                <Space>
                    <Button.Group>
                        <Button icon={<CalendarOutlined />} type={viewMode === 'month' ? 'primary' : 'default'} onClick={() => setViewMode('month')} />
                        <Button icon={<UnorderedListOutlined />} type={viewMode === 'list' ? 'primary' : 'default'} onClick={() => setViewMode('list')} />
                    </Button.Group>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Nova Tarefa</Button>
                </Space>
            </div>

            <Card loading={loading}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Space>
                        <Button icon={<LeftOutlined />} onClick={handlePrevMonth} />
                        <Button onClick={handleToday}>Hoje</Button>
                        <Button icon={<RightOutlined />} onClick={handleNextMonth} />
                    </Space>
                    <Title level={4} style={{ margin: 0 }}>{currentDate.format('MMMM YYYY')}</Title>
                    <div style={{ width: 100 }} />
                </div>

                {viewMode === 'month' ? (
                    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8 }}>
                        {/* Header */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                <div key={d} style={{ padding: 8, textAlign: 'center', fontWeight: 'bold' }}>{d}</div>
                            ))}
                        </div>
                        {/* Grid */}
                        {weeks.map((week, wIdx) => (
                            <div key={wIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', minHeight: 100 }}>
                                {week.map((day, dIdx) => {
                                    const dayEvents = day ? getEventsForDay(day) : [];
                                    const isToday = day && currentDate.date(day).isSame(dayjs(), 'day');
                                    return (
                                        <div key={dIdx} style={{
                                            borderRight: dIdx < 6 ? '1px solid #f0f0f0' : 'none',
                                            borderBottom: wIdx < weeks.length - 1 ? '1px solid #f0f0f0' : 'none',
                                            padding: 4,
                                            background: isToday ? '#e6f7ff' : 'transparent',
                                            minHeight: 80,
                                        }}>
                                            {day && (
                                                <>
                                                    <div style={{ fontWeight: isToday ? 'bold' : 'normal', color: isToday ? '#1890ff' : '#666' }}>{day}</div>
                                                    {dayEvents.slice(0, 3).map(e => (
                                                        <Tag
                                                            key={e.id}
                                                            color={e.color}
                                                            style={{ marginBottom: 2, cursor: 'pointer', fontSize: 11, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                                            onClick={() => handleEventClick(e)}
                                                        >
                                                            {e.title}
                                                        </Tag>
                                                    ))}
                                                    {dayEvents.length > 3 && <Text type="secondary" style={{ fontSize: 10 }}>+{dayEvents.length - 3} mais</Text>}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                ) : (
                    <List
                        dataSource={allTasks}
                        renderItem={(task) => (
                            <List.Item
                                actions={[
                                    <Button type="link" onClick={() => navigate(`/tasks/${task.id}`)}>Ver</Button>,
                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteTaskFromList(task)} title="Excluir" />
                                ]}
                                style={{ cursor: 'pointer' }}
                            >
                                <List.Item.Meta
                                    avatar={<Badge color={task.priority === 'urgent' ? '#ff4d4f' : task.priority === 'high' ? '#faad14' : task.priority === 'medium' ? '#1890ff' : '#52c41a'} />}
                                    title={<>{task.title} <Tag color={task.status === 'blocked' ? 'error' : task.status === 'in_progress' ? 'processing' : 'default'}>{task.status}</Tag></>}
                                    description={<>
                                        {task.scheduled_date ? dayjs(task.scheduled_date).format('DD/MM/YYYY') : 'Sem data'}
                                        {task.scheduled_time && ` ${task.scheduled_time.slice(0, 5)}`}
                                        {task.client?.company_name && <> • {task.client.company_name}</>}
                                    </>}
                                />
                            </List.Item>
                        )}
                        locale={{ emptyText: 'Nenhuma tarefa pendente' }}
                    />
                )}
            </Card>

            <Modal title="Nova Tarefa" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={500}>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="title" label="Título" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="client_id" label="Cliente">
                        <Select allowClear showSearch optionFilterProp="label" options={clients} />
                    </Form.Item>
                    <Form.Item name="assigned_user_id" label="Responsável" rules={[{ required: true, message: 'Selecione o responsável' }]}>
                        <Select showSearch optionFilterProp="label" options={users} placeholder="Selecione o responsável" />
                    </Form.Item>
                    <Space>
                        <Form.Item name="date" label="Data"><DatePicker format="DD/MM/YYYY" /></Form.Item>
                        <Form.Item name="time" label="Hora"><TimePicker format="HH:mm" /></Form.Item>
                        <Form.Item name="duration_minutes" label="Duração (min)"><Input type="number" style={{ width: 80 }} /></Form.Item>
                    </Space>
                    <Form.Item name="is_all_day" label="Dia inteiro" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item name="priority" label="Prioridade">
                        <Select options={Object.entries(priorityLabels).map(([k, v]) => ({ value: k, label: v }))} />
                    </Form.Item>
                    <Form.Item name="description" label="Descrição"><TextArea rows={2} /></Form.Item>
                    <Form.Item><Space><Button type="primary" htmlType="submit">Criar</Button><Button onClick={() => setModalOpen(false)}>Cancelar</Button></Space></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Calendar;
