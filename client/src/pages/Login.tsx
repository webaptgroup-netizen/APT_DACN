import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, token, hydrated } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (hydrated && token) {
      navigate('/dashboard', { replace: true });
    }
  }, [hydrated, token, navigate]);

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      setSubmitting(true);
      setError(undefined);
      await login(values);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Đăng nhập thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg,#f5f7ff,#e0e7ff)'
      }}
    >
      <Card style={{ width: 420, boxShadow: '0 25px 60px rgba(37,99,235,0.15)' }}>
        <Typography.Title level={3} style={{ textAlign: 'center' }}>
          Đăng nhập APT-CONNECT
        </Typography.Title>
        <Typography.Paragraph style={{ textAlign: 'center', marginBottom: 24 }}>
          Quản lý cư dân và dịch vụ trên một nền tảng
        </Typography.Paragraph>
        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Nhập email' }]}>
            <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="••••••" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
            Đăng nhập
          </Button>
        </Form>
        <Typography.Paragraph style={{ textAlign: 'center', marginTop: 16 }}>
          Chưa có tài khoản? <Link to="/register">Đăng ký cư dân</Link>
        </Typography.Paragraph>
      </Card>
    </div>
  );
};

export default LoginPage;
