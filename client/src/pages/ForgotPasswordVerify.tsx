import { NumberOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';

const { Title, Paragraph, Text } = Typography;

const ForgotPasswordVerifyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const email = useMemo(() => {
    const fromState = (location.state as { email?: unknown } | null)?.email;
    if (typeof fromState === 'string' && fromState) return fromState;
    const fromStorage = sessionStorage.getItem('apt-reset-email');
    return fromStorage || '';
  }, [location.state]);

  const handleSubmit = async (values: { code: string }) => {
    try {
      setSubmitting(true);
      setError(undefined);
      const { data } = await api.post('/auth/forgot-password/verify', { email, code: values.code });
      const resetToken = typeof data?.resetToken === 'string' ? data.resetToken : '';
      if (!resetToken) throw new Error('Không nhận được resetToken');
      sessionStorage.setItem('apt-reset-token', resetToken);
      message.success('Xác nhận thành công. Vui lòng đặt mật khẩu mới.');
      navigate('/forgot-password/reset', { state: { email, resetToken } });
    } catch (err: unknown) {
      const maybeError = err as { response?: { data?: { message?: unknown } }; message?: unknown };
      setError(
        (typeof maybeError.response?.data?.message === 'string' ? maybeError.response?.data?.message : undefined) ??
          (typeof maybeError.message === 'string' ? maybeError.message : undefined) ??
          'Xác nhận thất bại'
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
          <Title level={3} style={{ marginBottom: 0, color: 'white' }}>
            Nhập mã xác nhận
          </Title>
          <Paragraph style={{ color: '#cbd5e1', marginTop: 6, fontWeight: 500 }}>
            Mã 6 số đã được gửi đến: <Text style={{ color: '#93c5fd' }}>{email || '(chưa có email)'}</Text>
          </Paragraph>
        </div>

        {!email && (
          <Alert
            type="warning"
            message="Vui lòng nhập email trước"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
        )}

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

        <Form layout="vertical" onFinish={handleSubmit} disabled={!email}>
          <Form.Item
            label={
              <Text strong style={{ color: 'white' }}>
                Mã xác nhận
              </Text>
            }
            name="code"
            rules={[
              { required: true, message: 'Vui lòng nhập mã' },
              { pattern: /^\d{6}$/, message: 'Mã phải gồm 6 chữ số' },
            ]}
          >
            <Input
              prefix={<NumberOutlined />}
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              size="large"
              style={{
                borderRadius: 8,
                background: 'rgba(255,255,255,0.95)',
                color: '#1e293b',
                border: '2px solid rgba(255,255,255,0.8)',
                letterSpacing: 6,
                textAlign: 'center',
                fontWeight: 700,
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
            Xác nhận
          </Button>
        </Form>

        <Paragraph style={{ textAlign: 'center', marginTop: 18, color: '#cbd5e1', fontWeight: 500 }}>
          <Link to="/forgot-password" style={{ color: '#93c5fd', fontWeight: 600 }}>
            Gửi lại mã
          </Link>
          {' · '}
          <Link to="/login" style={{ color: '#93c5fd', fontWeight: 600 }}>
            Về đăng nhập
          </Link>
        </Paragraph>
      </Card>
    </div>
  );
};

export default ForgotPasswordVerifyPage;

