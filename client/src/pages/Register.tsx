import { IdcardOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, token, hydrated } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (hydrated && token) {
      navigate('/dashboard', { replace: true });
    }
  }, [hydrated, token, navigate]);

  const handleSubmit = async (values: { hoTen: string; email: string; password: string; soDienThoai?: string }) => {
    try {
      setSubmitting(true);
      setError(undefined);
      await register(values);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Đăng ký thất bại');
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
        background: 'linear-gradient(135deg,#ecfeff,#e0f2fe)'
      }}
    >
      <Card style={{ width: 480, boxShadow: '0 25px 60px rgba(2,132,199,0.15)' }}>
        <Typography.Title level={3} style={{ textAlign: 'center' }}>
          Đăng ký cư dân
        </Typography.Title>
        <Typography.Paragraph style={{ textAlign: 'center', marginBottom: 24 }}>
          Nhập thông tin cá nhân để kích hoạt tài khoản cư dân APT-CONNECT
        </Typography.Paragraph>
        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Họ tên" name="hoTen" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input prefix={<IdcardOutlined />} placeholder="Nguyễn Văn A" size="large" />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Nhập email' }]}>
            <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="soDienThoai">
            <Input prefix={<PhoneOutlined />} placeholder="09xx xxx xxx" size="large" />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="••••••" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
            Tạo tài khoản
          </Button>
        </Form>
        <Typography.Paragraph style={{ textAlign: 'center', marginTop: 16 }}>
          Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
        </Typography.Paragraph>
      </Card>
    </div>
  );
};

export default RegisterPage;
