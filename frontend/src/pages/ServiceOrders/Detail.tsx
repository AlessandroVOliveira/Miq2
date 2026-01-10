/**
 * Service Order detail page.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Typography, Button, Space, Tag, Descriptions, Divider,
    Spin, Modal, Input, List, Timeline, message
} from 'antd';
import {
    ArrowLeftOutlined, PlayCircleOutlined, CheckCircleOutlined,
    PlusOutlined
} from '@ant-design/icons';
import type { ServiceOrder, ServiceOrderStatus, ServiceOrderPriority, EquipmentEntryCreate } from '../../types';
import { serviceOrdersApi } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const statusColors: Record<ServiceOrderStatus, string> = {
    open: 'blue',
    in_progress: 'processing',
    waiting_parts: 'orange',
    completed: 'success',
    cancelled: 'default',
};

const statusLabels: Record<ServiceOrderStatus, string> = {
    open: 'Aberta',
    in_progress: 'Em Andamento',
    waiting_parts: 'Aguardando Peças',
    completed: 'Concluída',
    cancelled: 'Cancelada',
};

const priorityColors: Record<ServiceOrderPriority, string> = {
    low: 'green',
    medium: 'blue',
    high: 'orange',
    urgent: 'red',
};

const priorityLabels: Record<ServiceOrderPriority, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
};

const ServiceOrderDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<ServiceOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [equipmentModal, setEquipmentModal] = useState(false);
    const [completeModal, setCompleteModal] = useState(false);
    const [newEquipment, setNewEquipment] = useState<EquipmentEntryCreate>({ description: '' });
    const [resolutionNotes, setResolutionNotes] = useState('');

    const fetchOrder = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await serviceOrdersApi.get(id);
            setOrder(data);
        } catch {
            message.error('Erro ao carregar OS');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrder(); }, [id]);

    const handleStart = async () => {
        if (!id) return;
        try {
            await serviceOrdersApi.start(id);
            message.success('OS iniciada!');
            fetchOrder();
        } catch { message.error('Erro ao iniciar'); }
    };

    const handleComplete = async () => {
        if (!id) return;
        try {
            await serviceOrdersApi.complete(id, resolutionNotes);
            message.success('OS concluída!');
            setCompleteModal(false);
            fetchOrder();
        } catch { message.error('Erro ao concluir'); }
    };

    const handleAddEquipment = async () => {
        if (!id || !newEquipment.description) return;
        try {
            await serviceOrdersApi.addEquipment(id, newEquipment);
            message.success('Equipamento registrado');
            setEquipmentModal(false);
            setNewEquipment({ description: '' });
            fetchOrder();
        } catch { message.error('Erro ao registrar'); }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
    if (!order) return <Text>OS não encontrada</Text>;

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/service-orders')}>Voltar</Button>
                {order.status === 'open' && (
                    <Button type="primary" icon={<PlayCircleOutlined />} onClick={handleStart}>Iniciar OS</Button>
                )}
                {(order.status === 'in_progress' || order.status === 'waiting_parts') && (
                    <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => setCompleteModal(true)}>Concluir OS</Button>
                )}
            </Space>

            <Card style={{ marginBottom: 16 }}>
                <Title level={3}>{order.title}</Title>
                <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
                    <Descriptions.Item label="Cliente">{order.client.company_name}</Descriptions.Item>
                    <Descriptions.Item label="Responsável">{order.assigned_user?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Equipe">{order.team?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Status">
                        <Tag color={statusColors[order.status]}>{statusLabels[order.status]}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Prioridade">
                        <Tag color={priorityColors[order.priority]}>{priorityLabels[order.priority]}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Template">{order.template?.name || '-'}</Descriptions.Item>
                </Descriptions>
                <Divider />
                <Text strong>Descrição:</Text>
                <Paragraph>{order.description || 'Sem descrição'}</Paragraph>
            </Card>

            <Card title="Linha do Tempo" style={{ marginBottom: 16 }}>
                <Timeline items={[
                    { color: 'blue', children: <><Text strong>Aberta</Text> - {dayjs(order.opened_at).format('DD/MM/YYYY HH:mm')}</> },
                    ...(order.started_at ? [{ color: 'green', children: <><Text strong>Iniciada</Text> - {dayjs(order.started_at).format('DD/MM/YYYY HH:mm')}</> }] : []),
                    ...(order.completed_at ? [{ color: 'green', children: <><Text strong>Concluída</Text> - {dayjs(order.completed_at).format('DD/MM/YYYY HH:mm')}</> }] : []),
                ]} />
                {order.resolution_notes && (
                    <>
                        <Divider />
                        <Text strong>Resolução:</Text>
                        <Paragraph>{order.resolution_notes}</Paragraph>
                    </>
                )}
            </Card>

            <Card title="Equipamentos" extra={<Button icon={<PlusOutlined />} onClick={() => setEquipmentModal(true)}>Adicionar</Button>}>
                {order.equipment_serial && (
                    <Paragraph><Text strong>Nº Série:</Text> {order.equipment_serial}</Paragraph>
                )}
                {order.equipment_description && (
                    <Paragraph><Text strong>Descrição:</Text> {order.equipment_description}</Paragraph>
                )}
                <List
                    dataSource={order.equipment_entries}
                    renderItem={(e) => (
                        <List.Item>
                            <List.Item.Meta
                                title={e.serial_number || 'Sem nº série'}
                                description={<>
                                    {e.description}
                                    <br />
                                    <Text type="secondary">Entrada: {dayjs(e.entry_date).format('DD/MM/YYYY HH:mm')}</Text>
                                    {e.exit_date && <Text type="secondary"> | Saída: {dayjs(e.exit_date).format('DD/MM/YYYY HH:mm')}</Text>}
                                </>}
                            />
                        </List.Item>
                    )}
                    locale={{ emptyText: 'Nenhum equipamento registrado' }}
                />
            </Card>

            <Modal title="Registrar Equipamento" open={equipmentModal} onCancel={() => setEquipmentModal(false)} onOk={handleAddEquipment}>
                <Input placeholder="Nº Série" value={newEquipment.serial_number || ''} onChange={(e) => setNewEquipment({ ...newEquipment, serial_number: e.target.value })} style={{ marginBottom: 8 }} />
                <TextArea placeholder="Descrição *" rows={2} value={newEquipment.description} onChange={(e) => setNewEquipment({ ...newEquipment, description: e.target.value })} style={{ marginBottom: 8 }} />
                <TextArea placeholder="Condição na entrada" rows={2} value={newEquipment.condition_on_entry || ''} onChange={(e) => setNewEquipment({ ...newEquipment, condition_on_entry: e.target.value })} />
            </Modal>

            <Modal title="Concluir OS" open={completeModal} onCancel={() => setCompleteModal(false)} onOk={handleComplete}>
                <TextArea placeholder="Notas de resolução" rows={4} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
            </Modal>
        </div>
    );
};

export default ServiceOrderDetail;
