import { LockOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/client';
import AuthBackground from '../components/AuthBackground';

const { Title, Paragraph, Text } = Typography;

const ForgotPasswordResetPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const { email, resetToken } = useMemo(() => {
    const state = location.state as { email?: unknown; resetToken?: unknown } | null;
    const email =
      (typeof state?.email === 'string' ? state.email : undefined) || sessionStorage.getItem('apt-reset-email') || '';
    const resetToken =
      (typeof state?.resetToken === 'string' ? state.resetToken : undefined) ||
      sessionStorage.getItem('apt-reset-token') ||
      '';
    return { email, resetToken };
  }, [location.state]);

  const handleSubmit = async (values: { newPassword: string; confirmPassword: string }) => {
    try {
      setSubmitting(true);
      setError(undefined);
      await api.post('/auth/forgot-password/reset', {
        resetToken,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      sessionStorage.removeItem('apt-reset-email');
      sessionStorage.removeItem('apt-reset-token');
      message.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const maybeError = err as { response?: { data?: { message?: unknown } }; message?: unknown };
      setError(
        (typeof maybeError.response?.data?.message === 'string' ? maybeError.response?.data?.message : undefined) ??
          (typeof maybeError.message === 'string' ? maybeError.message : undefined) ??
          'Đổi mật khẩu thất bại'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isReady = Boolean(resetToken);

  return (
    <AuthBackground>
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
            Đặt mật khẩu mới
          </Title>
          <Paragraph style={{ color: '#cbd5e1', marginTop: 6, fontWeight: 500 }}>
            Tài khoản: <Text style={{ color: '#93c5fd' }}>{email || '(không xác định)'}</Text>
          </Paragraph>
        </div>

        {!isReady && (
          <Alert
            type="warning"
            message="Phiên đặt lại mật khẩu không hợp lệ. Vui lòng xác nhận mã lại."
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

        <Form layout="vertical" onFinish={handleSubmit} disabled={!isReady}>
          <Form.Item
            label={
              <Text strong style={{ color: 'white' }}>
                Mật khẩu mới
              </Text>
            }
            name="newPassword"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }, { min: 8, message: 'Tối thiểu 8 ký tự' }]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              size="large"
              style={{
                borderRadius: 8,
                background: 'rgba(255,255,255,0.95)',
                color: '#1e293b',
                border: '2px solid rgba(255,255,255,0.8)',
              }}
            />
          </Form.Item>

          <Form.Item
            label={
              <Text strong style={{ color: 'white' }}>
                Nhập lại mật khẩu mới
              </Text>
            }
            name="confirmPassword"
            dependencies={['newPassword']}
            hasFeedback
            rules={[
              { required: true, message: 'Vui lòng nhập lại mật khẩu' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu nhập lại không khớp'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
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
            Cập nhật mật khẩu
          </Button>
        </Form>

        <Paragraph style={{ textAlign: 'center', marginTop: 18, color: '#cbd5e1', fontWeight: 500 }}>
          <Link to="/login" style={{ color: '#93c5fd', fontWeight: 600 }}>
            Về đăng nhập
          </Link>
        </Paragraph>
      </Card>
    </AuthBackground>
  );
};

export default ForgotPasswordResetPage;
