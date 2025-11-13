import { App as AntdApp, Button, Card, Form, Input, List, Select, Space, Tag, Upload } from 'antd';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Complaint } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const statusOptions = [
  { label: 'Chưa xử lý', value: 'Chua xu ly', color: 'red' },
  { label: 'Đang xử lý', value: 'Dang xu ly', color: 'orange' },
  { label: 'Đã xử lý', value: 'Da xu ly', color: 'green' }
];

const ComplaintsPage = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuthStore();
  const { message } = AntdApp.useApp();
  const isManager = user?.role === 'Ban quan ly';

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/complaints');
      setComplaints(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadComplaints();
  }, []);

  const handleSubmit = async (values: { NoiDung: string; HinhAnh?: string }) => {
    await api.post('/complaints', values);
    message.success('Đã gửi phản ánh');
    form.resetFields();
    await loadComplaints();
  };

  const handleUpdate = async (item: Complaint, payload: Partial<Complaint>) => {
    await api.patch(`/complaints/${item.ID}`, payload);
    message.success('Đã cập nhật phản ánh');
    await loadComplaints();
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const uploadProps: UploadProps = {
    showUploadList: false,
    beforeUpload: async (file) => {
      const dataUrl = await fileToBase64(file);
      const { data } = await api.post('/storage/upload', {
        base64: dataUrl,
        folder: 'complaints',
        fileName: file.name
      });
      form.setFieldsValue({ HinhAnh: data.url });
      message.success('Đã tải ảnh');
      return false;
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {user && (
        <Card title="Gửi phản ánh" bordered={false}>
          <Form layout="vertical" form={form} onFinish={handleSubmit}>
            <Form.Item label="Nội dung" name="NoiDung" rules={[{ required: true, message: 'Nhập nội dung phản ánh' }]}>
              <Input.TextArea rows={4} placeholder="Mô tả sự cố bạn gặp phải..." />
            </Form.Item>
            <Form.Item label="Ảnh minh chứng" name="HinhAnh">
              <Input placeholder="URL ảnh" />
            </Form.Item>
            <Upload {...uploadProps}>
              <Button type="dashed" style={{ marginBottom: 12 }}>
                Tải ảnh lên Supabase
              </Button>
            </Upload>
            <Button type="primary" htmlType="submit">
              Gửi phản ánh
            </Button>
          </Form>
        </Card>
      )}

      <Card title="Danh sách phản ánh" bordered={false}>
        <List
          loading={loading}
          dataSource={complaints}
          renderItem={(item) => (
            <List.Item
              actions={
                isManager
                  ? [
                      <Select
                        key="status"
                        options={statusOptions}
                        value={item.TrangThai}
                        style={{ width: 160 }}
                        onChange={(value) => handleUpdate(item, { TrangThai: value as Complaint['TrangThai'] })}
                      />,
                      <Button
                        key="reply"
                        onClick={() => {
                          const reply = window.prompt('Nhập phản hồi gửi cư dân', item.PhanHoi ?? '');
                          if (reply) handleUpdate(item, { PhanHoi: reply, TrangThai: 'Da xu ly' });
                        }}
                      >
                        Phản hồi
                      </Button>
                    ]
                  : undefined
              }
            >
              <List.Item.Meta
                title={
                  <Space>
                    <strong>{item.NguoiDungs?.HoTen ?? 'Ẩn danh'}</strong>
                    <Tag color={statusOptions.find((s) => s.value === item.TrangThai)?.color}>
                      {statusOptions.find((s) => s.value === item.TrangThai)?.label}
                    </Tag>
                  </Space>
                }
                description={dayjs(item.NgayGui).format('DD/MM/YYYY HH:mm')}
              />
              <div>
                <p>{item.NoiDung}</p>
                {item.HinhAnh && (
                  <a href={item.HinhAnh} target="_blank" rel="noreferrer">
                    Xem ảnh
                  </a>
                )}
                {item.PhanHoi && (
                  <Card size="small" style={{ marginTop: 12, background: '#f6ffed' }}>
                    <strong>Phản hồi:</strong>
                    <p style={{ marginBottom: 0 }}>{item.PhanHoi}</p>
                  </Card>
                )}
              </div>
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
};

export default ComplaintsPage;
