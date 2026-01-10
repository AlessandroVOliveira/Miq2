/**
 * Templates page for document template management.
 */
import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Button, Space, Table, Input, Tag, Empty,
    Modal, Form, Select, Upload, message, Popconfirm, Tooltip, List
} from 'antd';
import {
    PlusOutlined, UploadOutlined, DownloadOutlined, EditOutlined,
    DeleteOutlined, FileWordOutlined, InfoCircleOutlined, ReloadOutlined
} from '@ant-design/icons';
import type { DocumentTemplateListItem, TemplateTypeOption, PlaceholderInfo, Product } from '../../types';
import { templatesApi, productsApi } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
    'opening_term': 'Termo de Abertura',
    'closing_term': 'Termo de Encerramento',
    'progress_report': 'Relatório de Progresso',
    'other': 'Outro'
};

const TEMPLATE_TYPE_COLORS: Record<string, string> = {
    'opening_term': 'green',
    'closing_term': 'red',
    'progress_report': 'blue',
    'other': 'default'
};

const TemplatesPage: React.FC = () => {
    const [templates, setTemplates] = useState<DocumentTemplateListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [placeholdersModalVisible, setPlaceholdersModalVisible] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<DocumentTemplateListItem | null>(null);
    const [searchText, setSearchText] = useState('');
    const [filterType, setFilterType] = useState<string | undefined>();
    const [templateTypes, setTemplateTypes] = useState<TemplateTypeOption[]>([]);
    const [placeholders, setPlaceholders] = useState<PlaceholderInfo[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchTemplates();
        fetchTemplateTypes();
        fetchPlaceholders();
        fetchProducts();
    }, [searchText, filterType]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const data = await templatesApi.list({
                search: searchText || undefined,
                template_type: filterType
            });
            setTemplates(data);
        } catch (error) {
            message.error('Erro ao carregar templates');
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplateTypes = async () => {
        try {
            const types = await templatesApi.getTypes();
            setTemplateTypes(types);
        } catch (error) {
            console.error('Error fetching template types:', error);
        }
    };

    const fetchPlaceholders = async () => {
        try {
            const response = await templatesApi.getPlaceholders();
            setPlaceholders(response.placeholders);
        } catch (error) {
            console.error('Error fetching placeholders:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await productsApi.list(1, 100);
            setProducts(response.items);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const handleCreate = async (values: any) => {
        if (!uploadFile) {
            message.error('Selecione um arquivo .docx');
            return;
        }
        try {
            await templatesApi.create(uploadFile, {
                name: values.name,
                description: values.description,
                template_type: values.template_type,
                product_ids: values.product_ids
            });
            message.success('Template criado com sucesso!');
            setModalVisible(false);
            form.resetFields();
            setUploadFile(null);
            fetchTemplates();
        } catch (error) {
            message.error('Erro ao criar template');
        }
    };

    const handleUpdate = async (values: any) => {
        if (!editingTemplate) return;
        try {
            await templatesApi.update(editingTemplate.id, {
                name: values.name,
                description: values.description,
                template_type: values.template_type,
                product_ids: values.product_ids
            });
            message.success('Template atualizado com sucesso!');
            setModalVisible(false);
            setEditingTemplate(null);
            form.resetFields();
            fetchTemplates();
        } catch (error) {
            message.error('Erro ao atualizar template');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await templatesApi.delete(id);
            message.success('Template excluído com sucesso!');
            fetchTemplates();
        } catch (error) {
            message.error('Erro ao excluir template');
        }
    };

    const handleDownload = async (template: DocumentTemplateListItem) => {
        try {
            const blob = await templatesApi.download(template.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = template.original_filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            message.error('Erro ao baixar template');
        }
    };

    const openEditModal = (template: DocumentTemplateListItem) => {
        setEditingTemplate(template);
        form.setFieldsValue({
            name: template.name,
            description: template.description,
            template_type: template.template_type
        });
        setModalVisible(true);
    };

    const openCreateModal = () => {
        setEditingTemplate(null);
        form.resetFields();
        setUploadFile(null);
        setModalVisible(true);
    };

    const columns = [
        {
            title: 'Nome',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: DocumentTemplateListItem) => (
                <Space>
                    <FileWordOutlined style={{ color: '#2b579a', fontSize: 18 }} />
                    <div>
                        <Text strong>{name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {record.original_filename}
                        </Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'Tipo',
            dataIndex: 'template_type',
            key: 'template_type',
            width: 160,
            render: (type: string) => (
                <Tag color={TEMPLATE_TYPE_COLORS[type] || 'default'}>
                    {TEMPLATE_TYPE_LABELS[type] || type}
                </Tag>
            )
        },
        {
            title: 'Produtos',
            dataIndex: 'product_count',
            key: 'product_count',
            width: 100,
            align: 'center' as const,
            render: (count: number) => (
                <Tag>{count} produto{count !== 1 ? 's' : ''}</Tag>
            )
        },
        {
            title: 'Placeholders',
            dataIndex: 'placeholders',
            key: 'placeholders',
            width: 120,
            align: 'center' as const,
            render: (placeholders: string[]) => (
                <Tooltip title={placeholders.join(', ') || 'Nenhum detectado'}>
                    <Tag color="purple">{placeholders.length} variáveis</Tag>
                </Tooltip>
            )
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            width: 100,
            render: (active: boolean) => (
                <Tag color={active ? 'green' : 'red'}>
                    {active ? 'Ativo' : 'Inativo'}
                </Tag>
            )
        },
        {
            title: 'Criado em',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 120,
            render: (date: string) => dayjs(date).format('DD/MM/YYYY')
        },
        {
            title: 'Ações',
            key: 'actions',
            width: 150,
            render: (_: any, record: DocumentTemplateListItem) => (
                <Space>
                    <Tooltip title="Baixar template">
                        <Button
                            type="text"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownload(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Editar">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => openEditModal(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Excluir template?"
                        description="Esta ação não pode ser desfeita."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Excluir"
                        cancelText="Cancelar"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Excluir">
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24 }}>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>
                            <FileWordOutlined style={{ marginRight: 8, color: '#2b579a' }} />
                            Templates de Documentos
                        </Title>
                        <Text type="secondary">
                            Gerencie templates Word para geração automática de documentos
                        </Text>
                    </div>
                    <Space>
                        <Button
                            icon={<InfoCircleOutlined />}
                            onClick={() => setPlaceholdersModalVisible(true)}
                        >
                            Ver Placeholders
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={openCreateModal}
                        >
                            Novo Template
                        </Button>
                    </Space>
                </div>

                <Space style={{ marginBottom: 16 }}>
                    <Search
                        placeholder="Buscar templates..."
                        allowClear
                        style={{ width: 300 }}
                        onSearch={setSearchText}
                        onChange={(e) => !e.target.value && setSearchText('')}
                    />
                    <Select
                        placeholder="Filtrar por tipo"
                        allowClear
                        style={{ width: 200 }}
                        onChange={setFilterType}
                        options={templateTypes.map(t => ({ value: t.value, label: t.label }))}
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchTemplates}>
                        Atualizar
                    </Button>
                </Space>

                <Table
                    columns={columns}
                    dataSource={templates}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Nenhum template encontrado"
                            >
                                <Button type="primary" onClick={openCreateModal}>
                                    Criar Template
                                </Button>
                            </Empty>
                        )
                    }}
                />
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                title={editingTemplate ? 'Editar Template' : 'Novo Template'}
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false);
                    setEditingTemplate(null);
                    form.resetFields();
                    setUploadFile(null);
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={editingTemplate ? handleUpdate : handleCreate}
                >
                    <Form.Item
                        name="name"
                        label="Nome do Template"
                        rules={[{ required: true, message: 'Informe o nome' }]}
                    >
                        <Input placeholder="Ex: Termo de Abertura - Questor" />
                    </Form.Item>

                    <Form.Item
                        name="description"
                        label="Descrição"
                    >
                        <Input.TextArea rows={2} placeholder="Descrição opcional do template" />
                    </Form.Item>

                    <Form.Item
                        name="template_type"
                        label="Tipo de Template"
                        rules={[{ required: true, message: 'Selecione o tipo' }]}
                    >
                        <Select
                            placeholder="Selecione o tipo"
                            options={templateTypes.map(t => ({ value: t.value, label: t.label }))}
                        />
                    </Form.Item>

                    <Form.Item
                        name="product_ids"
                        label="Produtos Associados"
                    >
                        <Select
                            mode="multiple"
                            placeholder="Selecione os produtos"
                            options={products.map(p => ({ value: p.id, label: p.name }))}
                        />
                    </Form.Item>

                    {!editingTemplate && (
                        <Form.Item
                            label="Arquivo do Template"
                            required
                            extra="Apenas arquivos .docx. Use a sintaxe {{ placeholder }} para variáveis."
                        >
                            <Upload
                                accept=".docx"
                                maxCount={1}
                                beforeUpload={(file) => {
                                    setUploadFile(file);
                                    return false;
                                }}
                                onRemove={() => setUploadFile(null)}
                                fileList={uploadFile ? [{ uid: '-1', name: uploadFile.name, status: 'done' }] : []}
                            >
                                <Button icon={<UploadOutlined />}>Selecionar Arquivo</Button>
                            </Upload>
                        </Form.Item>
                    )}

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => {
                                setModalVisible(false);
                                setEditingTemplate(null);
                                form.resetFields();
                                setUploadFile(null);
                            }}>
                                Cancelar
                            </Button>
                            <Button type="primary" htmlType="submit">
                                {editingTemplate ? 'Salvar' : 'Criar Template'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Placeholders Modal */}
            <Modal
                title="Placeholders Disponíveis"
                open={placeholdersModalVisible}
                onCancel={() => setPlaceholdersModalVisible(false)}
                footer={null}
                width={700}
            >
                <Paragraph>
                    Use estes placeholders nos seus templates Word. Eles serão substituídos automaticamente
                    pelos dados da implantação ao gerar o documento.
                </Paragraph>
                <Paragraph type="secondary">
                    Sintaxe: <Text code>{'{{ nome_do_placeholder }}'}</Text>
                </Paragraph>
                <List
                    size="small"
                    dataSource={placeholders}
                    renderItem={(item) => (
                        <List.Item>
                            <List.Item.Meta
                                title={<Text code>{'{{ ' + item.name + ' }}'}</Text>}
                                description={
                                    <span>
                                        {item.description}
                                        {item.example && (
                                            <Text type="secondary"> — Ex: {item.example}</Text>
                                        )}
                                    </span>
                                }
                            />
                        </List.Item>
                    )}
                    style={{ maxHeight: 400, overflow: 'auto' }}
                />
            </Modal>
        </div>
    );
};

export default TemplatesPage;
