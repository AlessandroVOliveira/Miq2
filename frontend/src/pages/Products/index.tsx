/**
 * Products management page.
 */
import React, { useState, useEffect } from 'react';
import {
    Table, Button, Space, Input, Modal, Form, message,
    Typography, Card, Tag, Switch
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Product, ProductCreate, ProductUpdate } from '../../types';
import { productsApi } from '../../services/api';

const { Title } = Typography;
const { TextArea } = Input;

const Products: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [searchText, setSearchText] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [form] = Form.useForm();

    const fetchProducts = async (page = 1, size = 10, search = '') => {
        setLoading(true);
        try {
            const response = await productsApi.list(page, size, search || undefined);
            setProducts(response.items);
            setPagination({ current: page, pageSize: size, total: response.total });
        } catch {
            message.error('Erro ao carregar produtos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleSearch = (value: string) => {
        setSearchText(value);
        fetchProducts(1, pagination.pageSize, value);
    };

    const handleAdd = () => {
        setEditingProduct(null);
        form.resetFields();
        form.setFieldValue('is_active', true);
        setModalOpen(true);
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        form.setFieldsValue(product);
        setModalOpen(true);
    };

    const handleDelete = async (product: Product) => {
        Modal.confirm({
            title: 'Confirmar exclusão',
            content: `Deseja excluir o produto "${product.name}"?`,
            okText: 'Excluir',
            okType: 'danger',
            onOk: async () => {
                try {
                    await productsApi.delete(product.id);
                    message.success('Produto excluído');
                    fetchProducts(pagination.current, pagination.pageSize, searchText);
                } catch {
                    message.error('Erro ao excluir');
                }
            },
        });
    };

    const handleSubmit = async (values: ProductCreate | ProductUpdate) => {
        try {
            if (editingProduct) {
                await productsApi.update(editingProduct.id, values);
                message.success('Produto atualizado');
            } else {
                await productsApi.create(values as ProductCreate);
                message.success('Produto criado');
            }
            setModalOpen(false);
            fetchProducts(pagination.current, pagination.pageSize, searchText);
        } catch {
            message.error('Erro ao salvar produto');
        }
    };

    const columns: ColumnsType<Product> = [
        {
            title: 'Nome',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name)
        },
        {
            title: 'Versão',
            dataIndex: 'version',
            key: 'version',
            width: 100
        },
        {
            title: 'Descrição',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true
        },
        {
            title: 'Checklists',
            dataIndex: 'checklists',
            key: 'checklists',
            render: (checklists) => checklists?.length || 0
        },
        {
            title: 'Status',
            dataIndex: 'is_active',
            key: 'is_active',
            width: 100,
            render: (active: boolean) => (
                <Tag color={active ? 'success' : 'default'}>{active ? 'Ativo' : 'Inativo'}</Tag>
            )
        },
        {
            title: 'Ações',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Produtos</Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Novo Produto</Button>
            </div>

            <Card>
                <Space style={{ marginBottom: 16 }}>
                    <Input.Search
                        placeholder="Buscar"
                        allowClear
                        onSearch={handleSearch}
                        style={{ width: 300 }}
                        prefix={<SearchOutlined />}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => fetchProducts(pagination.current, pagination.pageSize, searchText)}>
                        Atualizar
                    </Button>
                </Space>

                <Table
                    columns={columns}
                    dataSource={products}
                    loading={loading}
                    rowKey="id"
                    pagination={{ ...pagination, showSizeChanger: true, showTotal: (total) => `Total: ${total}` }}
                    onChange={(p) => fetchProducts(p.current, p.pageSize, searchText)}
                />
            </Card>

            <Modal title={editingProduct ? 'Editar Produto' : 'Novo Produto'} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null}>
                <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ is_active: true }}>
                    <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="version" label="Versão">
                        <Input placeholder="Ex: 1.0" />
                    </Form.Item>
                    <Form.Item name="description" label="Descrição">
                        <TextArea rows={3} />
                    </Form.Item>
                    <Form.Item name="is_active" label="Ativo" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">{editingProduct ? 'Salvar' : 'Criar'}</Button>
                            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Products;
