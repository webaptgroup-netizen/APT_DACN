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
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import type { Building, Resident, Service } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const ServicesPage = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [searchText, setSearchText] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [resident, setResident] = useState<Resident | null>(null);
  const [residentBuilding, setResidentBuilding] = useState<Building | null>(null);
  const [form] = Form.useForm();
  const { user } = useAuthStore();
  const { message } = AntdApp.useApp();
  const isManager = user?.role === 'Ban quan ly';

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

  useEffect(() => {
    if (isManager) {
      return;
    }

    const loadResidentInfo = async () => {
      try {
        const { data } = await api.get<Resident[]>('/residents');
        if (Array.isArray(data) && data.length > 0) {
          const current = data[0];
          setResident(current);

          if (current.ID_ChungCu) {
            try {
              const buildingRes = await api.get<Building>(`/buildings/${current.ID_ChungCu}`);
              setResidentBuilding(buildingRes.data);
            } catch {
              // ignore building load errors for confirmation UI
            }
          }
        }
      } catch {
        // ignore resident load errors for confirmation UI
      }
    };

    void loadResidentInfo();
  }, [isManager]);

  const openModal = (record?: Service) => {
    if (record) {
      setEditing(record);
      form.setFieldsValue({
        TenDichVu: record.TenDichVu,
        Gia: record.Gia,
        MoTa: record.MoTa,
        HinhAnh: record.HinhAnh
      });
    } else {
      setEditing(null);
      form.resetFields();
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await api.put(`/services/${editing.ID}`, values);
        message.success('Da cap nhat dich vu');
      } else {
        await api.post('/services', values);
        message.success('Da luu dich vu');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      await loadServices();
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
        'Khong the luu dich vu';

      message.error(messageText);
    }
  };

  const handleDelete = async (service: Service) => {
    try {
      await api.delete(`/services/${service.ID}`);
      message.success('Da xoa dich vu');
      await loadServices();
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
        'Khong the xoa dich vu';

      message.error(messageText);
    }
  };

  const openConfirmRegister = (service: Service) => {
    setSelectedService(service);
    setConfirmOpen(true);
  };

  const handleConfirmRegister = async () => {
    if (!selectedService) return;
    setConfirmLoading(true);
    try {
      await api.post(`/services/${selectedService.ID}/register`);
      message.success('Dang ky dich vu thanh cong. Vui long kiem tra hoa don.');
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
        'Khong the dang ky dich vu';

      message.error(messageText);
    } finally {
      setConfirmLoading(false);
      setConfirmOpen(false);
      setSelectedService(null);
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
        folder: 'DICHVU',
        fileName: file.name
      });
      form.setFieldsValue({ HinhAnh: data.url });
      message.success('Da tai anh len storage');
      return false;
    }
  };

  const filteredServices = useMemo(() => {
    if (!searchText.trim()) return services;
    const keyword = searchText.trim().toLowerCase();
    return services.filter((service) => {
      const name = service.TenDichVu?.toLowerCase() ?? '';
      const desc = service.MoTa?.toLowerCase() ?? '';
      return name.includes(keyword) || desc.includes(keyword);
    });
  }, [services, searchText]);

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

    if (!filteredServices.length) {
      return <Empty description="Chua co dich vu kha dung" />;
    }

    return (
      <Row gutter={[16, 16]}>
        {filteredServices.map((service) => (
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
                {service.MoTa ?? 'Dich vu danh cho cu dan.'}
              </Typography.Paragraph>
              <Tag color="blue" style={{ marginBottom: 12 }}>
                {service.Gia.toLocaleString('vi-VN')} d
              </Tag>
              <div>
                <Button type="primary" onClick={() => openConfirmRegister(service)}>
                  Dang ky ngay
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  if (!isManager) {
    return (
      <>
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <div className="page-header">
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>
                Dich vu cu dan
              </Typography.Title>
              <Typography.Text type="secondary">
                Dat lich ve sinh, sua chua, cham soc canh quan...
              </Typography.Text>
            </div>
            <Input.Search
              allowClear
              style={{ maxWidth: 320 }}
              placeholder="Tim theo ten, mo ta..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          {renderResidentView()}
        </Space>

        <Modal
          title={null}
          open={confirmOpen}
          onCancel={() => {
            setConfirmOpen(false);
            setSelectedService(null);
          }}
          onOk={handleConfirmRegister}
          okText="Xac nhan"
          confirmLoading={confirmLoading}
          centered
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #ec4899 100%)',
              padding: 1,
              borderRadius: 16
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: 14,
                padding: 16
              }}
            >
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                Xac nhan dang ky dich vu
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Vui long kiem tra ky thong tin duoi day truoc khi xac nhan.
              </Typography.Paragraph>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  marginBottom: 16
                }}
              >
                <div
                  style={{
                    background: '#eff6ff',
                    borderRadius: 12,
                    padding: 12
                  }}
                >
                  <Typography.Text strong style={{ color: '#1d4ed8' }}>
                    Thong tin cu dan
                  </Typography.Text>
                  <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                    <span style={{ display: 'block' }}>Ho ten: {user?.hoTen ?? 'Chua cap nhat'}</span>
                    <span style={{ display: 'block' }}>Email: {user?.email ?? 'Chua cap nhat'}</span>
                    <span style={{ display: 'block' }}>
                      So dien thoai: {user?.soDienThoai ?? 'Chua cap nhat'}
                    </span>
                  </Typography.Paragraph>
                </div>

                <div
                  style={{
                    background: '#fefce8',
                    borderRadius: 12,
                    padding: 12
                  }}
                >
                  <Typography.Text strong style={{ color: '#b45309' }}>
                    Can ho & chung cu
                  </Typography.Text>
                  <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                    <span style={{ display: 'block' }}>
                      Can ho: {resident?.CanHos?.MaCan ?? resident?.ID_CanHo ?? '---'}
                    </span>
                    <span style={{ display: 'block' }}>
                      Chung cu: {residentBuilding?.Ten ?? resident?.ID_ChungCu ?? '---'}
                    </span>
                  </Typography.Paragraph>
                </div>
              </div>

              <div
                style={{
                  background: '#f9fafb',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <Typography.Text strong>Dich vu dang ky</Typography.Text>
                  <Typography.Paragraph style={{ marginTop: 4, marginBottom: 0 }}>
                    {selectedService?.TenDichVu ?? '-'}
                  </Typography.Paragraph>
                </div>
                <Tag color="magenta" style={{ fontSize: 14, padding: '4px 10px', borderRadius: 999 }}>
                  {selectedService ? selectedService.Gia.toLocaleString('vi-VN') : '-'} d
                </Tag>
              </div>

              <Typography.Paragraph type="secondary" style={{ marginTop: 4 }}>
                Sau khi xac nhan, he thong se tao hoa don dich vu cho can ho cua ban. Vui long kiem tra tai muc hoa
                don.
              </Typography.Paragraph>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Dich vu tien ich
          </Typography.Title>
        </div>
        <Space>
          <Input.Search
            allowClear
            placeholder="Tim theo ten, mo ta..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ minWidth: 260 }}
          />
          <Button type="primary" onClick={() => openModal()}>
            Them dich vu
          </Button>
        </Space>
      </div>

      <Table
        rowKey="ID"
        dataSource={filteredServices}
        loading={loading}
        bordered
        columns={[
          { title: 'Ten dich vu', dataIndex: 'TenDichVu', key: 'TenDichVu' },
          { title: 'Mo ta', dataIndex: 'MoTa', key: 'MoTa' },
          {
            title: 'Gia (VND)',
            dataIndex: 'Gia',
            key: 'Gia',
            render: (val: number) => <Tag color="blue">{val.toLocaleString('vi-VN')} d</Tag>
          },
          {
            title: 'Hinh anh',
            dataIndex: 'HinhAnh',
            key: 'HinhAnh',
            render: (url?: string) =>
              url ? <Image src={url} width={64} height={48} style={{ objectFit: 'cover', borderRadius: 8 }} /> : '-'
          },
          {
            title: 'Thao tac',
            key: 'actions',
            render: (_, record) => (
              <Space>
                <Button type="link" onClick={() => openModal(record)}>
                  Sua
                </Button>
                <Popconfirm title="Xoa dich vu nay?" onConfirm={() => handleDelete(record)}>
                  <Button type="link" danger>
                    Xoa
                  </Button>
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />

      <Modal
        title={editing ? 'Sua dich vu' : 'Them dich vu'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onOk={handleSubmit}
        okText="Luu"
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Ten dich vu"
            name="TenDichVu"
            rules={[{ required: true, message: 'Nhap ten dich vu' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Gia (VND)"
            name="Gia"
            rules={[{ required: true, message: 'Nhap gia dich vu' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} step={10000} />
          </Form.Item>
          <Form.Item label="Mo ta" name="MoTa">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Hinh anh" name="HinhAnh">
            <Input placeholder="URL anh" />
          </Form.Item>
          <Upload {...uploadProps}>
            <Button type="dashed">Tai anh len storage</Button>
          </Upload>
        </Form>
      </Modal>
    </>
  );
};

export default ServicesPage;
