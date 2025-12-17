import {
  App as AntdApp,
  Avatar,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import type { UserSummary, UserRole } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const roleOptions: { label: string; value: UserRole }[] = [
  { label: 'Khách', value: 'Khach' },
  { label: 'Cư dân', value: 'Cu dan' },
  { label: 'Ban quản lý', value: 'Ban quan ly' }
];

const roleColorMap: Record<UserRole, string> = {
  Khach: 'default',
  'Cu dan': 'blue',
  'Ban quan ly': 'gold'
};

const UsersPage = () => {
  const { user } = useAuthStore();
  const { message } = AntdApp.useApp();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const isManager = user?.role === 'Ban quan ly';

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<UserSummary[]>('/auth/users');
      setUsers(data);
    } catch (err: unknown) {
      const maybeError = err as {
        message?: unknown;
        response?: { data?: { message?: unknown } };
      };

      const messageText =
        (typeof maybeError.response?.data?.message === 'string'
          ? maybeError.response?.data?.message
          : undefined) ??
        (typeof maybeError.message === 'string' ? maybeError.message : undefined) ??
        'Không thể tải danh sách người dùng';

      message.error(messageText);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManager) {
      void loadUsers();
    }
  }, [isManager]);

  const handleChangeRole = async (record: UserSummary, role: UserRole) => {
    try {
      await api.post('/auth/role', { userId: record.ID, role });
      message.success('Đã cập nhật vai trò');
      await loadUsers();
    } catch (err: unknown) {
      const maybeError = err as {
        message?: unknown;
        response?: { data?: { message?: unknown } };
      };

      const messageText =
        (typeof maybeError.response?.data?.message === 'string'
          ? maybeError.response?.data?.message
          : undefined) ??
        (typeof maybeError.message === 'string' ? maybeError.message : undefined) ??
        'Không thể cập nhật vai trò';

      message.error(messageText);
    }
  };

  const handleDelete = async (record: UserSummary) => {
    try {
      await api.delete(`/auth/users/${record.ID}`);
      message.success('Đã xóa người dùng');
      await loadUsers();
    } catch (err: unknown) {
      const maybeError = err as {
        message?: unknown;
        response?: { data?: { message?: unknown } };
      };

      const messageText =
        (typeof maybeError.response?.data?.message === 'string'
          ? maybeError.response?.data?.message
          : undefined) ??
        (typeof maybeError.message === 'string' ? maybeError.message : undefined) ??
        'Không thể xóa người dùng';

      message.error(messageText);
    }
  };

  const openModal = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const { data } = await api.post('/auth/register', {
        hoTen: values.hoTen,
        email: values.email,
        password: values.password,
        soDienThoai: values.soDienThoai
      });

      const desiredRole: UserRole = values.role;
      if (desiredRole && desiredRole !== 'Khach') {
        await api.post('/auth/role', { userId: data.user.id, role: desiredRole });
      }

      message.success('Đã tạo người dùng mới');
      setModalOpen(false);
      await loadUsers();
    } catch (err: unknown) {
      const maybeError = err as {
        message?: unknown;
        response?: { data?: { message?: unknown } };
      };

      const messageText =
        (typeof maybeError.response?.data?.message === 'string'
          ? maybeError.response?.data?.message
          : undefined) ??
        (typeof maybeError.message === 'string' ? maybeError.message : undefined) ??
        'Không thể tạo người dùng';

      message.error(messageText);
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<UserSummary> = useMemo(
    () => [
      {
        title: 'Ảnh',
        dataIndex: 'HinhAnh',
        key: 'HinhAnh',
        width: 72,
        render: (_: unknown, record) => (
          <Avatar src={record.HinhAnh}>
            {record.HoTen?.charAt(0)?.toUpperCase() ?? '?'}
          </Avatar>
        )
      },
      {
        title: 'Họ tên',
        dataIndex: 'HoTen',
        key: 'HoTen'
      },
      {
        title: 'Email',
        dataIndex: 'Email',
        key: 'Email'
      },
      {
        title: 'Số điện thoại',
        dataIndex: 'SoDienThoai',
        key: 'SoDienThoai',
        render: (val?: string) => val ?? '---'
      },
      {
        title: 'Vai trò',
        dataIndex: 'LoaiNguoiDung',
        key: 'LoaiNguoiDung',
        render: (role: UserRole, record) => (
          <Space>
            <Tag color={roleColorMap[role]}>{role}</Tag>
            <Select<UserRole>
              size="small"
              value={role}
              style={{ minWidth: 130 }}
              onChange={(value) => handleChangeRole(record, value)}
              options={roleOptions}
            />
          </Space>
        )
      },
      {
        title: 'Thao tác',
        key: 'actions',
        render: (_, record) =>
          record.Email === user?.email ? null : (
            <Popconfirm
              title="Xóa người dùng này?"
              onConfirm={() => handleDelete(record)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button type="link" danger>
                Xóa
              </Button>
            </Popconfirm>
          )
      }
    ],
    [user?.email]
  );

  if (!isManager) {
    return (
      <Typography.Paragraph>
        Chức năng này chỉ dành cho tài khoản <strong>Ban quản lý</strong>.
      </Typography.Paragraph>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3} style={{ margin: 0, color: '#1677ff' }}>
            Quản lý người dùng
          </Typography.Title>
          <Typography.Text type="secondary">
            Xem, tạo mới, phân quyền và xóa tài khoản hệ thống.
          </Typography.Text>
        </div>
        <Button type="primary" onClick={openModal}>
          Thêm người dùng
        </Button>
      </div>

      <Table<UserSummary> rowKey="ID" dataSource={users} columns={columns} loading={loading} bordered />

      <Modal
        title="Thêm người dùng"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Lưu"
        confirmLoading={saving}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Họ tên"
            name="hoTen"
            rules={[{ required: true, message: 'Nhập họ tên' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Nhập email' }]}
          >
            <Input type="email" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Nhập mật khẩu' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="soDienThoai">
            <Input />
          </Form.Item>
          <Form.Item
            label="Vai trò"
            name="role"
            initialValue="Khach"
            rules={[{ required: true, message: 'Chọn vai trò' }]}
          >
            <Select options={roleOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default UsersPage;

