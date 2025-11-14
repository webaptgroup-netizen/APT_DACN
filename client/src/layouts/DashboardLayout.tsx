import {
  ApartmentOutlined,
  BankOutlined,
  BellOutlined,
  ContainerOutlined,
  CustomerServiceOutlined,
  FileTextOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Avatar, Button, Layout, Menu, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const { Header, Content } = Layout;

const navItems = [
  { key: '/dashboard', icon: <HomeOutlined />, label: 'Tổng quan' },
  { key: '/buildings', icon: <BankOutlined />, label: 'Chung cư' },
  { key: '/apartments', icon: <ApartmentOutlined />, label: 'Căn hộ' },
  { key: '/residents', icon: <TeamOutlined />, label: 'Cư dân' },
  { key: '/services', icon: <CustomerServiceOutlined />, label: 'Dịch vụ' },
  { key: '/invoices', icon: <FileTextOutlined />, label: 'Hóa đơn' },
  { key: '/news', icon: <ContainerOutlined />, label: 'Tin tức' },
  { key: '/complaints', icon: <BellOutlined />, label: 'Phản ánh' },
  { key: '/profile', icon: <SettingOutlined />, label: 'Tài khoản' }
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(true);

  const selectedKeys = useMemo(() => {
    const match = navItems.find((item) => location.pathname.startsWith(item.key));
    return match ? [match.key] : ['/dashboard'];
  }, [location.pathname]);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else {
      navigate(key);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Toggle Button - Fixed position */}
      <Button
        type="primary"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'fixed',
          top: 20,
          left: collapsed ? 20 : 260,
          zIndex: 1001,
          width: 48,
          height: 48,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
          border: 'none',
          boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          fontSize: 20
        }}
      />

      {/* Sidebar - Fixed with glass effect */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: collapsed ? 0 : 240,
          zIndex: 1000,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: 240,
            height: '100%',
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Logo Section */}
          <div style={{ 
            padding: '24px 16px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            marginTop: 60
          }}>
            <video
              src="https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/logo.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{ 
                width: 64, 
                height: 64,
                borderRadius: 12, 
                marginBottom: 12,
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            />
            <Space direction="vertical" size={4} style={{ textAlign: 'center' }}>
              <Typography.Title level={4} style={{ color: 'white', margin: 0, fontWeight: 600 }}>
                APT-CONNECT
              </Typography.Title>
              <Typography.Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                Chủ động vận hành khu dân cư
              </Typography.Text>
            </Space>
          </div>

          {/* Menu Section */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            <Menu
              mode="inline"
              theme="dark"
              selectedKeys={selectedKeys}
              onClick={handleMenuClick}
              items={navItems.map((item) => ({
                key: item.key,
                icon: item.icon,
                label: item.label
              }))}
              style={{ 
                marginTop: 16,
                background: 'transparent',
                border: 'none'
              }}
            />
          </div>

          {/* Logout Button */}
          <div style={{ padding: 16, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Button
              block
              icon={<LogoutOutlined />}
              onClick={() => handleMenuClick({ key: 'logout' })}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                height: 40
              }}
            >
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <Layout style={{ 
        marginLeft: 0,
        background: 'transparent',
        transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <Header
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '0 24px 0 88px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            position: 'sticky',
            top: 0,
            zIndex: 999
          }}
        >
          <Space>
            <ThunderboltOutlined style={{ color: '#faad14', fontSize: 20 }} />
            <Typography.Text strong style={{ fontSize: 16 }}>
              Mạng quản lý cư dân số
            </Typography.Text>
          </Space>
          <Space size="middle">
            <div style={{ textAlign: 'right' }}>
              <Typography.Text strong>{user?.hoTen ?? '---'}</Typography.Text>
              <br />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {user?.role ?? 'Khách'}
              </Typography.Text>
            </div>
            <Avatar 
              size={42}
              style={{ 
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: '2px solid rgba(59, 130, 246, 0.2)'
              }}
            >
              {user?.hoTen?.[0]?.toUpperCase() ?? 'A'}
            </Avatar>
          </Space>
        </Header>

        <Content style={{ padding: 24, minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;