import {
  ApartmentOutlined,
  BankOutlined,
  BellOutlined,
  ContainerOutlined,
  CustomerServiceOutlined,
  FileTextOutlined,
  HomeOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Avatar, Button, Layout, Menu, Space, Typography } from 'antd';
import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const { Header, Sider, Content } = Layout;

const navItems = [
  { key: '/dashboard', icon: <HomeOutlined />, label: 'Tong quan' },
  { key: '/buildings', icon: <BankOutlined />, label: 'Chung cu' },
  { key: '/apartments', icon: <ApartmentOutlined />, label: 'Can ho' },
  { key: '/residents', icon: <TeamOutlined />, label: 'Cu dan' },
  { key: '/services', icon: <CustomerServiceOutlined />, label: 'Dich vu' },
  { key: '/invoices', icon: <FileTextOutlined />, label: 'Hoa don' },
  { key: '/news', icon: <ContainerOutlined />, label: 'Tin tuc' },
  { key: '/complaints', icon: <BellOutlined />, label: 'Phan anh' },
  { key: '/profile', icon: <SettingOutlined />, label: 'Tai khoan' }
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

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
      <Sider
        breakpoint="lg"
        collapsedWidth={80}
        style={{ background: '#0f172a' }}
        width={240}
      >
        <div style={{ padding: '20px 16px', color: 'white' }}>
          <Space direction="vertical" size={4}>
            <Typography.Title level={4} style={{ color: 'white', margin: 0 }}>
              APT-CONNECT
            </Typography.Title>
            <Typography.Text style={{ color: 'rgba(255,255,255,0.7)' }}>
              Chá»§ Ä‘á»™ng váº­n hÃ nh khu dÃ¢n cÆ°
            </Typography.Text>
          </Space>
        </div>
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
        />
        <div style={{ padding: 16 }}>
          <Button
            block
            icon={<LogoutOutlined />}
            onClick={() => handleMenuClick({ key: 'logout' })}
          >
            ÄÄƒng xuáº¥t
          </Button>
        </div>
      </Sider>
      <Layout style={{ background: '#f5f6fa' }}>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Space>
            <ThunderboltOutlined style={{ color: '#faad14' }} />
            <Typography.Text>Máº¡ng quáº£n lÃ½ cÆ° dÃ¢n sá»‘</Typography.Text>
          </Space>
          <Space size="middle">
            <div style={{ textAlign: 'right' }}>
              <Typography.Text strong>{user?.hoTen ?? '---'}</Typography.Text>
              <br />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {user?.role ?? 'KhÃ¡ch'}
              </Typography.Text>
            </div>
            <Avatar style={{ background: '#2563eb' }}>
              {user?.hoTen?.[0]?.toUpperCase() ?? 'A'}
            </Avatar>
          </Space>
        </Header>
        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;

