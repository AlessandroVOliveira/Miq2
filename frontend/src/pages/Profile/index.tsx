/**
 * User Profile Page - Allows users to update their name and avatar.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Button, Avatar, Upload, message, Typography, Spin } from 'antd';
import { UserOutlined, CameraOutlined, SaveOutlined } from '@ant-design/icons';
import { usersApi } from '../../services/api';
import type { UploadChangeParam } from 'antd/es/upload';

const { Title, Text } = Typography;

const Profile: React.FC = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>('');

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            const user = await usersApi.getMe();
            setUserName(user.name);
            setAvatarUrl(user.avatar_url || null);
            form.setFieldsValue({ name: user.name });
        } catch (error) {
            message.error('Erro ao carregar perfil');
        } finally {
            setLoading(false);
        }
    }, [form]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleSave = async (values: { name: string }) => {
        try {
            setSaving(true);
            await usersApi.updateProfile({
                name: values.name,
                avatar_url: avatarUrl || undefined
            });
            setUserName(values.name);
            message.success('Perfil atualizado com sucesso!');
        } catch (error) {
            message.error('Erro ao atualizar perfil');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarChange = (info: UploadChangeParam) => {
        const file = info.file.originFileObj || info.file;
        if (file && file instanceof Blob) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target?.result as string;
                setAvatarUrl(base64);
                message.success('Foto carregada! Clique em Salvar para confirmar.');
            };
            reader.onerror = () => {
                message.error('Erro ao ler arquivo');
            };
            reader.readAsDataURL(file);
        }
    };

    const removeAvatar = () => {
        setAvatarUrl(null);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px' }}>
            <Title level={2} style={{ marginBottom: 24 }}>Meu Perfil</Title>

            <Card>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <Avatar
                            size={120}
                            src={avatarUrl}
                            icon={!avatarUrl ? <UserOutlined /> : undefined}
                            style={{ backgroundColor: '#e2e8f0', color: '#64748b' }}
                        />
                        <Upload
                            accept="image/*"
                            showUploadList={false}
                            beforeUpload={() => false}
                            onChange={handleAvatarChange}
                        >
                            <Button
                                type="primary"
                                shape="circle"
                                icon={<CameraOutlined />}
                                size="small"
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                }}
                            />
                        </Upload>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <Text strong style={{ fontSize: 18 }}>{userName}</Text>
                    </div>
                    {avatarUrl && (
                        <Button type="link" danger onClick={removeAvatar} style={{ marginTop: 8 }}>
                            Remover foto
                        </Button>
                    )}
                </div>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                >
                    <Form.Item
                        name="name"
                        label="Nome"
                        rules={[
                            { required: true, message: 'Por favor, insira seu nome' },
                            { min: 2, message: 'Nome deve ter pelo menos 2 caracteres' }
                        ]}
                    >
                        <Input placeholder="Seu nome" size="large" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={saving}
                            size="large"
                            block
                        >
                            Salvar Alterações
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Profile;
