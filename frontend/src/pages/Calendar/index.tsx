/**
 * Calendar page for tasks/agenda with Deep Blue design.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Layout, Typography, Button, Space, Modal, Form, Input, Select,
    DatePicker, TimePicker, Switch, message, Tag, Badge, Calendar as AntCalendar, Avatar, Tooltip
} from 'antd';
import {
    PlusOutlined, LeftOutlined, RightOutlined, ClockCircleOutlined,
    MoreOutlined, UserOutlined, CalendarOutlined, UnorderedListOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { CalendarEvent, TaskCreate, TaskPriority, TaskListItem } from '../../types';
import { tasksApi, clientsApi, usersApi } from '../../services/api';
import dayjs from 'dayjs';
import styles from './calendar.module.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const priorityLabels: Record<TaskPriority, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
};

const priorityColors: Record<TaskPriority, { bg: string, color: string }> = {
    low: { bg: '#dcfce7', color: '#16a34a' },
    medium: { bg: '#dbeafe', color: '#3b82f6' },
    high: { bg: '#fef9c3', color: '#ca8a04' },
    urgent: { bg: '#fee2e2', color: '#ef4444' },
};

const CalendarPage: React.FC = () => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(dayjs());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [upcomingTasks, setUpcomingTasks] = useState<TaskListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
    const [form] = Form.useForm();

    const [clients, setClients] = useState<{ label: string; value: string }[]>([]);
    const [users, setUsers] = useState<{ label: string; value: string }[]>([]);

    const fetchEvents = useCallback(async () => {
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
    }, [currentDate]);

    const fetchUpcomingTasks = useCallback(async () => {
        try {
            // Fetch scheduled or in_progress tasks, sorted by date
            const response = await tasksApi.list(1, 10, { status: 'scheduled' }); // Mocking limit
            setUpcomingTasks(response.items.slice(0, 5));
        } catch {
            // ignore
        }
    }, []);

    const fetchOptions = async () => {
        try {
            const [clientsRes, usersRes] = await Promise.all([
                clientsApi.list(1, 100),
                usersApi.list(1, 100),
            ]);
            setClients(clientsRes.items.map((c: any) => ({ label: c.company_name, value: c.id })));
            setUsers(usersRes.items.map((u: any) => ({ label: u.name, value: u.id })));
        } catch { /* ignore */ }
    };

    useEffect(() => {
        fetchOptions();
        fetchUpcomingTasks();
    }, [fetchUpcomingTasks]);

    useEffect(() => {
        if (viewMode === 'month') {
            fetchEvents();
        } else if (viewMode === 'list') {
            // Fetch tasks for list view
            const fetchListTasks = async () => {
                setLoading(true);
                try {
                    const response = await tasksApi.list(1, 50);
                    setUpcomingTasks(response.items);
                } catch {
                    message.error('Erro ao carregar tarefas');
                } finally {
                    setLoading(false);
                }
            };
            fetchListTasks();
        }
    }, [viewMode, currentDate, fetchEvents]);


    const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
    const handleNextMonth = () => setCurrentDate(currentDate.add(1, 'month'));
    const handleToday = () => setCurrentDate(dayjs());

    const handleAdd = () => {
        form.resetFields();
        form.setFieldsValue({ priority: 'medium', duration_minutes: 60, is_all_day: false, date: dayjs() });
        setModalOpen(true);
    };

    const handleSubmit = async (values: any) => {
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
            fetchUpcomingTasks();
        } catch { message.error('Erro ao criar tarefa'); }
    };

    const handleEventClick = (event: CalendarEvent) => {
        navigate(`/tasks/${event.id}`);
    };

    // Calendar Grid Generation
    const daysInMonth = currentDate.daysInMonth();
    const firstDayOfMonth = currentDate.startOf('month').day();
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    // Pad empty days
    for (let i = 0; i < firstDayOfMonth; i++) currentWeek.push(null);

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }
    // Pad remaining
    if (currentWeek.length > 0) {
        while (currentWeek.length < 7) currentWeek.push(null);
        weeks.push(currentWeek);
    }

    const getEventsForDay = (day: number) => {
        const dateStr = currentDate.date(day).format('YYYY-MM-DD');
        return events.filter(e => e.start.startsWith(dateStr));
    };

    return (
        <div className={styles.layout}>
            {/* Main Content Area */}
            <div className={styles.mainContent}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.dateNav}>
                        <div className={styles.navButtons}>
                            <button className={styles.navButton} onClick={handlePrevMonth}><LeftOutlined /></button>
                            <button className={styles.navButton} onClick={handleNextMonth}><RightOutlined /></button>
                        </div>
                        <Title level={4} style={{ margin: 0 }}>{currentDate.format('MMMM YYYY')}</Title>
                        <Button type="text" onClick={handleToday}>Hoje</Button>
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                        <div className={styles.viewSwitcher}>
                            <button
                                className={`${styles.viewButton} ${viewMode === 'month' ? styles.viewButtonActive : ''}`}
                                onClick={() => setViewMode('month')}
                            >
                                Mês
                            </button>
                            <button
                                className={`${styles.viewButton} ${viewMode === 'list' ? styles.viewButtonActive : ''}`}
                                onClick={() => setViewMode('list')} // Not fully implemented in this refactor, keeping logic
                            >
                                Lista
                            </button>
                        </div>
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="large" style={{ background: '#1064fe' }}>Novo Evento</Button>
                    </div>
                </div>

                {/* Calendar Grid or List View */}
                {viewMode === 'month' ? (
                    <div className={styles.calendarContainer}>
                        <div className={styles.daysHeader}>
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                <div key={d} className={styles.dayHeader}>{d}</div>
                            ))}
                        </div>
                        <div className={styles.monthGrid}>
                            {weeks.map((week, wIdx) => (
                                <React.Fragment key={wIdx}>
                                    {week.map((day, dIdx) => {
                                        const dayEvents = day ? getEventsForDay(day) : [];
                                        const isToday = day && currentDate.date(day).isSame(dayjs(), 'day');

                                        if (!day) return <div key={`${wIdx}-${dIdx}`} className={`${styles.dayCell} ${styles.dayCellOtherMonth}`}></div>;

                                        return (
                                            <div key={`${wIdx}-${dIdx}`} className={styles.dayCell} onClick={() => {
                                                if (day) {
                                                    form.setFieldsValue({ date: currentDate.date(day) });
                                                    setModalOpen(true);
                                                }
                                            }}>
                                                <div className={`${styles.dayNumber} ${isToday ? styles.dayNumberToday : ''}`}>
                                                    {day}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    {dayEvents.map(e => (
                                                        <div
                                                            key={e.id}
                                                            className={styles.eventTag}
                                                            style={{ backgroundColor: e.color || '#3b82f6' }}
                                                            onClick={(ev) => {
                                                                ev.stopPropagation();
                                                                handleEventClick(e);
                                                            }}
                                                        >
                                                            {e.title}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* List View */
                    <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: 40 }}>Carregando...</div>
                        ) : upcomingTasks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Nenhuma tarefa encontrada</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {upcomingTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => navigate(`/tasks/${task.id}`)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 16,
                                            padding: 16,
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 12,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: 'white'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1064fe'}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                                    >
                                        <div style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 8,
                                            background: priorityColors[task.priority as TaskPriority]?.bg || '#f1f5f9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: priorityColors[task.priority as TaskPriority]?.color || '#64748b',
                                            fontWeight: 700
                                        }}>
                                            <CalendarOutlined style={{ fontSize: 20 }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>{task.title}</div>
                                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                                                {task.scheduled_date ? dayjs(task.scheduled_date).format('DD/MM/YYYY') : 'Sem data'}
                                                {task.scheduled_time && ` às ${task.scheduled_time.slice(0, 5)}`}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <Tag color={
                                                task.status === 'completed' ? 'green' :
                                                    task.status === 'in_progress' ? 'blue' :
                                                        task.status === 'scheduled' ? 'gold' : 'default'
                                            }>
                                                {task.status === 'completed' ? 'Concluída' :
                                                    task.status === 'in_progress' ? 'Em Andamento' :
                                                        task.status === 'scheduled' ? 'Agendada' : task.status}
                                            </Tag>
                                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                                                {task.assigned_user?.name || 'Não atribuído'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>


            {/* Sidebar */}
            <div className={styles.sidebar}>
                <div className={styles.sidebarSection}>
                    <div className={styles.sidebarTitle}>
                        Próximas Tarefas
                        <Tag>Hoje</Tag>
                    </div>
                    {upcomingTasks.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>Nenhuma tarefa próxima</div>
                    ) : (
                        upcomingTasks.map(task => (
                            <div key={task.id} className={styles.taskCard} onClick={() => navigate(`/tasks/${task.id}`)}>
                                <div className={styles.taskHeader}>
                                    <span
                                        className={styles.priorityBadge}
                                        style={{
                                            background: priorityColors[task.priority as TaskPriority]?.bg || '#f1f5f9',
                                            color: priorityColors[task.priority as TaskPriority]?.color || '#64748b'
                                        }}
                                    >
                                        {priorityLabels[task.priority as TaskPriority] || task.priority}
                                    </span>
                                    <MoreOutlined style={{ color: '#cbd5e1' }} />
                                </div>
                                <div className={styles.taskTitle}>{task.title}</div>
                                <div className={styles.taskMeta}>
                                    <ClockCircleOutlined />
                                    <span>
                                        {task.scheduled_time
                                            ? task.scheduled_time.slice(0, 5)
                                            : 'Dia Todo'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b' }}>
                                    <Avatar size={20} icon={<UserOutlined />} />
                                    <span>{task.assigned_user?.name || 'Não atribuído'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className={styles.sidebarSection}>
                    <div className={styles.sidebarTitle}>Visão Geral</div>
                    <div className={styles.miniCalendar}>
                        <AntCalendar fullscreen={false} value={currentDate} onChange={setCurrentDate} />
                    </div>
                </div>
            </div>

            {/* New Task Modal */}
            <Modal title="Nova Tarefa" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={500}>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="title" label="Título" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="client_id" label="Cliente">
                        <Select allowClear showSearch optionFilterProp="label" options={clients} />
                    </Form.Item>
                    <Form.Item name="assigned_user_id" label="Responsável" rules={[{ required: true }]}>
                        <Select showSearch optionFilterProp="label" options={users} />
                    </Form.Item>
                    <Space>
                        <Form.Item name="date" label="Data"><DatePicker format="DD/MM/YYYY" /></Form.Item>
                        <Form.Item name="time" label="Hora"><TimePicker format="HH:mm" /></Form.Item>
                        <Form.Item name="duration_minutes" label="Duração (min)"><Input type="number" style={{ width: 100 }} /></Form.Item>
                    </Space>
                    <Form.Item name="is_all_day" label="Dia Todo" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item name="priority" label="Prioridade">
                        <Select options={Object.entries(priorityLabels).map(([k, v]) => ({ value: k, label: v }))} />
                    </Form.Item>
                    <Form.Item name="description" label="Descrição"><TextArea rows={3} /></Form.Item>
                    <Form.Item>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
                            <Button type="primary" htmlType="submit" style={{ background: '#1064fe' }}>Criar Tarefa</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default CalendarPage;
