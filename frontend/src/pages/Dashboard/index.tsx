/**
 * Dashboard page with Deep Blue design.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Row, Col, Typography, Tag, Progress, Spin, Button, Table, Avatar, Empty, List } from 'antd';
import {
    TeamOutlined,
    AlertOutlined,
    MessageOutlined,
    FileAddOutlined,
    RiseOutlined,
    MoreOutlined,
    RocketOutlined,
    PlusOutlined,
    CalendarOutlined,
    CheckCircleFilled,
    ClockCircleFilled,
    SyncOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardApi, implementationsApi, tasksApi, repositoryApi } from '../../services/api';
import type { FullDashboard, ImplementationListItem, TaskListItem, RepositoryFileListItem } from '../../types';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import relativeTime from 'dayjs/plugin/relativeTime';
import styles from './styles.module.css';

// Set dayjs locale and plugins
dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();

    // State for various data sources
    const [dashboardData, setDashboardData] = useState<FullDashboard | null>(null);
    const [implementations, setImplementations] = useState<ImplementationListItem[]>([]);
    const [tasks, setTasks] = useState<TaskListItem[]>([]);
    const [files, setFiles] = useState<RepositoryFileListItem[]>([]);

    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Parallel data fetching for performance
            const [dashboardRes, implRes, tasksRes, filesRes] = await Promise.allSettled([
                dashboardApi.getFull(),
                implementationsApi.list(1, 5),  // Get all implementations, not just in_progress

                tasksApi.list(1, 5, { scheduled_date: dayjs().format('YYYY-MM-DD'), status: 'scheduled' }),
                repositoryApi.listFiles(1, 5)
            ]);

            // Handle Dashboard Data
            if (dashboardRes.status === 'fulfilled') {
                setDashboardData(dashboardRes.value);
            }

            // Handle Implementations
            if (implRes.status === 'fulfilled') {
                setImplementations(implRes.value.items);
            }

            // Handle Tasks
            if (tasksRes.status === 'fulfilled') {
                setTasks(tasksRes.value.items);
            }

            // Handle Files
            if (filesRes.status === 'fulfilled') {
                setFiles(filesRes.value.items);
            }

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [location.key, fetchData]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <Spin size="large" tip="Carregando..." />
            </div>
        );
    }

    const summary = dashboardData?.summary;

    const StatCard = ({ title, value, icon, color, trend, bg }: any) => (
        <Card bordered={false} className={styles.statCard} bodyStyle={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div className={styles.iconBox} style={{ background: bg, color: color }}>
                    {icon}
                </div>
                {trend && (
                    <div className={styles.trendBadge} style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #d1fae5' }}>
                        <RiseOutlined /> {trend}
                    </div>
                )}
            </div>
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {title}
            </Text>
            <Title level={3} style={{ marginTop: 4, marginBottom: 0, fontWeight: 700, fontSize: 30 }}>
                {value}
            </Title>
        </Card>
    );

    const columns = [
        {
            title: 'CLIENTE',
            dataIndex: ['client', 'company_name'],
            key: 'client',
            render: (text: string) => <Text strong>{text || 'Cliente Desconhecido'}</Text>,
        },
        {
            title: 'PRODUTO',
            dataIndex: ['product', 'name'],
            key: 'product',
            render: (text: string) => <Text type="secondary" style={{ fontFamily: 'monospace' }}>{text || 'N/A'}</Text>,
        },
        {
            title: 'STATUS',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                let color = 'blue';
                let dotColor = '#3b82f6';
                let label = status;

                // Status mapping/translation
                if (status === 'completed') { color = 'green'; dotColor = '#10b981'; label = 'Concluído'; }
                else if (status === 'in_progress') { color = 'blue'; dotColor = '#1064fe'; label = 'Em Andamento'; }
                else if (status === 'pending') { color = 'gold'; dotColor = '#f59e0b'; label = 'Pendente'; }
                else if (status === 'cancelled') { color = 'red'; dotColor = '#ef4444'; label = 'Cancelado'; }

                return (
                    <Tag color={color} style={{ borderRadius: 999, padding: '2px 10px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor }}></span>
                        {label}
                    </Tag>
                );
            },
        },
        {
            title: 'PROGRESSO',
            dataIndex: 'progress_percentage',
            key: 'progress',
            width: '25%',
            render: (percent: number) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong style={{ fontSize: 12 }}>{percent}%</Text>
                    </div>
                    <Progress percent={percent} showInfo={false} strokeColor={percent === 100 ? '#10b981' : (percent < 50 ? '#f59e0b' : '#1064fe')} size="small" />
                </div>
            ),
        },
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            {/* Header Section */}
            <div style={{ marginBottom: 32 }}>
                <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Visão Geral</Title>
                <Text type="secondary" strong>Bem-vindo de volta, {user?.name}</Text>
            </div>

            {/* KPI Stats Row */}
            <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Clientes Ativos"
                        value={summary?.active_clients || 0}
                        icon={<TeamOutlined />}
                        color="#1064fe"
                        bg="#eff6ff"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Chamados Abertos"
                        value={summary?.service_orders_open || 0}
                        icon={<AlertOutlined />}
                        color="#dc2626"
                        bg="#fef2f2"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Tarefas Pendentes"
                        value={summary?.tasks_pending || 0}
                        icon={<MessageOutlined />}
                        color="#d97706"
                        bg="#fffbeb"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        title="Impl. Totais"
                        value={summary?.total_implementations || 0}
                        icon={<FileAddOutlined />}
                        color="#4f46e5"
                        bg="#eef2ff"
                    />
                </Col>
            </Row>

            {/* Middle Section: Deployments & Agenda */}
            <Row gutter={[32, 32]} style={{ marginTop: 32 }}>
                {/* Deployments Table */}
                <Col xs={24} xl={16}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <RocketOutlined style={{ color: '#1064fe' }} />
                            Implantações Recentes
                        </Title>
                    </div>
                    <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ overflow: 'hidden', boxShadow: '0 4px 20px -2px rgba(16, 100, 254, 0.08)' }}>
                        <Table
                            columns={columns}
                            dataSource={implementations}
                            pagination={false}
                            rowKey="id"
                            locale={{ emptyText: <Empty description="Nenhuma implementação encontrada" /> }}
                        />
                    </Card>
                </Col>

                {/* Agenda Widget */}
                <Col xs={24} xl={8}>
                    <div style={{ marginBottom: 16 }}>
                        <Title level={4} style={{ margin: 0 }}>Agenda de Hoje</Title>
                    </div>
                    <Card bordered={false} bodyStyle={{ padding: 24 }} style={{ height: 'calc(100% - 48px)', boxShadow: '0 4px 20px -2px rgba(16, 100, 254, 0.08)' }}>

                        {/* Date Header */}
                        <div style={{ display: 'flex', gap: 16, marginBottom: 32, background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #f1f5f9' }}>
                            <div style={{ background: 'white', padding: '8px 12px', borderRadius: 8, textAlign: 'center', border: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: '#1064fe', lineHeight: 1 }}>{dayjs().format('DD')}</div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{dayjs().format('MMM')}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{dayjs().format('dddd')}</div>
                                <div style={{ fontSize: 12, color: '#64748b' }}>{tasks.length} eventos agendados</div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {tasks.length === 0 && <Empty description="Sem tarefas para hoje" image={Empty.PRESENTED_IMAGE_SIMPLE} />}

                            {tasks.map((task, index) => (
                                <div key={task.id} className={styles.timelineItem} style={{ display: 'flex', position: 'relative' }}>
                                    <div style={{ width: 50, textAlign: 'right', paddingRight: 16, paddingTop: 4 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700 }}>{task.scheduled_time?.substring(0, 5) || '08:00'}</div>
                                    </div>
                                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#1064fe', boxShadow: '0 0 0 4px white', zIndex: 2 }}></div>
                                        {index < tasks.length - 1 && <div className={styles.timelineConnector}></div>}
                                    </div>
                                    <div style={{ marginLeft: 16, flex: 1, background: '#eff6ff', padding: 12, borderRadius: 12, border: '1px solid #dbeafe' }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1064fe' }}>{task.title}</div>
                                        <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{task.client?.company_name || 'Interno'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </Card>
                </Col>
            </Row>

            {/* Bottom Section: Activities & Files */}
            <Row gutter={[32, 32]} style={{ marginTop: 32, marginBottom: 32 }}>
                <Col xs={24} md={12}>
                    <Card
                        title={<span style={{ display: 'flex', gap: 8 }}><SyncOutlined style={{ color: '#f59e0b' }} /> Atividades Recentes</span>}
                        extra={<Button type="text" size="small" style={{ fontWeight: 700, color: '#94a3b8' }}>VER TUDO</Button>}
                        bordered={false}
                        className={styles.statCard}
                    >
                        <List
                            itemLayout="horizontal"
                            dataSource={dashboardData?.recent_activities || []}
                            renderItem={(item) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={<Avatar style={{ backgroundColor: '#fde3cf', color: '#f56a00' }}>{item.type[0].toUpperCase()}</Avatar>}
                                        title={<Text strong>{item.title}</Text>}
                                        description={<Text type="secondary" style={{ fontSize: 12 }}>{dayjs(item.created_at).fromNow()} • {item.status}</Text>}
                                    />
                                </List.Item>
                            )}
                            locale={{ emptyText: <Empty description="Nenhuma atividade recente" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card
                        title={<span style={{ display: 'flex', gap: 8 }}><FileAddOutlined style={{ color: '#4f46e5' }} /> Arquivos Recentes</span>}
                        extra={<Button type="text" size="small" style={{ fontWeight: 700, color: '#94a3b8' }}>VER TUDO</Button>}
                        bordered={false}
                        className={styles.statCard}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {files.length === 0 && <Empty description="Nenhum arquivo recente" image={Empty.PRESENTED_IMAGE_SIMPLE} />}

                            {files.map(file => (
                                <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 12, border: '1px solid #f1f5f9', borderRadius: 12 }}>
                                    <div style={{ width: 40, height: 40, background: '#eff6ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                        <FileTextOutlined />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{file.filename}</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                                            {(file.file_size / 1024).toFixed(1)} KB • {dayjs(file.created_at).fromNow()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
