/**
 * Power BI Dashboard Embed Page
 * Allows embedding external Power BI reports/dashboards
 */
import React, { useState, useEffect } from 'react';
import { Card, Typography, Input, Button, Space, Alert, Form, message, Empty, Tabs } from 'antd';
import { DashboardOutlined, LinkOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface SavedDashboard {
    id: string;
    name: string;
    url: string;
}

const STORAGE_KEY = 'miq2_powerbi_dashboards';

const PowerBIPage: React.FC = () => {
    const [dashboards, setDashboards] = useState<SavedDashboard[]>([]);
    const [activeDashboard, setActiveDashboard] = useState<SavedDashboard | null>(null);
    const [zoom, setZoom] = useState(100);
    const [form] = Form.useForm();

    // Load saved dashboards from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            setDashboards(parsed);
            if (parsed.length > 0) {
                setActiveDashboard(parsed[0]);
            }
        }
    }, []);

    // Save dashboards to localStorage
    const saveDashboards = (newDashboards: SavedDashboard[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newDashboards));
        setDashboards(newDashboards);
    };

    // Add new dashboard
    const handleAddDashboard = (values: { name: string; url: string }) => {
        // Validate Power BI URL
        if (!values.url.includes('powerbi.com') && !values.url.includes('app.powerbi.com')) {
            message.error('Por favor, insira uma URL válida do Power BI');
            return;
        }

        const newDashboard: SavedDashboard = {
            id: Date.now().toString(),
            name: values.name,
            url: values.url
        };

        const updated = [...dashboards, newDashboard];
        saveDashboards(updated);
        setActiveDashboard(newDashboard);
        form.resetFields();
        message.success('Dashboard adicionado com sucesso!');
    };

    // Remove dashboard
    const handleRemove = (id: string) => {
        const updated = dashboards.filter(d => d.id !== id);
        saveDashboards(updated);
        if (activeDashboard?.id === id) {
            setActiveDashboard(updated.length > 0 ? updated[0] : null);
        }
        message.success('Dashboard removido');
    };

    return (
        <div style={{ padding: 24 }}>
            <Title level={2}>
                <DashboardOutlined /> Dashboards Power BI
            </Title>
            <Paragraph type="secondary">
                Visualize seus dashboards do Power BI diretamente no Miq2.
            </Paragraph>

            <Tabs defaultActiveKey="view" style={{ marginBottom: 16 }}>
                <TabPane tab="Visualizar" key="view">
                    {dashboards.length === 0 ? (
                        <Card>
                            <Empty
                                description="Nenhum dashboard configurado"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            >
                                <Button type="primary" onClick={() => document.querySelector('[data-node-key="add"]')?.dispatchEvent(new Event('click', { bubbles: true }))}>
                                    Adicionar Dashboard
                                </Button>
                            </Empty>
                        </Card>
                    ) : (
                        <>
                            <Space style={{ marginBottom: 16 }}>
                                {dashboards.map(d => (
                                    <Button
                                        key={d.id}
                                        type={activeDashboard?.id === d.id ? 'primary' : 'default'}
                                        onClick={() => setActiveDashboard(d)}
                                    >
                                        {d.name}
                                    </Button>
                                ))}
                            </Space>

                            {activeDashboard && (
                                <Card
                                    title={activeDashboard.name}
                                    extra={
                                        <Space>
                                            <span style={{ fontSize: 12, color: '#666' }}>Zoom:</span>
                                            <input
                                                type="range"
                                                min="50"
                                                max="200"
                                                value={zoom}
                                                onChange={(e) => setZoom(Number(e.target.value))}
                                                style={{ width: 120, cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: 12, color: '#666', minWidth: 40 }}>{zoom}%</span>
                                            <Button
                                                danger
                                                type="text"
                                                icon={<DeleteOutlined />}
                                                onClick={() => handleRemove(activeDashboard.id)}
                                            >
                                                Remover
                                            </Button>
                                        </Space>
                                    }
                                    bodyStyle={{
                                        padding: 0,
                                        height: `calc((100vh - 300px) * ${zoom / 100})`,
                                        minHeight: 500 * (zoom / 100),
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{
                                        width: `${10000 / zoom}%`,
                                        height: `${10000 / zoom}%`,
                                        transform: `scale(${zoom / 100})`,
                                        transformOrigin: 'top left'
                                    }}>
                                        <iframe
                                            src={activeDashboard.url}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                border: 'none'
                                            }}
                                            allowFullScreen
                                            title={activeDashboard.name}
                                        />
                                    </div>
                                </Card>
                            )}
                        </>
                    )}
                </TabPane>

                <TabPane tab="Adicionar Dashboard" key="add">
                    <Card style={{ maxWidth: 600 }}>
                        <Alert
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                            message="Como obter a URL do Power BI"
                            description={
                                <ol style={{ paddingLeft: 20, marginBottom: 0 }}>
                                    <li>Abra seu dashboard no Power BI</li>
                                    <li>Clique em "Arquivo" → "Inserir relatório" → "Site ou portal"</li>
                                    <li>Copie a URL do iframe gerado</li>
                                    <li>Cole abaixo</li>
                                </ol>
                            }
                        />

                        <Form form={form} layout="vertical" onFinish={handleAddDashboard}>
                            <Form.Item
                                name="name"
                                label="Nome do Dashboard"
                                rules={[{ required: true, message: 'Digite um nome' }]}
                            >
                                <Input placeholder="Ex: Dashboard de Vendas" />
                            </Form.Item>

                            <Form.Item
                                name="url"
                                label="URL do Power BI"
                                rules={[{ required: true, message: 'Cole a URL do Power BI' }]}
                            >
                                <Input.TextArea
                                    rows={3}
                                    placeholder="https://app.powerbi.com/reportEmbed?..."
                                />
                            </Form.Item>

                            <Form.Item>
                                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                                    Salvar Dashboard
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>

                    {/* Lista de dashboards salvos */}
                    {dashboards.length > 0 && (
                        <Card title="Dashboards Salvos" style={{ marginTop: 16, maxWidth: 600 }}>
                            <Space direction="vertical" style={{ width: '100%' }}>
                                {dashboards.map(d => (
                                    <div
                                        key={d.id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '8px 12px',
                                            background: '#fafafa',
                                            borderRadius: 4
                                        }}
                                    >
                                        <div>
                                            <Text strong>{d.name}</Text>
                                            <br />
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                <LinkOutlined /> {d.url.substring(0, 50)}...
                                            </Text>
                                        </div>
                                        <Button
                                            danger
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            onClick={() => handleRemove(d.id)}
                                        />
                                    </div>
                                ))}
                            </Space>
                        </Card>
                    )}
                </TabPane>
            </Tabs>
        </div>
    );
};

export default PowerBIPage;
