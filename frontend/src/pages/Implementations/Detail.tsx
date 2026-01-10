/**
 * Implementation detail page with checklist, progress, Gantt chart, attachments, and reports.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Typography, Button, Space, Tag, Progress, List, Checkbox,
    Upload, message, Descriptions, Divider, Spin, Modal, Select, Tabs
} from 'antd';
import {
    ArrowLeftOutlined, UploadOutlined, DeleteOutlined,
    FileOutlined, FilePdfOutlined, BarChartOutlined, FileWordOutlined, DownloadOutlined,
    CloseCircleOutlined, UndoOutlined
} from '@ant-design/icons';
import type { UploadProps, TabsProps } from 'antd';
import type { Implementation, ImplementationItem, ItemStatus, AttachmentType, GanttItem, DocumentTemplateListItem } from '../../types';
import { implementationsApi, templatesApi } from '../../services/api';
import GanttChart from '../../components/GanttChart';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const statusColors: Record<ItemStatus, string> = {
    pending: 'default',
    in_progress: 'processing',
    completed: 'success',
    cancelled: 'warning',
};

const statusLabels: Record<ItemStatus, string> = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluído',
    cancelled: 'Cancelado',
};

const attachmentTypeLabels: Record<AttachmentType, string> = {
    acceptance_term: 'Termo de Aceite',
    initial_report: 'Relatório Inicial',
    final_report: 'Relatório Final',
    other: 'Outro',
};

const ImplementationDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [implementation, setImplementation] = useState<Implementation | null>(null);
    const [ganttData, setGanttData] = useState<GanttItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadType, setUploadType] = useState<AttachmentType>('other');
    const [templates, setTemplates] = useState<DocumentTemplateListItem[]>([]);
    const [generatingDoc, setGeneratingDoc] = useState(false);

    const fetchImplementation = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [data, gantt] = await Promise.all([
                implementationsApi.get(id),
                implementationsApi.getGantt(id)
            ]);
            setImplementation(data);
            setGanttData(gantt.items);
        } catch {
            message.error('Erro ao carregar implantação');
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async (productId: string) => {
        try {
            const data = await templatesApi.getByProduct(productId);
            setTemplates(data);
        } catch {
            console.error('Erro ao carregar templates');
        }
    };

    useEffect(() => { fetchImplementation(); }, [id]);

    useEffect(() => {
        if (implementation?.product?.id) {
            fetchTemplates(implementation.product.id);
        }
    }, [implementation?.product?.id]);

    const handleItemStatusChange = async (item: ImplementationItem, checked: boolean) => {
        if (!id) return;
        // Don't allow checking if item is cancelled
        if (item.status === 'cancelled') return;
        const newStatus: ItemStatus = checked ? 'completed' : 'pending';
        try {
            await implementationsApi.updateItem(id, item.id, { status: newStatus });
            message.success(checked ? 'Item concluído!' : 'Item reaberto');
            fetchImplementation();
        } catch { message.error('Erro ao atualizar item'); }
    };

    const handleCancelItem = async (item: ImplementationItem) => {
        if (!id) return;
        const isCancelling = item.status !== 'cancelled';

        Modal.confirm({
            title: isCancelling ? 'Cancelar item?' : 'Reativar item?',
            content: isCancelling
                ? `O cliente desistiu de "${item.title}"? Este item não contará mais no progresso da implantação.`
                : `Deseja reativar o item "${item.title}"? Ele voltará a contar no progresso.`,
            okText: isCancelling ? 'Cancelar Item' : 'Reativar',
            okType: isCancelling ? 'danger' : 'primary',
            cancelText: 'Voltar',
            onOk: async () => {
                try {
                    const newStatus: ItemStatus = isCancelling ? 'cancelled' : 'pending';
                    await implementationsApi.updateItem(id, item.id, { status: newStatus });
                    message.success(isCancelling ? 'Item cancelado' : 'Item reativado');
                    fetchImplementation();
                } catch { message.error('Erro ao atualizar item'); }
            },
        });
    };

    const handleUpload: UploadProps['customRequest'] = async (options) => {
        if (!id) return;
        const { file, onSuccess, onError } = options;
        try {
            await implementationsApi.uploadAttachment(id, file as File, undefined, uploadType);
            message.success('Arquivo enviado');
            fetchImplementation();
            onSuccess?.({});
        } catch {
            message.error('Erro no upload');
            onError?.(new Error('Upload failed'));
        }
    };

    const handleDeleteAttachment = async (attachmentId: string) => {
        if (!id) return;
        Modal.confirm({
            title: 'Excluir anexo?',
            onOk: async () => {
                try {
                    await implementationsApi.deleteAttachment(id, attachmentId);
                    message.success('Anexo excluído');
                    fetchImplementation();
                } catch { message.error('Erro ao excluir'); }
            },
        });
    };

    const generateReport = (type: 'initial' | 'final') => {
        if (!implementation) return;

        const completed = implementation.items.filter(i => i.status === 'completed').length;
        const pending = implementation.items.filter(i => i.status === 'pending').length;
        const inProgress = implementation.items.filter(i => i.status === 'in_progress').length;

        const content = `
===========================================
RELATÓRIO ${type === 'initial' ? 'INICIAL' : 'FINAL'} DE IMPLANTAÇÃO
===========================================

INFORMAÇÕES GERAIS
------------------
Título: ${implementation.title}
Cliente: ${implementation.client.company_name}
Produto: ${implementation.product?.name || 'Não especificado'}
Responsável: ${implementation.responsible_user?.name || 'Não atribuído'}

Data de Início: ${implementation.start_date ? dayjs(implementation.start_date).format('DD/MM/YYYY') : 'Não definida'}
Previsão de Término: ${implementation.estimated_end_date ? dayjs(implementation.estimated_end_date).format('DD/MM/YYYY') : 'Não definida'}
${type === 'final' ? `Data de Conclusão: ${implementation.actual_end_date ? dayjs(implementation.actual_end_date).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY')}` : ''}

PROGRESSO
---------
Progresso Geral: ${implementation.progress_percentage}%
Total de Itens: ${implementation.items.length}
- Concluídos: ${completed}
- Em andamento: ${inProgress}
- Pendentes: ${pending}

CHECKLIST DE IMPLANTAÇÃO
------------------------
${implementation.items.map((item, i) =>
            `${i + 1}. [${item.status === 'completed' ? 'X' : ' '}] ${item.title} (${statusLabels[item.status]})`
        ).join('\n')}

${type === 'initial' ? `
PRÓXIMOS PASSOS
---------------
- Iniciar execução do checklist
- Agendar reuniões de acompanhamento
- Definir responsáveis para cada etapa
` : `
CONCLUSÃO
---------
Implantação ${implementation.progress_percentage === 100 ? 'concluída com sucesso' : 'encerrada'}.
Total de itens completados: ${completed} de ${implementation.items.length}
`}

ANEXOS
------
${implementation.attachments.length > 0
                ? implementation.attachments.map(a => `- ${a.filename} (${attachmentTypeLabels[a.attachment_type]})`).join('\n')
                : 'Nenhum anexo registrado'}

-------------------------------------------
Relatório gerado em: ${dayjs().format('DD/MM/YYYY HH:mm')}
Sistema Miq2 - Gestão de Implantações
`;

        // Create blob and download
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${type}_${implementation.title.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        message.success(`Relatório ${type === 'initial' ? 'inicial' : 'final'} gerado!`);
    };

    const generateDocumentFromTemplate = async (templateId: string, templateName: string, format: 'docx' | 'pdf' = 'docx') => {
        if (!id || !implementation) return;

        setGeneratingDoc(true);
        try {
            const blob = await templatesApi.generateDocument(templateId, id, format);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const clientName = implementation.client.company_name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
            a.download = `${templateName}_${clientName}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            message.success(`Documento ${format.toUpperCase()} gerado com sucesso!`);
        } catch (error) {
            message.error('Erro ao gerar documento. Verifique se o template está configurado corretamente.');
        } finally {
            setGeneratingDoc(false);
        }
    };

    if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
    if (!implementation) return <Text>Implantação não encontrada</Text>;

    const groupedItems = implementation.items.reduce((acc, item) => {
        const cat = item.category || 'Geral';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {} as Record<string, ImplementationItem[]>);

    const tabItems: TabsProps['items'] = [
        {
            key: 'checklist',
            label: 'Checklist',
            children: (
                <>
                    {Object.entries(groupedItems).map(([category, items]) => (
                        <div key={category} style={{ marginBottom: 16 }}>
                            <Text strong style={{ fontSize: 16, color: '#1890ff' }}>{category}</Text>
                            <List dataSource={items} renderItem={(item) => (
                                <List.Item
                                    actions={[
                                        item.status === 'cancelled' ? (
                                            <Button
                                                key="reactivate"
                                                type="text"
                                                icon={<UndoOutlined />}
                                                onClick={() => handleCancelItem(item)}
                                                title="Reativar item"
                                            />
                                        ) : (
                                            <Button
                                                key="cancel"
                                                type="text"
                                                danger
                                                icon={<CloseCircleOutlined />}
                                                onClick={() => handleCancelItem(item)}
                                                title="Cliente desistiu desta funcionalidade"
                                            />
                                        ),
                                        <Tag color={statusColors[item.status]} key="status">{statusLabels[item.status]}</Tag>
                                    ]}
                                    style={item.status === 'cancelled' ? { opacity: 0.6, backgroundColor: '#fafafa' } : {}}
                                >
                                    <Checkbox
                                        checked={item.status === 'completed'}
                                        disabled={item.status === 'cancelled'}
                                        onChange={(e) => handleItemStatusChange(item, e.target.checked)}
                                    >
                                        <Text
                                            delete={item.status === 'completed' || item.status === 'cancelled'}
                                            type={item.status === 'cancelled' ? 'secondary' : undefined}
                                        >
                                            {item.title}
                                        </Text>
                                    </Checkbox>
                                    {item.estimated_hours > 0 && <Text type="secondary" style={{ marginLeft: 8 }}>{item.estimated_hours}h</Text>}
                                    {item.status === 'cancelled' && item.cancelled_by && (
                                        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                                            (Cancelado por {item.cancelled_by.name})
                                        </Text>
                                    )}
                                </List.Item>
                            )} />
                        </div>
                    ))}
                    {implementation.items.length === 0 && <Text type="secondary">Nenhum item no checklist</Text>}
                </>
            )
        },
        {
            key: 'gantt',
            label: <span><BarChartOutlined /> Cronograma</span>,
            children: (
                <GanttChart
                    items={ganttData}
                    startDate={implementation.start_date}
                    endDate={implementation.estimated_end_date}
                />
            )
        },
        {
            key: 'attachments',
            label: 'Anexos',
            children: (
                <>
                    <Space style={{ marginBottom: 16 }}>
                        <Select value={uploadType} onChange={setUploadType} style={{ width: 180 }}>
                            {Object.entries(attachmentTypeLabels).map(([k, v]) => <Select.Option key={k} value={k}>{v}</Select.Option>)}
                        </Select>
                        <Upload customRequest={handleUpload} showUploadList={false}>
                            <Button icon={<UploadOutlined />}>Enviar Arquivo</Button>
                        </Upload>
                    </Space>
                    <List dataSource={implementation.attachments} renderItem={(att) => (
                        <List.Item actions={[<Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteAttachment(att.id)} key="delete" />]}>
                            <List.Item.Meta
                                avatar={<FileOutlined style={{ fontSize: 24 }} />}
                                title={att.filename}
                                description={<><Tag>{attachmentTypeLabels[att.attachment_type]}</Tag> {att.uploaded_by?.name} - {dayjs(att.created_at).format('DD/MM/YYYY HH:mm')}</>}
                            />
                        </List.Item>
                    )} />
                    {implementation.attachments.length === 0 && <Text type="secondary">Nenhum anexo</Text>}
                </>
            )
        },
        {
            key: 'reports',
            label: <span><FilePdfOutlined /> Relatórios</span>,
            children: (
                <div>
                    <Paragraph>Gere relatórios e documentos da implantação para documentação e acompanhamento.</Paragraph>

                    {/* Seção de Templates de Documentos */}
                    {templates.length > 0 && (
                        <>
                            <Divider>
                                <FileWordOutlined style={{ marginRight: 8, color: '#2b579a' }} />
                                Documentos por Template
                            </Divider>
                            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                                Gere documentos Word ou PDF usando os templates configurados para o produto.
                            </Paragraph>
                            <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 24 }}>
                                {templates.map((template) => (
                                    <Card
                                        key={template.id}
                                        size="small"
                                        title={
                                            <Space>
                                                <FileWordOutlined style={{ color: '#2b579a' }} />
                                                {template.name}
                                                <Tag color={
                                                    template.template_type === 'opening_term' ? 'green' :
                                                        template.template_type === 'closing_term' ? 'red' :
                                                            template.template_type === 'progress_report' ? 'blue' : 'default'
                                                }>
                                                    {template.template_type === 'opening_term' ? 'Termo de Abertura' :
                                                        template.template_type === 'closing_term' ? 'Termo de Encerramento' :
                                                            template.template_type === 'progress_report' ? 'Relatório de Progresso' : 'Outro'}
                                                </Tag>
                                            </Space>
                                        }
                                        extra={
                                            <Space>
                                                <Button
                                                    icon={<DownloadOutlined />}
                                                    onClick={() => generateDocumentFromTemplate(template.id, template.name, 'docx')}
                                                    loading={generatingDoc}
                                                >
                                                    DOCX
                                                </Button>
                                                <Button
                                                    type="primary"
                                                    icon={<FilePdfOutlined />}
                                                    onClick={() => generateDocumentFromTemplate(template.id, template.name, 'pdf')}
                                                    loading={generatingDoc}
                                                >
                                                    PDF
                                                </Button>
                                            </Space>
                                        }
                                    >
                                        {template.description || 'Gera documento preenchido com os dados desta implantação.'}
                                    </Card>
                                ))}
                            </Space>
                        </>
                    )}

                    {/* Mensagem se não houver templates */}
                    {templates.length === 0 && implementation.product && (
                        <Card size="small" style={{ marginBottom: 24, backgroundColor: '#fafafa' }}>
                            <Text type="secondary">
                                <FileWordOutlined style={{ marginRight: 8 }} />
                                Nenhum template de documento configurado para o produto "{implementation.product.name}".
                                Configure templates na tela de Templates para habilitar a geração de documentos.
                            </Text>
                        </Card>
                    )}

                    {/* Relatórios Simples (mantidos) */}
                    <Divider>
                        <FileOutlined style={{ marginRight: 8 }} />
                        Relatórios Rápidos
                    </Divider>
                    <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                        Relatórios simples em texto para exportação rápida.
                    </Paragraph>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        <Card size="small" title="Relatório Inicial (TXT)" extra={<Button onClick={() => generateReport('initial')}>Gerar</Button>}>
                            Documento com informações iniciais da implantação, checklist planejado e próximos passos.
                        </Card>
                        <Card size="small" title="Relatório Final (TXT)" extra={<Button onClick={() => generateReport('final')}>Gerar</Button>}>
                            Documento de conclusão com resumo do progresso, itens completados e anexos.
                        </Card>
                    </Space>
                </div>
            )
        }
    ];

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/implementations')}>Voltar</Button>
            </Space>

            <Card style={{ marginBottom: 16 }}>
                <Title level={3}>{implementation.title}</Title>
                <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
                    <Descriptions.Item label="Cliente">{implementation.client.company_name}</Descriptions.Item>
                    <Descriptions.Item label="Produto">{implementation.product?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Responsável">{implementation.responsible_user?.name || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Status">
                        <Tag color={implementation.status === 'completed' ? 'success' : implementation.status === 'cancelled' ? 'error' : 'processing'}>
                            {implementation.status === 'pending' ? 'Pendente' : implementation.status === 'in_progress' ? 'Em Andamento' : implementation.status === 'completed' ? 'Concluída' : 'Cancelada'}
                        </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Início">{implementation.start_date ? dayjs(implementation.start_date).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                    <Descriptions.Item label="Previsão">{implementation.estimated_end_date ? dayjs(implementation.estimated_end_date).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
                </Descriptions>
                <Divider />
                <Text strong>Progresso Geral:</Text>
                <Progress percent={implementation.progress_percentage} status={implementation.progress_percentage === 100 ? 'success' : 'active'} style={{ maxWidth: 400, marginTop: 8 }} />
            </Card>

            <Card>
                <Tabs items={tabItems} />
            </Card>
        </div>
    );
};

export default ImplementationDetail;
