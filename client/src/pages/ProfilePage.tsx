import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/useAuthStore';

const ProfilePage = () => {
  const { user, fetchProfile } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [successMsg, setSuccessMsg] = useState<string>();

  useEffect(() => {
    if (!user) {
      void fetchProfile();
    } else {
      profileForm.setFieldsValue({
        hoTen: user.hoTen,
        soDienThoai: user.soDienThoai
      });
    }
  }, [user, profileForm, fetchProfile]);

  const handleUpdateProfile = async (values: { hoTen?: string; soDienThoai?: string }) => {
    await api.put('/auth/profile', values);
    setSuccessMsg('Đã cập nhật hồ sơ.');
    await fetchProfile();
  };

  const handleChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
    await api.post('/auth/change-password', values);
    passwordForm.resetFields();
    setSuccessMsg('Đã đổi mật khẩu thành công.');
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>
          Hồ sơ cá nhân
        </Typography.Title>
      </div>
      {successMsg && <Alert type="success" message={successMsg} closable onClose={() => setSuccessMsg(undefined)} />}
    <Card title="Thông tin cư dân" variant="borderless">
        <Form layout="vertical" form={profileForm} onFinish={handleUpdateProfile}>
          <Form.Item label="Họ tên" name="hoTen">
            <Input placeholder="Tên của bạn" />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="soDienThoai">
            <Input placeholder="09xx xxx xxx" />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Cập nhật
          </Button>
        </Form>
      </Card>
    <Card title="Đổi mật khẩu" variant="borderless">
          <Form layout="vertical" form={passwordForm} onFinish={handleChangePassword}>
            <Form.Item label="Mật khẩu hiện tại" name="currentPassword" rules={[{ required: true }]}>
              <Input.Password placeholder="*******" />
            </Form.Item>
            <Form.Item label="Mật khẩu mới" name="newPassword" rules={[{ required: true, min: 8 }]}>
              <Input.Password placeholder=">= 8 ký tự" />
            </Form.Item>
            <Button type="default" htmlType="submit">
              Đổi mật khẩu
            </Button>
          </Form>
      </Card>
    </Space>
  );
};

export default ProfilePage;
