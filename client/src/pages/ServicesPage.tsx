import { App as AntdApp, Button, Form, Input, InputNumber, Modal, Popconfirm, Table, Tag, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Service } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuthStore();
  const { message } = AntdApp.useApp();
  const isManager = user?.role === 'Ban quan ly';

  const loadServices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/services');
      setServices(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadServices();
  }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      await api.post('/services', values);
      message.success('Đã lưu dịch vụ');
      setModalOpen(false);
      form.resetFields();
      await loadServices();
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Không thể lưu dịch vụ');
    }
  };

  const handleDelete = async (service: Service) => {
    try {
      await api.delete(`/services/${service.ID}`);
      message.success('Đã xóa dịch vụ');
      await loadServices();
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Không thể xóa');
    }
  };

  const handleRegister = async (id: number) => {
    try {
      await api.post(`/services/${id}/register`);
      message.success('Đăng ký dịch vụ thành công. Vui lòng kiểm tra hóa đơn.');
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Không thể đăng ký');
    }
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
        folder: 'services',
        fileName: file.name
      });
      form.setFieldsValue({ HinhAnh: data.url });
      message.success('Đã tải ảnh');
      return false;
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Dịch vụ tiện ích</h2>
        {isManager && (
          <Button type="primary" onClick={() => setModalOpen(true)}>
            Thêm dịch vụ
          </Button>
        )}
      </div>

      <Table
        rowKey="ID"
        dataSource={services}
        loading={loading}
        bordered
        columns={[
          { title: 'Tên dịch vụ', dataIndex: 'TenDichVu', key: 'TenDichVu' },
          { title: 'Mô tả', dataIndex: 'MoTa', key: 'MoTa' },
          {
            title: 'Giá (VND)',
            dataIndex: 'Gia',
            key: 'Gia',
            render: (val: number) => <Tag color="blue">{val.toLocaleString('vi-VN')} đ</Tag>
          },
          {
            title: 'Hình ảnh',
            dataIndex: 'HinhAnh',
            key: 'HinhAnh',
            render: (url?: string) => (url ? <a href={url}>Xem</a> : '-')
          },
          {
            title: 'Thao tác',
            key: 'actions',
            render: (_, record) =>
              isManager ? (
                <Popconfirm title="Xóa dịch vụ?" onConfirm={() => handleDelete(record)}>
                  <Button type="link" danger>
                    Xóa
                  </Button>
                </Popconfirm>
              ) : (
                <Button type="link" onClick={() => handleRegister(record.ID)}>
                  Đăng ký
                </Button>
              )
          }
        ]}
      />

      <Modal
        title="Thêm dịch vụ"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Lưu"
      >
        <Form layout="vertical" form={form}>
          <Form.Item label="Tên dịch vụ" name="TenDichVu" rules={[{ required: true, message: 'Nhập tên dịch vụ' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Giá (VND)" name="Gia" rules={[{ required: true, message: 'Nhập giá dịch vụ' }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={10000} />
          </Form.Item>
          <Form.Item label="Mô tả" name="MoTa">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Hình ảnh" name="HinhAnh">
            <Input placeholder="URL ảnh" />
          </Form.Item>
          <Upload {...uploadProps}>
            <Button type="dashed">Tải ảnh lên Supabase</Button>
          </Upload>
        </Form>
      </Modal>
    </>
  );
};

export default ServicesPage;
