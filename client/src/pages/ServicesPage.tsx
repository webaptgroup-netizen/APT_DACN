import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  Image
} from 'antd';
import type { UploadProps } from 'antd';
import { useCallback, useEffect, useState } from 'react';
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

  // 📦 Load danh sách dịch vụ
  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/services');
      setServices(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  // 💾 Thêm mới dịch vụ
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

  // ❌ Xóa dịch vụ
  const handleDelete = async (service: Service) => {
    try {
      await api.delete(`/services/${service.ID}`);
      message.success('Đã xóa dịch vụ');
      await loadServices();
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Không thể xóa dịch vụ');
    }
  };

  // 📝 Cư dân đăng ký dịch vụ
  const handleRegister = async (id: number) => {
    try {
      await api.post(`/services/${id}/register`);
      message.success('Đăng ký dịch vụ thành công. Vui lòng kiểm tra hóa đơn.');
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Không thể đăng ký dịch vụ');
    }
  };

  // 🖼️ Upload ảnh lên Supabase
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
      message.success('Đã tải ảnh lên Supabase');
      return false;
    }
  };

  // 👀 Hiển thị giao diện cư dân
  const renderResidentView = () => {
    if (loading) {
      return (
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map((idx) => (
            <Col xs={24} md={12} xl={8} key={idx}>
              <Card loading style={{ borderRadius: 20, height: '100%' }} />
            </Col>
          ))}
        </Row>
      );
    }

    if (!services.length) {
      return <Empty description="Chưa có dịch vụ khả dụng" />;
    }

    return (
      <Row gutter={[16, 16]}>
        {services.map((service) => (
          <Col xs={24} md={12} xl={8} key={service.ID}>
            <Card
              style={{ borderRadius: 20, height: '100%' }}
              title={service.TenDichVu}
              cover={
                service.HinhAnh ? (
                  <Image
                    src={service.HinhAnh}
                    height={180}
                    style={{ objectFit: 'cover', borderRadius: '20px 20px 0 0' }}
                    preview={false}
                  />
                ) : null
              }
            >
              <Typography.Paragraph type="secondary">
                {service.MoTa ?? 'Dịch vụ cao cấp cho cư dân.'}
              </Typography.Paragraph>
              <Tag color="blue" style={{ marginBottom: 12 }}>
                {service.Gia.toLocaleString('vi-VN')} ₫
              </Tag>
              <div>
                <Button type="primary" onClick={() => handleRegister(service.ID)}>
                  Đăng ký ngay
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  // 🧑‍💼 Nếu không phải quản lý → xem giao diện cư dân
  if (!isManager) {
    return (
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <div className="page-header">
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Dịch vụ cư dân
            </Typography.Title>
            <Typography.Text type="secondary">
              Đặt lịch vệ sinh, sửa chữa, chăm sóc cảnh quan... chỉ với một chạm.
            </Typography.Text>
          </div>
        </div>
        {renderResidentView()}
      </Space>
    );
  }

  // 👩‍💼 Giao diện quản lý
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
            render: (val: number) => (
              <Tag color="blue">{val.toLocaleString('vi-VN')} ₫</Tag>
            )
          },
          {
            title: 'Hình ảnh',
            dataIndex: 'HinhAnh',
            key: 'HinhAnh',
            render: (url?: string) =>
              url ? (
                <Image
                  src={url}
                  width={64}
                  height={48}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                />
              ) : (
                '-'
              )
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
          <Form.Item
            label="Tên dịch vụ"
            name="TenDichVu"
            rules={[{ required: true, message: 'Nhập tên dịch vụ' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Giá (VND)"
            name="Gia"
            rules={[{ required: true, message: 'Nhập giá dịch vụ' }]}
          >
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
