/**
 * Repository page for file management with Deep Blue design.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Layout, Button, Input, Dropdown, Modal, Form, message, Select,
    Upload, Empty, Popconfirm, Avatar, Progress, Breadcrumb, Radio
} from 'antd';
import {
    FolderOutlined, FileOutlined, SearchOutlined, PlusOutlined,
    MoreOutlined, CloudUploadOutlined, CloudOutlined, AppstoreOutlined,
    BarsOutlined, FilePdfOutlined, FileWordOutlined, FileExcelOutlined,
    FileImageOutlined, DeleteOutlined, InfoCircleOutlined, DownloadOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { repositoryApi } from '../../services/api';
import type { FileCategoryTree, RepositoryFileListItem, FileCategoryCreate } from '../../types';
import dayjs from 'dayjs';
import styles from './repository.module.css';

const { Sider, Content } = Layout;
const { Search } = Input;

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const style = { fontSize: 40 };
    switch (ext) {
        case 'pdf': return <FilePdfOutlined style={{ ...style, color: '#ef4444' }} />;
        case 'doc':
        case 'docx': return <FileWordOutlined style={{ ...style, color: '#3b82f6' }} />;
        case 'xls':
        case 'xlsx': return <FileExcelOutlined style={{ ...style, color: '#22c55e' }} />;
        case 'jpg':
        case 'jpeg':
        case 'png': return <FileImageOutlined style={{ ...style, color: '#eab308' }} />;
        default: return <FileOutlined style={{ ...style, color: '#94a3b8' }} />;
    }
};

const getBadgeColor = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'pdf': return { bg: '#fee2e2', color: '#ef4444' };
        case 'doc':
        case 'docx': return { bg: '#dbeafe', color: '#3b82f6' };
        case 'xls':
        case 'xlsx': return { bg: '#dcfce7', color: '#16a34a' };
        case 'jpg':
        case 'jpeg':
        case 'png': return { bg: '#fef9c3', color: '#ca8a04' };
        default: return { bg: '#f1f5f9', color: '#64748b' };
    }
};

const RepositoryPage: React.FC = () => {
    const [categories, setCategories] = useState<FileCategoryTree[]>([]);
    const [files, setFiles] = useState<RepositoryFileListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<FileCategoryTree | null>(null);
    const [searchText, setSearchText] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Modals
    const [categoryModal, setCategoryModal] = useState(false);
    const [uploadModal, setUploadModal] = useState(false);
    const [descriptionModal, setDescriptionModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<RepositoryFileListItem | null>(null);

    // Forms
    const [form] = Form.useForm();
    const [uploadForm] = Form.useForm();
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);

    const fetchCategories = useCallback(async () => {
        try {
            const data = await repositoryApi.getCategoryTree();
            setCategories(data);
        } catch {
            message.error('Falha ao carregar pastas');
        }
    }, []);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            const filters: { category_id?: string; search?: string } = {};
            if (selectedCategory) filters.category_id = selectedCategory.id;
            if (searchText) filters.search = searchText;

            const data = await repositoryApi.listFiles(1, 100, filters);
            setFiles(data.items);
        } catch {
            message.error('Falha ao carregar arquivos');
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, searchText]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // Handlers
    const handleCreateCategory = async (values: FileCategoryCreate) => {
        try {
            await repositoryApi.createCategory({
                ...values,
                parent_id: selectedCategory?.id
            });
            message.success('Pasta criada');
            setCategoryModal(false);
            form.resetFields();
            fetchCategories();
        } catch {
            message.error('Falha ao criar pasta');
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        try {
            await repositoryApi.deleteCategory(categoryId);
            message.success('Pasta excluída');
            if (selectedCategory?.id === categoryId) setSelectedCategory(null);
            fetchCategories();
        } catch {
            message.error('Falha ao excluir pasta');
        }
    };

    const handleUpload = async () => {
        if (!fileToUpload) return;
        try {
            const values = uploadForm.getFieldsValue();
            await repositoryApi.uploadFile(fileToUpload, {
                description: values.description,
                tags: values.tags,
                category_id: selectedCategory?.id // Default to current category
            });
            message.success('Arquivo enviado');
            setUploadModal(false);
            setFileToUpload(null);
            uploadForm.resetFields();
            fetchFiles();
        } catch {
            message.error('Falha ao enviar arquivo');
        }
    };

    const handleDeleteFile = async (id: string) => {
        try {
            await repositoryApi.deleteFile(id);
            message.success('Arquivo excluído');
            fetchFiles();
        } catch {
            message.error('Falha ao excluir arquivo');
        }
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
        } catch {
            message.error('Falha ao baixar');
        }
    };

    const uploadProps: UploadProps = {
        beforeUpload: (file) => {
            setFileToUpload(file);
            return false;
        },
        maxCount: 1,
    };

    // Helper to get sub-folders of current selection (if any) or root folders
    const currentFolders = selectedCategory
        ? (selectedCategory.children || [])
        : categories;

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <div className={styles.sidebar}>
                <div className={styles.sidebarNav}>
                    <div className={styles.navSection}>
                        <div className={styles.navTitle}>Buscar Arquivos</div>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Nome ou observação..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                            style={{ marginBottom: 8 }}
                        />
                    </div>

                    <div className={styles.navSection}>
                        <div className={styles.navTitle}>Unidades e Pastas</div>

                        <div
                            className={`${styles.navItem} ${!selectedCategory ? styles.navItemActive : ''}`}
                            onClick={() => setSelectedCategory(null)}
                        >
                            <FolderOutlined className={styles.navIcon} /> Todos os Arquivos
                        </div>

                        {categories.map(cat => (
                            <div
                                key={cat.id}
                                className={`${styles.navItem} ${selectedCategory?.id === cat.id ? styles.navItemActive : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                <FolderOutlined className={styles.navIcon} />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {cat.name}
                                </span>
                                {cat.file_count > 0 && <span style={{ fontSize: 10, color: '#94a3b8' }}>{cat.file_count}</span>}
                                {cat.file_count === 0 && (
                                    <Popconfirm
                                        title="Excluir pasta?"
                                        description="Esta pasta está vazia e será excluída."
                                        onConfirm={(e) => { e?.stopPropagation(); handleDeleteCategory(cat.id); }}
                                        onCancel={(e) => e?.stopPropagation()}
                                        okText="Excluir"
                                        cancelText="Cancelar"
                                    >
                                        <DeleteOutlined
                                            style={{ color: '#94a3b8', cursor: 'pointer' }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </Popconfirm>
                                )}
                            </div>
                        ))}

                        <Button
                            type="dashed"
                            block
                            icon={<PlusOutlined />}
                            style={{ marginTop: 8 }}
                            onClick={() => setCategoryModal(true)}
                        >
                            Nova Pasta
                        </Button>
                    </div>
                </div>

                <div className={styles.storageWidget}>
                    <div className={styles.storageHeader}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CloudOutlined /> Armazenamento
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1064fe' }}>75%</span>
                    </div>
                    <Progress percent={75} showInfo={false} strokeColor="#1064fe" size="small" />
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>750GB de 1TB usados</div>
                </div>
            </div>

            {/* Main Content */}
            <div className={styles.mainContent}>
                <div className={styles.header}>
                    <Breadcrumb
                        items={[
                            { title: <a onClick={() => setSelectedCategory(null)}>Repositório</a> },
                            ...(selectedCategory ? [{ title: selectedCategory.name }] : [])
                        ]}
                        style={{ marginBottom: 16 }}
                    />

                    <div className={styles.toolbar}>
                        <div>
                            <h2 className={styles.pageTitle}>
                                {selectedCategory ? selectedCategory.name : 'Todos os Arquivos'}
                                <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 4, background: '#fff' }}>
                                    {selectedCategory ? 'Pasta' : 'Raiz'}
                                </span>
                            </h2>
                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                                {files.length} itens • Atualizado hoje
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <Radio.Group value={viewMode} onChange={e => setViewMode(e.target.value)} buttonStyle="solid">
                                <Radio.Button value="grid"><AppstoreOutlined /></Radio.Button>
                                <Radio.Button value="list"><BarsOutlined /></Radio.Button>
                            </Radio.Group>
                            <Button
                                type="primary"
                                icon={<CloudUploadOutlined />}
                                size="large"
                                style={{ background: '#1064fe' }}
                                onClick={() => setUploadModal(true)}
                            >
                                Enviar
                            </Button>
                        </div>
                    </div>
                </div>

                <div className={styles.gridContent}>
                    {/* Folders Section (if inside a category with children, or root) */}
                    {/* Implementation detail: The API might return hierarchical children. simplified here for demo */}

                    <div className={styles.sectionTitle}>Arquivos</div>

                    {files.length === 0 ? (
                        <Empty description="Nenhum arquivo encontrado" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : viewMode === 'grid' ? (
                        <div className={styles.fileGrid}>
                            {files.map(file => {
                                const badgeStyle = getBadgeColor(file.original_filename);
                                return (
                                    <div key={file.id} className={styles.fileCard} onClick={() => { setSelectedFile(file); setDescriptionModal(true); }}>
                                        <div className={styles.fileIconArea}>
                                            <div className="group-hover:scale-110 transition-transform duration-300">
                                                {getFileIcon(file.original_filename)}
                                            </div>
                                        </div>
                                        <div className={styles.fileInfo}>
                                            <div className={styles.fileName} title={file.original_filename}>
                                                {file.original_filename}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                <span className={styles.badge} style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
                                                    {file.original_filename.split('.').pop()?.toUpperCase()}
                                                </span>
                                                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                                    {formatFileSize(file.file_size)}
                                                </span>
                                            </div>
                                            <div className={styles.fileMeta}>
                                                <span>{dayjs(file.created_at).format('MMM D, YYYY')}</span>
                                                <Dropdown
                                                    menu={{
                                                        items: [
                                                            { key: 'download', label: 'Baixar', icon: <DownloadOutlined />, onClick: (e) => { e.domEvent.stopPropagation(); handleDownload(file); } },
                                                            { key: 'delete', label: 'Excluir', danger: true, icon: <DeleteOutlined />, onClick: (e) => { e.domEvent.stopPropagation(); handleDeleteFile(file.id); } }
                                                        ]
                                                    }}
                                                    trigger={['click']}
                                                >
                                                    <Button type="text" size="small" icon={<MoreOutlined />} onClick={e => e.stopPropagation()} />
                                                </Dropdown>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* List View */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {files.map(file => {
                                const badgeStyle = getBadgeColor(file.original_filename);
                                return (
                                    <div
                                        key={file.id}
                                        onClick={() => { setSelectedFile(file); setDescriptionModal(true); }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 16,
                                            padding: '12px 16px',
                                            background: 'white',
                                            borderRadius: 8,
                                            border: '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ width: 40 }}>
                                            {getFileIcon(file.original_filename)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{file.original_filename}</div>
                                            {file.description && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{file.description}</div>}
                                        </div>
                                        <span className={styles.badge} style={{ background: badgeStyle.bg, color: badgeStyle.color }}>
                                            {file.original_filename.split('.').pop()?.toUpperCase()}
                                        </span>
                                        <span style={{ fontSize: 12, color: '#94a3b8', width: 80 }}>
                                            {formatFileSize(file.file_size)}
                                        </span>
                                        <span style={{ fontSize: 12, color: '#94a3b8', width: 100 }}>
                                            {dayjs(file.created_at).format('DD/MM/YYYY')}
                                        </span>
                                        <Dropdown
                                            menu={{
                                                items: [
                                                    { key: 'download', label: 'Baixar', icon: <DownloadOutlined />, onClick: (e) => { e.domEvent.stopPropagation(); handleDownload(file); } },
                                                    { key: 'delete', label: 'Excluir', danger: true, icon: <DeleteOutlined />, onClick: (e) => { e.domEvent.stopPropagation(); handleDeleteFile(file.id); } }
                                                ]
                                            }}
                                            trigger={['click']}
                                        >
                                            <Button type="text" size="small" icon={<MoreOutlined />} onClick={e => e.stopPropagation()} />
                                        </Dropdown>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Category Modal */}
            <Modal title="Nova Pasta" open={categoryModal} onCancel={() => setCategoryModal(false)} onOk={() => form.submit()}>
                <Form form={form} layout="vertical" onFinish={handleCreateCategory}>
                    <Form.Item name="name" label="Nome da Pasta" rules={[{ required: true }]}>
                        <Input placeholder="ex: Docs do Projeto" />
                    </Form.Item>
                    <Form.Item name="description" label="Descrição">
                        <Input.TextArea rows={3} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Upload Modal */}
            <Modal title="Enviar Arquivo" open={uploadModal} onCancel={() => setUploadModal(false)} onOk={handleUpload} okButtonProps={{ disabled: !fileToUpload }}>
                <Form form={uploadForm} layout="vertical">
                    <Form.Item>
                        <Upload.Dragger {...uploadProps} style={{ padding: 20 }}>
                            <p className="ant-upload-drag-icon">
                                <CloudUploadOutlined style={{ color: '#1064fe' }} />
                            </p>
                            <p className="ant-upload-text">Clique ou arraste o arquivo para esta área</p>
                        </Upload.Dragger>
                    </Form.Item>
                    <Form.Item name="description" label="Descrição">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item name="tags" label="Tags">
                        <Input placeholder="contracts, v1, important" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Description Modal */}
            <Modal
                title={selectedFile?.original_filename || 'Detalhes do Arquivo'}
                open={descriptionModal}
                onCancel={() => { setDescriptionModal(false); setSelectedFile(null); }}
                footer={[
                    <Button key="download" icon={<DownloadOutlined />} onClick={() => selectedFile && handleDownload(selectedFile)}>Baixar</Button>,
                    <Button key="close" onClick={() => { setDescriptionModal(false); setSelectedFile(null); }}>Fechar</Button>
                ]}
            >
                {selectedFile && (
                    <div style={{ paddingTop: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                            {getFileIcon(selectedFile.original_filename)}
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedFile.original_filename}</div>
                                <div style={{ color: '#64748b' }}>{formatFileSize(selectedFile.file_size)}</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                                <span style={{ color: '#64748b' }}>Enviado por</span>
                                <span style={{ fontWeight: 500 }}>{selectedFile.uploaded_by?.name || 'Desconhecido'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 8 }}>
                                <span style={{ color: '#64748b' }}>Data</span>
                                <span style={{ fontWeight: 500 }}>{dayjs(selectedFile.created_at).format('DD/MM/YYYY HH:mm')}</span>
                            </div>
                            <div>
                                <div style={{ color: '#64748b', marginBottom: 4 }}>Descrição</div>
                                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                                    {selectedFile.description || 'Sem descrição'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default RepositoryPage;
