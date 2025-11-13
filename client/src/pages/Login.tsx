import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const { Title, Paragraph, Text } = Typography;

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
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* === 4 video nền hiển thị song song ngang === */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
        }}
      >
        {[
          'https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/generated_video%20(1).mp4',
          'https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/generated_video%20(2).mp4',
          'https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/generated_video%20(3).mp4',
          'https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/generated_video.mp4',
        ].map((src, i) => (
          <video
            key={i}
            src={src}
            autoPlay
            muted
            loop
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ))}
      </div>

      {/* Không có overlay mờ — nền rõ hoàn toàn */}

      {/* Form đăng nhập */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          padding: '2rem',
        }}
      >
        <Card
          style={{
            width: 420,
            padding: '32px 28px',
            borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.4)',
            background: 'rgba(255,255,255,0.25)', // trong suốt nhẹ
            boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
            backdropFilter: 'blur(6px)', // blur nhẹ để tách text khỏi nền mà vẫn rõ clip
            color: '#fff',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            {/* video logo */}
            <video
              src="https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/logo.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{
                width: 68,
                height: 'auto',
                marginBottom: 14,
                borderRadius: 10,
              }}
            />
            <Title
              level={3}
              style={{
                marginBottom: 0,
                color: 'white',
                letterSpacing: 0.5,
                textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              }}
            >
              Chào mừng trở lại 👋
            </Title>
            <Paragraph
              style={{
                color: '#f1f5f9',
                marginTop: 6,
                textShadow: '0 1px 6px rgba(0,0,0,0.6)',
              }}
            >
              Đăng nhập để quản lý cư dân và dịch vụ
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
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
              }}
            />
          )}

          <Form layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label={<Text strong style={{ color: 'white' }}>Email</Text>}
              name="email"
              rules={[{ required: true, message: 'Vui lòng nhập email' }]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#e2e8f0' }} />}
                placeholder="you@example.com"
                size="large"
                style={{
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.25)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.4)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              />
            </Form.Item>

            <Form.Item
              label={<Text strong style={{ color: 'white' }}>Mật khẩu</Text>}
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#e2e8f0' }} />}
                placeholder="••••••••"
                size="large"
                style={{
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.25)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.4)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
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
                letterSpacing: 0.3,
                boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                color: '#fff',
              }}
            >
              Đăng nhập
            </Button>
          </Form>

          <Paragraph
            style={{
              textAlign: 'center',
              marginTop: 20,
              fontSize: 15,
              color: '#f1f5f9',
              textShadow: '0 1px 6px rgba(0,0,0,0.6)',
            }}
          >
            Chưa có tài khoản?{' '}
            <Link
              to="/register"
              style={{
                color: '#93c5fd',
                fontWeight: 600,
              }}
            >
              Đăng ký cư dân
            </Link>
          </Paragraph>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
