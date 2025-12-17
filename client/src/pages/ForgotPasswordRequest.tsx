import { MailOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

const { Title, Paragraph, Text } = Typography;

const ForgotPasswordRequestPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const handleSubmit = async (values: { email: string }) => {
    try {
      setSubmitting(true);
      setError(undefined);
      await api.post('/auth/forgot-password', values);
      sessionStorage.setItem('apt-reset-email', values.email);
      message.success('Đã gửi mã xác nhận (nếu email tồn tại). Vui lòng kiểm tra email.');
      navigate('/forgot-password/verify', { state: { email: values.email } });
    } catch (err: unknown) {
      const maybeError = err as { response?: { data?: { message?: unknown } }; message?: unknown };
      setError(
        (typeof maybeError.response?.data?.message === 'string' ? maybeError.response?.data?.message : undefined) ??
          (typeof maybeError.message === 'string' ? maybeError.message : undefined) ??
          'Gửi yêu cầu thất bại'
      );
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
        padding: '2rem',
        background: 'linear-gradient(135deg,#0b1220,#0f172a)',
      }}
    >
      <Card
        style={{
          width: 420,
          padding: '32px 28px',
          borderRadius: 18,
          border: '2px solid rgba(255,255,255,0.5)',
          background: 'rgba(0,0,0,0.75)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          color: '#fff',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title
            level={3}
            style={{
              marginBottom: 0,
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,0.8)',
            }}
          >
            Quên mật khẩu
          </Title>
          <Paragraph style={{ color: '#cbd5e1', marginTop: 6, fontWeight: 500 }}>
            Nhập email để nhận mã xác nhận 6 số
          </Paragraph>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{
              marginBottom: 16,
              borderRadius: 8,
              background: 'rgba(220,38,38,0.2)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#fecaca',
            }}
          />
        )}

        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label={
              <Text strong style={{ color: 'white' }}>
                Email
              </Text>
            }
            name="email"
            rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="you@example.com"
              size="large"
              style={{
                borderRadius: 8,
                background: 'rgba(255,255,255,0.95)',
                color: '#1e293b',
                border: '2px solid rgba(255,255,255,0.8)',
              }}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={submitting}
            style={{
              borderRadius: 8,
              background: 'linear-gradient(90deg,#60a5fa,#8b5cf6)',
              fontWeight: 600,
              border: 'none',
            }}
          >
            Gửi mã xác nhận
          </Button>
        </Form>

        <Paragraph style={{ textAlign: 'center', marginTop: 18, color: '#cbd5e1', fontWeight: 500 }}>
          <Link to="/login" style={{ color: '#93c5fd', fontWeight: 600 }}>
            Quay về đăng nhập
          </Link>
        </Paragraph>
      </Card>
    </div>
  );
};

export default ForgotPasswordRequestPage;

