/**
 * Main application layout with sidebar navigation.
 * Menu items are filtered based on user permissions.
 */
import React, { useState, useMemo } from 'react';
import { Layout, Menu, theme, Avatar, Dropdown, Button, Drawer, Grid } from 'antd';
import type { MenuProps } from 'antd';
import {
    DashboardOutlined,
    UserOutlined,
    TeamOutlined,
    SafetyCertificateOutlined,
    UserSwitchOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    AppstoreOutlined,
    CheckSquareOutlined,
    RocketOutlined,
    ToolOutlined,
    CalendarOutlined,
    FolderOpenOutlined,
    DatabaseOutlined,
    FileWordOutlined,
    MessageOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

// Mapping of routes to required resource permissions
const routePermissions: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/users': 'users',
    '/teams': 'teams',
    '/roles': 'roles',

    '/clients': 'clients',
    '/products': 'products',
    '/checklists': 'checklists',
    '/implementations': 'implementations',
    '/service-orders': 'service-orders',
    '/calendar': 'tasks',
    '/sprint': 'sprints',
    '/repository': 'repository',
    '/backup': 'backup',
    '/templates': 'admin',
    '/chat': 'chat',
    '/chat-config': 'chat',
};

interface MenuItem {
    key: string;
    icon?: React.ReactNode;
    label: string;
    type?: 'group' | 'divider';
    children?: MenuItem[];
}

const AppLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    // Get all user permissions from roles
    const userPermissions = useMemo(() => {
        if (!user) return new Set<string>();
        if (user.is_superuser) return 'all'; // Superuser has all permissions

        const perms = new Set<string>();
        user.roles?.forEach(role => {
            role.permissions?.forEach(perm => {
                perms.add(`${perm.resource}:${perm.action}`);
            });
        });
        return perms;
    }, [user]);

    // Check if user has permission to access a resource
    const hasPermission = (resource: string): boolean => {
        if (userPermissions === 'all') return true;
        // Check if user has read permission for the resource
        return userPermissions.has(`${resource}:read`);
    };

    // Filter menu items based on permissions
    const allMenuItems: MenuItem[] = [
        {
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: 'Visão Geral',
        },
        {
            key: 'admin',
            label: 'Administração',
            type: 'group',
            children: [
                { key: '/users', icon: <UserOutlined />, label: 'Usuários' },
                { key: '/teams', icon: <TeamOutlined />, label: 'Equipes' },
                { key: '/roles', icon: <SafetyCertificateOutlined />, label: 'Cargos' },
                { key: '/clients', icon: <UserSwitchOutlined />, label: 'Clientes' },
            ],
        },
        {
            key: 'impl',
            label: 'Implantações',
            type: 'group',
            children: [
                { key: '/products', icon: <AppstoreOutlined />, label: 'Produtos' },
                { key: '/checklists', icon: <CheckSquareOutlined />, label: 'Checklists' },
                { key: '/implementations', icon: <RocketOutlined />, label: 'Implantações' },
            ],
        },
        {
            key: 'services',
            label: 'Serviços e Agenda',
            type: 'group',
            children: [
                { key: '/service-orders', icon: <ToolOutlined />, label: 'Ordens de Serviço' },
                { key: '/calendar', icon: <CalendarOutlined />, label: 'Agenda' },
                { key: '/sprint', icon: <RocketOutlined />, label: 'Sprint Semanal' },
                { key: '/repository', icon: <FolderOpenOutlined />, label: 'Repositório' },
            ],
        },
        {
            key: 'sistema',
            label: 'Sistema',
            type: 'group',
            children: [
                { key: '/templates', icon: <FileWordOutlined />, label: 'Templates' },
                { key: '/backup', icon: <DatabaseOutlined />, label: 'Backup' },
                { key: '/powerbi', icon: <DashboardOutlined />, label: 'Power BI' },
            ],
        },
        {
            key: 'atendimento',
            label: 'Atendimento',
            type: 'group',
            children: [
                { key: '/chat', icon: <MessageOutlined />, label: 'Conversas' },
                { key: '/chat-config', icon: <SettingOutlined />, label: 'Config WhatsApp' },
            ],
        },
    ];

    // Filter menu items based on permissions
    const menuItems: MenuProps['items'] = useMemo(() => {
        const filterItem = (item: MenuItem): MenuItem | null => {
            // If it's a group, filter its children
            if (item.type === 'group' && item.children) {
                const filteredChildren = item.children
                    .map(child => filterItem(child))
                    .filter((child): child is MenuItem => child !== null);

                // Only show group if it has visible children
                if (filteredChildren.length === 0) return null;

                return { ...item, children: filteredChildren };
            }

            // For regular items, check permission
            const resource = routePermissions[item.key];
            if (resource && !hasPermission(resource)) {
                return null;
            }

            return item;
        };

        const filtered = allMenuItems
            .map(item => filterItem(item))
            .filter((item): item is MenuItem => item !== null);

        // Add divider after dashboard if there are more items
        if (filtered.length > 1) {
            filtered.splice(1, 0, { key: 'divider-1', type: 'divider', label: '' });
        }

        return filtered as MenuProps['items'];
    }, [userPermissions]);

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Meu Perfil',
        },
        {
            type: 'divider',
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Sair',
            danger: true,
        },
    ];

    const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
        navigate(key);
    };

    const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
        if (key === 'logout') {
            logout();
            navigate('/login');
        } else if (key === 'profile') {
            navigate('/profile');
        }
    };

    // Menu content to be shared between Sider and Drawer
    const menuContent = (
        <>
            <div style={{
                height: 96, // Matches h-24
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: isMobile ? 24 : (collapsed ? 20 : 24),
                fontWeight: 800,
                letterSpacing: '-0.025em',
                background: 'transparent',
            }}>
                {isMobile ? 'Miq2' : (collapsed ? 'M2' : 'Miq2')}

            </div>
            <Menu
                theme="dark"
                mode="inline"
                selectedKeys={[location.pathname]}
                items={menuItems}
                onClick={(info) => {
                    handleMenuClick(info);
                    if (isMobile) {
                        setDrawerOpen(false);
                    }
                }}
            />
        </>
    );

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* Mobile Drawer */}
            {isMobile && (
                <Drawer
                    placement="left"
                    onClose={() => setDrawerOpen(false)}
                    open={drawerOpen}
                    width={250}
                    styles={{
                        body: { padding: 0, background: '#001529' },
                        header: { display: 'none' }
                    }}
                >
                    {menuContent}
                </Drawer>
            )}

            {/* Desktop Sider */}
            {!isMobile && (
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    width={280}
                    style={{
                        overflow: 'auto',
                        height: '100vh',
                        position: 'fixed',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        background: '#0f172a', // Brand Dark
                        boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
                        zIndex: 20,
                    }}
                >
                    {menuContent}
                </Sider>
            )}

            <Layout style={{
                marginLeft: isMobile ? 0 : (collapsed ? 80 : 280),
                transition: 'all 0.2s',
                background: '#f8f9fc'
            }}>
                <Header style={{
                    padding: isMobile ? '0 12px' : '0 32px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e6ebf4',
                    position: isMobile ? 'sticky' : 'sticky',
                    top: 0,
                    zIndex: 19,
                    height: 80,
                }}>
                    <Button
                        type="text"
                        icon={isMobile ? <MenuUnfoldOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
                        onClick={() => isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed)}
                        style={{ fontSize: '16px', width: 48, height: 48 }}
                    />
                    <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
                        <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {!isMobile && <span>{user?.name}</span>}
                            <Avatar icon={<UserOutlined />} />
                        </div>
                    </Dropdown>
                </Header>
                <Content style={{
                    margin: isMobile ? '12px' : '24px',
                    padding: isMobile ? 12 : 24,
                    background: colorBgContainer,
                    borderRadius: borderRadiusLG,
                    minHeight: 280,
                }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default AppLayout;
