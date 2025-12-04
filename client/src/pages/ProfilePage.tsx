import { Alert, Avatar, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import api from '../api/client';
import Uploader from '../components/Uploader';
import { useAuthStore } from '../store/useAuthStore';

const ProfilePage = () => {
  const { user, fetchProfile } = useAuthStore();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [successMsg, setSuccessMsg] = useState<string>();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!user) {
      void fetchProfile();
      return;
    }
    profileForm.setFieldsValue({
      hoTen: user.hoTen,
      soDienThoai: user.soDienThoai,
      hinhAnh: user.hinhAnh
    });
    setAvatarUrl(user.hinhAnh);
  }, [user, profileForm, fetchProfile]);

  const handleAvatarUploaded = async (url: string) => {
    setAvatarUrl(url);
    profileForm.setFieldsValue({ hinhAnh: url });
    try {
      await api.put('/auth/profile', { hinhAnh: url });
      setSuccessMsg('Đã cập nhật ảnh đại diện.');
      await fetchProfile();
    } catch (err) {
      console.error('Failed to update avatar', err);
      setSuccessMsg('Không cập nhật được ảnh đại diện. Vui lòng thử lại.');
    }
  };

  const handleUpdateProfile = async (values: { hoTen?: string; soDienThoai?: string; hinhAnh?: string }) => {
    await api.put('/auth/profile', { ...values, hinhAnh: avatarUrl });
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
        <Space align="center" size={16} style={{ marginBottom: 16 }}>
          <Avatar src={avatarUrl} size={72}>
            {user?.hoTen?.charAt(0)?.toUpperCase()}
          </Avatar>
          <div>
            <Typography.Text type="secondary">Ảnh đại diện</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Uploader
                folder="avatars"
                onUploaded={(url) => {
                  void handleAvatarUploaded(url);
                }}
              />
            </div>
          </div>
        </Space>

        <Form layout="vertical" form={profileForm} onFinish={handleUpdateProfile}>
          <Form.Item label="Họ tên" name="hoTen">
            <Input placeholder="Tên của bạn" />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="soDienThoai">
            <Input placeholder="09xx xxx xxx" />
          </Form.Item>
          <Form.Item name="hinhAnh" hidden>
            <Input />
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

