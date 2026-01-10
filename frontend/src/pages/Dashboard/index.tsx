/**
 * Dashboard page with analytics and stats.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, Row, Col, Statistic, Typography, List, Tag, Progress, Spin } from 'antd';
import {
    UserSwitchOutlined, RocketOutlined, ToolOutlined, CalendarOutlined
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardApi } from '../../services/api';
import type { FullDashboard, RecentActivity } from '../../types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const activityTypeLabels: Record<string, string> = {
    implementation: 'Implantação',
    service_order: 'Ordem de Serviço',
    task: 'Tarefa',
};

const statusColors: Record<string, string> = {
    planning: 'blue',
    in_progress: 'processing',
    completed: 'success',
    open: 'warning',
    scheduled: 'cyan',
    blocked: 'error',
};

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [data, setData] = useState<FullDashboard | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await dashboardApi.getFull();
            setData(result);
        } catch {
            // Fallback to empty data on error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [location.key, fetchData]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
                <Spin size="large" />
            </div>
        );
    }

    const summary = data?.summary;

    return (
        <div>
            <Title level={2}>Dashboard</Title>
            <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
                Bem-vindo, {user?.name}! Aqui está um resumo do sistema.
            </Text>

            {/* Main Stats */}
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card hoverable>
                        <Statistic
                            title="Clientes Ativos"
                            value={summary?.active_clients || 0}
                            suffix={`/ ${summary?.total_clients || 0}`}
                            prefix={<UserSwitchOutlined style={{ color: '#1890ff' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card hoverable>
                        <Statistic
                            title="Implantações em Andamento"
                            value={summary?.implementations_in_progress || 0}
                            suffix={`/ ${summary?.total_implementations || 0}`}
                            prefix={<RocketOutlined style={{ color: '#52c41a' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card hoverable>
                        <Statistic
                            title="Ordens de Serviço Abertas"
                            value={summary?.service_orders_open || 0}
                            suffix={`/ ${summary?.total_service_orders || 0}`}
                            prefix={<ToolOutlined style={{ color: '#faad14' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card hoverable>
                        <Statistic
                            title="Tarefas Pendentes"
                            value={summary?.tasks_pending || 0}
                            suffix={`/ ${summary?.total_tasks || 0}`}
                            prefix={<CalendarOutlined style={{ color: '#eb2f96' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Status Overview */}
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={8}>
                    <Card title="Implantações por Status" size="small">
                        {data?.implementations?.by_status && Object.keys(data.implementations.by_status).length > 0 ? (
                            <>
                                {Object.entries(data.implementations.by_status).map(([status, count]) => (
                                    <div key={status} style={{ marginBottom: 8 }}>
                                        <Text>{status}: </Text>
                                        <Tag color={statusColors[status] || 'default'}>{count}</Tag>
                                    </div>
                                ))}
                                <div style={{ marginTop: 16 }}>
                                    <Text type="secondary">Progresso médio</Text>
                                    <Progress percent={data.implementations.average_progress} status="active" />
                                </div>
                            </>
                        ) : (
                            <Text type="secondary">Nenhuma implantação</Text>
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="Ordens de Serviço por Status" size="small">
                        {data?.service_orders?.by_status && Object.keys(data.service_orders.by_status).length > 0 ? (
                            Object.entries(data.service_orders.by_status).map(([status, count]) => (
                                <div key={status} style={{ marginBottom: 8 }}>
                                    <Text>{status}: </Text>
                                    <Tag color={statusColors[status] || 'default'}>{count}</Tag>
                                </div>
                            ))
                        ) : (
                            <Text type="secondary">Nenhuma OS</Text>
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card title="Tarefas por Status" size="small">
                        {data?.tasks?.by_status && Object.keys(data.tasks.by_status).length > 0 ? (
                            Object.entries(data.tasks.by_status).map(([status, count]) => (
                                <div key={status} style={{ marginBottom: 8 }}>
                                    <Text>{status}: </Text>
                                    <Tag color={statusColors[status] || 'default'}>{count}</Tag>
                                </div>
                            ))
                        ) : (
                            <Text type="secondary">Nenhuma tarefa</Text>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* Recent Activities */}
            <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col span={24}>
                    <Card title="Atividades Recentes">
                        {data?.recent_activities && data.recent_activities.length > 0 ? (
                            <List
                                dataSource={data.recent_activities}
                                renderItem={(item: RecentActivity) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={
                                                item.type === 'implementation' ? <RocketOutlined style={{ fontSize: 20 }} /> :
                                                    item.type === 'service_order' ? <ToolOutlined style={{ fontSize: 20 }} /> :
                                                        <CalendarOutlined style={{ fontSize: 20 }} />
                                            }
                                            title={<>{item.title} <Tag color={statusColors[item.status] || 'default'}>{item.status}</Tag></>}
                                            description={<>
                                                <Tag>{activityTypeLabels[item.type] || item.type}</Tag>
                                                <Text type="secondary">{dayjs(item.created_at).format('DD/MM/YYYY HH:mm')}</Text>
                                            </>}
                                        />
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Text type="secondary">Nenhuma atividade recente.</Text>
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;
