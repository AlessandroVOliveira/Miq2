/**
 * Backup page for database backup and restore.
 */
import React, { useState } from 'react';
import {
    Card, Typography, Button, Space, Row, Col, Upload, Modal, Input,
    message, Alert, Divider
} from 'antd';
import type { UploadProps } from 'antd';
import {
    DownloadOutlined, UploadOutlined, DatabaseOutlined,
    ExclamationCircleOutlined, LockOutlined
} from '@ant-design/icons';
import { backupApi } from '../../services/api';

const { Title, Text, Paragraph } = Typography;

const BackupPage: React.FC = () => {
    const [backupLoading, setBackupLoading] = useState(false);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [restoreFile, setRestoreFile] = useState<File | null>(null);
    const [adminPassword, setAdminPassword] = useState('');
    const [restoreLoading, setRestoreLoading] = useState(false);

    const handleBackup = async () => {
        setBackupLoading(true);
        try {
            const blob = await backupApi.createBackup();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            a.download = `miq2_backup_${timestamp}.sql`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            message.success('Backup criado com sucesso!');
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao criar backup');
        } finally {
            setBackupLoading(false);
        }
    };

    const handleRestore = async () => {
        if (!restoreFile) {
            message.error('Selecione um arquivo de backup');
            return;
        }
        if (!adminPassword) {
            message.error('Digite a senha do administrador');
            return;
        }

        setRestoreLoading(true);
        try {
            await backupApi.restoreBackup(restoreFile, adminPassword);
            message.success('Banco de dados restaurado com sucesso!');
            setRestoreModalOpen(false);
            setRestoreFile(null);
            setAdminPassword('');
        } catch (error: any) {
            message.error(error.response?.data?.detail || 'Erro ao restaurar backup');
        } finally {
            setRestoreLoading(false);
        }
    };

    const uploadProps: UploadProps = {
        beforeUpload: (file) => {
            if (!file.name.endsWith('.sql')) {
                message.error('O arquivo deve ser um arquivo .sql');
                return false;
            }
            setRestoreFile(file);
            return false;
        },
        maxCount: 1,
        accept: '.sql',
        onRemove: () => {
            setRestoreFile(null);
        }
    };

    return (
        <div>
            <Title level={2}><DatabaseOutlined /> Backup e Restauração</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Gerencie backups do banco de dados do sistema.
            </Text>

            <Row gutter={24}>
                {/* Backup Section */}
                <Col xs={24} lg={12}>
                    <Card title="Criar Backup" style={{ height: '100%' }}>
                        <Paragraph>
                            Clique no botão abaixo para gerar um backup completo do banco de dados.
                            O arquivo será salvo no seu computador.
                        </Paragraph>

                        <Alert
                            message="O backup inclui todos os dados do sistema"
                            description="Usuários, clientes, implantações, ordens de serviço, tarefas, sprints e arquivos do repositório."
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />

                        <Button
                            type="primary"
                            size="large"
                            icon={<DownloadOutlined />}
                            onClick={handleBackup}
                            loading={backupLoading}
                            block
                        >
                            {backupLoading ? 'Gerando backup...' : 'Fazer Backup'}
                        </Button>
                    </Card>
                </Col>

                {/* Restore Section */}
                <Col xs={24} lg={12}>
                    <Card title="Restaurar Backup" style={{ height: '100%' }}>
                        <Paragraph>
                            Restaure o banco de dados a partir de um arquivo de backup.
                            Esta ação substituirá todos os dados atuais.
                        </Paragraph>

                        <Alert
                            message="Atenção: Esta operação é irreversível"
                            description="Todos os dados atuais serão substituídos pelos dados do backup selecionado."
                            type="warning"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />

                        <Button
                            type="default"
                            size="large"
                            icon={<UploadOutlined />}
                            onClick={() => setRestoreModalOpen(true)}
                            danger
                            block
                        >
                            Restaurar Backup
                        </Button>
                    </Card>
                </Col>
            </Row>

            {/* Restore Modal */}
            <Modal
                title={
                    <Space>
                        <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                        Restaurar Backup
                    </Space>
                }
                open={restoreModalOpen}
                onCancel={() => {
                    setRestoreModalOpen(false);
                    setRestoreFile(null);
                    setAdminPassword('');
                }}
                footer={[
                    <Button key="cancel" onClick={() => setRestoreModalOpen(false)}>
                        Cancelar
                    </Button>,
                    <Button
                        key="restore"
                        type="primary"
                        danger
                        loading={restoreLoading}
                        onClick={handleRestore}
                        disabled={!restoreFile || !adminPassword}
                    >
                        Confirmar Restauração
                    </Button>
                ]}
            >
                <Alert
                    message="Atenção!"
                    description="Esta operação substituirá TODOS os dados atuais do sistema pelos dados do backup selecionado. Esta ação não pode ser desfeita."
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                />

                <Divider>Selecione o arquivo de backup</Divider>

                <Upload {...uploadProps}>
                    <Button icon={<UploadOutlined />} style={{ marginBottom: 16 }}>
                        {restoreFile ? restoreFile.name : 'Selecionar arquivo .sql'}
                    </Button>
                </Upload>

                <Divider>Confirme sua identidade</Divider>

                <Input.Password
                    placeholder="Digite sua senha de administrador"
                    prefix={<LockOutlined />}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    size="large"
                />

                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    Por segurança, digite a senha da sua conta de administrador para confirmar a restauração.
                </Text>
            </Modal>
        </div>
    );
};

export default BackupPage;
