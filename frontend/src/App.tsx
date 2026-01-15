/**
 * Main application component with routing.
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AppLayout from './components/Layout/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Teams from './pages/Teams';
import Roles from './pages/Roles';
import Permissions from './pages/Permissions';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Checklists from './pages/Checklists';
import Implementations from './pages/Implementations';
import ImplementationDetail from './pages/Implementations/Detail';
import ServiceOrders from './pages/ServiceOrders';
import ServiceOrderDetail from './pages/ServiceOrders/Detail';
import Calendar from './pages/Calendar';
import TaskDetail from './pages/Tasks/Detail';
import SprintPage from './pages/Sprint';
import RepositoryPage from './pages/Repository';
import BackupPage from './pages/Backup';
import TemplatesPage from './pages/Templates';
import ChatConfigPage from './pages/ChatConfig';
import ChatPage from './pages/Chat';
import PowerBIPage from './pages/PowerBI';
import ProfilePage from './pages/Profile';

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        Carregando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// App Routes
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="teams" element={<Teams />} />
        <Route path="roles" element={<Roles />} />
        <Route path="permissions" element={<Permissions />} />
        <Route path="clients" element={<Clients />} />
        <Route path="products" element={<Products />} />
        <Route path="checklists" element={<Checklists />} />
        <Route path="implementations" element={<Implementations />} />
        <Route path="implementations/:id" element={<ImplementationDetail />} />
        <Route path="service-orders" element={<ServiceOrders />} />
        <Route path="service-orders/:id" element={<ServiceOrderDetail />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="tasks/:id" element={<TaskDetail />} />
        <Route path="sprint" element={<SprintPage />} />
        <Route path="repository" element={<RepositoryPage />} />
        <Route path="backup" element={<BackupPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="chat-config" element={<ChatConfigPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="powerbi" element={<PowerBIPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={ptBR}
      theme={{
        token: {
          colorPrimary: '#1064fe',
          borderRadius: 8,
          fontFamily: "'Manrope', sans-serif",
          colorBgLayout: '#f8f9fc',
        },
        components: {
          Layout: {
            siderBg: '#0f172a',
            headerBg: 'rgba(255, 255, 255, 0.8)',
          },
          Card: {
            borderRadiusLG: 16,
            boxShadowTertiary: '0 4px 20px -2px rgba(16, 100, 254, 0.08)',
          },
          Button: {
            borderRadius: 8,
            controlHeight: 40,
          },
          Input: {
            borderRadius: 12,
            controlHeight: 42,
            colorBgContainer: '#f8fafc',
          }
        }
      }}
    >
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
