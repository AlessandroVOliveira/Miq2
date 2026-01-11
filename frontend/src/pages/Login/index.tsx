/**
 * Login page component with Deep Blue design.
 */
import React, { useState } from 'react';
import { Form, Input, Button, Checkbox, message, Typography } from 'antd';
import { LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './login.module.css';

const { Title, Text } = Typography;

interface LoginFormValues {
    email: string;
    password: string;
}

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const onFinish = async (values: LoginFormValues) => {
        setLoading(true);
        try {
            await login(values.email, values.password);
            message.success('Login realizado com sucesso!');
            navigate('/dashboard');
        } catch {
            message.error('Email ou senha inválidos');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            {/* Header Section */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
                <img src="/logo.png" alt="Logo" style={{ width: 200, marginBottom: 16 }} />
                <Text type="secondary" style={{ color: '#64748b' }}>Plataforma de Gestão Corporativa</Text>
            </div>

            {/* Main Login Card */}
            <div className={styles.card}>
                <Form
                    name="login"
                    onFinish={onFinish}
                    autoComplete="off"
                    layout="vertical"
                    size="large"
                >
                    <Form.Item
                        label={<span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>E-mail</span>}
                        name="email"
                        rules={[
                            { required: true, message: 'Por favor, informe seu email' },
                            { type: 'email', message: 'Email inválido' }
                        ]}
                    >
                        <Input
                            placeholder="Digite seu e-mail"
                            className={styles.inputField}
                        />
                    </Form.Item>

                    <Form.Item
                        label={<span style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>Senha</span>}
                        name="password"
                        rules={[{ required: true, message: 'Por favor, informe sua senha' }]}
                    >
                        <Input.Password
                            placeholder="Digite sua senha"
                            className={styles.inputField}
                        />
                    </Form.Item>

                    <Form.Item>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Checkbox style={{ color: '#64748b' }}>Lembrar de mim</Checkbox>
                        </div>
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            className={styles.submitButton}
                        >
                            Acessar <LoginOutlined />
                        </Button>
                    </Form.Item>
                </Form>
            </div>

            {/* Footer */}
            <div className={styles.footerText}>
                © 2025 MIQ2. Todos os direitos reservados.
            </div>
        </div>
    );
};

export default Login;
