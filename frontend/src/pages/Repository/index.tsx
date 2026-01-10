/**
 * Repository page for file management (GED).
 */
import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Button, Space, Row, Col, Tree, Table, Input,
    Upload, Modal, Form, message, Tag, Empty, Popconfirm, Select
} from 'antd';
import type { UploadProps } from 'antd';
import {
    FolderOutlined, FileOutlined, UploadOutlined, DownloadOutlined,
    DeleteOutlined, FolderAddOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import type { FileCategoryTree, RepositoryFileListItem, FileCategoryCreate } from '../../types';
import { repositoryApi } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const RepositoryPage: React.FC = () => {
    const [categories, setCategories] = useState<FileCategoryTree[]>([]);
    const [files, setFiles] = useState<RepositoryFileListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [categoryModal, setCategoryModal] = useState(false);
    const [uploadModal, setUploadModal] = useState(false);
    const [form] = Form.useForm();
    const [uploadForm] = Form.useForm();
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [descriptionModal, setDescriptionModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<RepositoryFileListItem | null>(null);

    const fetchCategories = async () => {
        try {
            const data = await repositoryApi.getCategoryTree();
            setCategories(data);
        } catch { message.error('Erro ao carregar categorias'); }
    };

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const filters: { category_id?: string; search?: string } = {};
            if (selectedCategory) filters.category_id = selectedCategory;
            if (search) filters.search = search;
            const data = await repositoryApi.listFiles(1, 50, filters);
            setFiles(data.items);
        } catch { message.error('Erro ao carregar arquivos'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchCategories(); }, []);
    useEffect(() => { fetchFiles(); }, [selectedCategory, search]);

    const handleDeleteCategory = async (categoryId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await repositoryApi.deleteCategory(categoryId);
            message.success('Categoria excluída');
            if (selectedCategory === categoryId) {
                setSelectedCategory(null);
            }
            fetchCategories();
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao excluir categoria');
        }
    };

    const buildTreeData = (cats: FileCategoryTree[]): any[] => {
        return cats.map(cat => ({
            title: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FolderOutlined /> {cat.name} <Text type="secondary">({cat.file_count})</Text>
                    {cat.file_count === 0 && cat.children.length === 0 && (
                        <Popconfirm
                            title="Excluir categoria?"
                            description="Esta ação não pode ser desfeita."
                            onConfirm={(e) => handleDeleteCategory(cat.id, e as any)}
                            okText="Sim"
                            cancelText="Não"
                        >
                            <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={(e) => e.stopPropagation()}
                                style={{ marginLeft: 4 }}
                            />
                        </Popconfirm>
                    )}
                </span>
            ),
            key: cat.id,
            children: cat.children.length > 0 ? buildTreeData(cat.children) : undefined
        }));
    };

    const handleCreateCategory = async (values: FileCategoryCreate) => {
        try {
            await repositoryApi.createCategory({
                ...values,
                parent_id: selectedCategory || undefined
            });
            message.success('Categoria criada');
            setCategoryModal(false);
            form.resetFields();
            fetchCategories();
        } catch { message.error('Erro ao criar categoria'); }
    };

    const handleUpload = async () => {
        if (!fileToUpload) return;
        try {
            const values = uploadForm.getFieldsValue();
            await repositoryApi.uploadFile(fileToUpload, {
                description: values.description,
                tags: values.tags,
                category_id: values.category_id || undefined
            });
            message.success('Arquivo enviado');
            setUploadModal(false);
            setFileToUpload(null);
            uploadForm.resetFields();
            fetchFiles();
            fetchCategories(); // Refresh category counts
        } catch { message.error('Erro ao enviar arquivo'); }
    };

    const handleDownload = async (file: RepositoryFileListItem) => {
        try {
            const blob = await repositoryApi.downloadFile(file.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.original_filename;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch { message.error('Erro ao baixar arquivo'); }
    };

    const handleDelete = async (id: string) => {
        try {
            await repositoryApi.deleteFile(id);
            message.success('Arquivo excluído');
            fetchFiles();
        } catch { message.error('Erro ao excluir'); }
    };

    const uploadProps: UploadProps = {
        beforeUpload: (file) => {
            setFileToUpload(file);
            return false;
        },
        maxCount: 1,
    };

    const columns = [
        {
            title: 'Arquivo',
            dataIndex: 'original_filename',
            key: 'name',
            render: (name: string, record: RepositoryFileListItem) => (
                <><FileOutlined /> {name} {record.version > 1 && <Tag color="blue">v{record.version}</Tag>}</>
            )
        },
        { title: 'Tamanho', dataIndex: 'file_size', key: 'size', render: (size: number) => formatFileSize(size) },
        { title: 'Tags', dataIndex: 'tags', key: 'tags', render: (tags: string) => tags?.split(',').map((t, i) => <Tag key={i}>{t.trim()}</Tag>) },
        { title: 'Enviado por', dataIndex: 'uploaded_by', key: 'uploaded_by', render: (user: any) => user?.name },
        { title: 'Downloads', dataIndex: 'download_count', key: 'downloads' },
        { title: 'Data', dataIndex: 'created_at', key: 'date', render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm') },
        {
            title: 'Ações',
            key: 'actions',
            render: (_: any, record: RepositoryFileListItem) => (
                <Space>
                    <Button type="link" icon={<InfoCircleOutlined />} onClick={() => { setSelectedFile(record); setDescriptionModal(true); }} title="Ver descrição" />
                    <Button type="link" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>Baixar</Button>
                    <Popconfirm title="Excluir arquivo?" onConfirm={() => handleDelete(record.id)} okText="Sim" cancelText="Não">
                        <Button type="link" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Repositório de Arquivos</Title>
                <Space>
                    <Button icon={<FolderAddOutlined />} onClick={() => setCategoryModal(true)}>Nova Categoria</Button>
                    <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModal(true)}>Upload</Button>
                </Space>
            </div>

            <Row gutter={16}>
                <Col span={6}>
                    <Card title="Categorias" size="small">
                        <Button type="link" onClick={() => setSelectedCategory(null)} style={{ marginBottom: 8 }}>
                            Todos os Arquivos
                        </Button>
                        {categories.length > 0 ? (
                            <Tree
                                treeData={buildTreeData(categories)}
                                onSelect={(keys) => setSelectedCategory(keys[0] as string || null)}
                                selectedKeys={selectedCategory ? [selectedCategory] : []}
                            />
                        ) : (
                            <Empty description="Nenhuma categoria" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                    </Card>
                </Col>
                <Col span={18}>
                    <Card
                        title={selectedCategory ? 'Arquivos da Categoria' : 'Todos os Arquivos'}
                        extra={<Search placeholder="Buscar..." allowClear onSearch={setSearch} style={{ width: 250 }} />}
                    >
                        <Table
                            columns={columns}
                            dataSource={files}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                            locale={{ emptyText: <Empty description="Nenhum arquivo" /> }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Category Modal */}
            <Modal title="Nova Categoria" open={categoryModal} onCancel={() => setCategoryModal(false)} onOk={() => form.submit()}>
                <Form form={form} layout="vertical" onFinish={handleCreateCategory}>
                    <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Descrição">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Upload Modal */}
            <Modal title="Upload de Arquivo" open={uploadModal} onCancel={() => { setUploadModal(false); setFileToUpload(null); }} onOk={handleUpload} okButtonProps={{ disabled: !fileToUpload }}>
                <Form form={uploadForm} layout="vertical">
                    <Form.Item label="Arquivo">
                        <Upload {...uploadProps}>
                            <Button icon={<UploadOutlined />}>{fileToUpload ? fileToUpload.name : 'Selecionar arquivo'}</Button>
                        </Upload>
                    </Form.Item>
                    <Form.Item name="category_id" label="Categoria">
                        <Select
                            placeholder="Selecione uma categoria (opcional)"
                            allowClear
                            options={categories.map(cat => ({ value: cat.id, label: cat.name }))}
                        />
                    </Form.Item>
                    <Form.Item name="description" label="Descrição/Observações">
                        <Input.TextArea rows={2} placeholder="Adicione observações sobre o arquivo..." />
                    </Form.Item>
                    <Form.Item name="tags" label="Tags (separadas por vírgula)">
                        <Input placeholder="manual, v2.0, financeiro" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Description Modal */}
            <Modal
                title={selectedFile?.original_filename || 'Detalhes do Arquivo'}
                open={descriptionModal}
                onCancel={() => { setDescriptionModal(false); setSelectedFile(null); }}
                footer={[
                    <Button key="close" onClick={() => { setDescriptionModal(false); setSelectedFile(null); }}>Fechar</Button>
                ]}
            >
                {selectedFile && (
                    <div>
                        <p><strong>Nome:</strong> {selectedFile.original_filename}</p>
                        <p><strong>Tamanho:</strong> {formatFileSize(selectedFile.file_size)}</p>
                        <p><strong>Enviado por:</strong> {selectedFile.uploaded_by?.name || 'Desconhecido'}</p>
                        <p><strong>Data:</strong> {dayjs(selectedFile.created_at).format('DD/MM/YYYY HH:mm')}</p>
                        {selectedFile.tags && <p><strong>Tags:</strong> {selectedFile.tags}</p>}
                        <p><strong>Descrição/Observações:</strong></p>
                        <div style={{
                            background: '#f5f5f5',
                            padding: 12,
                            borderRadius: 4,
                            minHeight: 60,
                            whiteSpace: 'pre-wrap'
                        }}>
                            {selectedFile.description || <em style={{ color: '#999' }}>Nenhuma descrição informada</em>}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default RepositoryPage;
