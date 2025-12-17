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
  Image,
  Carousel
} from 'antd';
import type { UploadProps } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import type { Building } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const BuildingsPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);
  const [searchText] = useState('');
  const [form] = Form.useForm();
  const { user } = useAuthStore();
  const { message } = AntdApp.useApp();

  const isManager = user?.role === 'Ban quan ly';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/buildings');
      setData(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openModal = (record?: Building) => {
    if (record) {
      setEditing(record);
      form.setFieldsValue({
        ...record,
        ImageURLsText: record.URLs?.join(', ') ?? ''
      });
    } else {
      setEditing(null);
      form.resetFields();
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();

    const imageUrls: string[] = values.ImageURLsText
      ? values.ImageURLsText.split(',')
          .map((u: string) => u.trim())
          .filter((u: string) => !!u)
      : [];

    const payload = {
      Ten: values.Ten,
      DiaChi: values.DiaChi,
      ChuDauTu: values.ChuDauTu,
      NamXayDung: values.NamXayDung,
      SoTang: values.SoTang,
      MoTa: values.MoTa,
      ImageURLs: imageUrls
    };

    try {
      if (editing) {
        await api.put(`/buildings/${editing.ID}`, payload);
        message.success('Đã cập nhật chung cư');
      } else {
        await api.post('/buildings', payload);
        message.success('Đã thêm chung cư mới');
      }
      setModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const maybeError = err as {
        message?: unknown;
        response?: { data?: { message?: unknown } };
      };

      const messageText =
        (typeof maybeError.response?.data?.message === 'string' ? maybeError.response?.data?.message : undefined) ??
        (typeof maybeError.message === 'string' ? maybeError.message : undefined) ??
        'Không thể lưu chung cư';

      message.error(messageText);
    }
  };

  const handleDelete = async (record: Building) => {
    try {
      await api.delete(`/buildings/${record.ID}`);
      message.success('Đã xóa chung cư');
      await loadData();
    } catch (err: unknown) {
      const maybeError = err as {
        message?: unknown;
        response?: { data?: { message?: unknown } };
      };

      const messageText =
        (typeof maybeError.response?.data?.message === 'string' ? maybeError.response?.data?.message : undefined) ??
        (typeof maybeError.message === 'string' ? maybeError.message : undefined) ??
        'Không thể xóa';

      message.error(messageText);
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
    multiple: true,
    showUploadList: false,
    beforeUpload: async (file) => {
      const dataUrl = await fileToBase64(file as File);
      const { data } = await api.post('/storage/upload', {
        base64: dataUrl,
        folder: 'buildings',
        fileName: file.name
      });

      const current: string = form.getFieldValue('ImageURLsText') || '';
      const urls = current
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);
      urls.push(data.url);

      form.setFieldsValue({ ImageURLsText: urls.join(', ') });
      message.success('Đã tải ảnh chung cư lên');

      return false;
    }
  };

  const columns: ColumnsType<Building> = useMemo(() => {
    const base: ColumnsType<Building> = [
      {
        title: 'Hình ảnh',
        dataIndex: 'URLs',
        key: 'URLs',
        width: 120,
        render: (urls?: string[]) =>
          urls && urls.length > 0 ? (
            <Image
              src={urls[0]}
              width={80}
              height={60}
              style={{ objectFit: 'cover', borderRadius: 8 }}
            />
          ) : (
            '-'
          )
      },
      { title: 'Tên', dataIndex: 'Ten', key: 'Ten' },
      { title: 'Địa chỉ', dataIndex: 'DiaChi', key: 'DiaChi', width: 280 },
      { title: 'Chủ đầu tư', dataIndex: 'ChuDauTu', key: 'ChuDauTu' },
      {
        title: 'Năm hoàn thành',
        dataIndex: 'NamXayDung',
        key: 'NamXayDung',
        render: (val?: number) => (val ? <Tag color="magenta">{val}</Tag> : '-')
      },
      {
        title: 'Số tầng',
        dataIndex: 'SoTang',
        key: 'SoTang',
        render: (val?: number) => (val ? <Tag color="cyan">{val} tầng</Tag> : '-')
      }
    ];
    if (isManager) {
      base.push({
        title: 'Thao tác',
        key: 'actions',
        fixed: 'right',
        render: (_, record) => (
          <Space>
            <Button type="link" onClick={() => navigate(`/buildings/${record.ID}`)}>
              Xem chi tiết
            </Button>
            <Button type="link" onClick={() => openModal(record)}>
              Chỉnh sửa
            </Button>
            <Popconfirm title="Xóa chung cư này?" onConfirm={() => handleDelete(record)}>
              <Button type="link" danger>
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        )
      });
    }
    return base;
  }, [isManager, navigate]);

  const filteredData = useMemo(() => {
    if (!searchText.trim()) return data;
    const keyword = searchText.trim().toLowerCase();
    return data.filter((b) => {
      const name = b.Ten?.toLowerCase() ?? '';
      const address = b.DiaChi?.toLowerCase() ?? '';
      const owner = b.ChuDauTu?.toLowerCase() ?? '';
      return name.includes(keyword) || address.includes(keyword) || owner.includes(keyword);
    });
  }, [data, searchText]);

  const renderResidentView = () => {
    if (loading) {
      return (
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map((skeleton) => (
            <Col xs={24} md={12} xl={8} key={skeleton}>
              <Card loading style={{ borderRadius: 20, height: '100%' }} />
            </Col>
          ))}
        </Row>
      );
    }

    if (!filteredData.length) {
      return <Empty description="Chưa có dữ liệu chung cư" />;
    }

    return (
      <Row gutter={[16, 16]}>
        {filteredData.map((building) => (
          <Col xs={24} md={12} xl={8} key={building.ID}>
            <Card
              title={building.Ten}
              hoverable
              onClick={() => navigate(`/buildings/${building.ID}`)}
              style={{
                borderRadius: 20,
                height: '100%',
                boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                transition: '0.3s',
                background: 'linear-gradient(135deg, #fef6f0, #fff0f5)'
              }}
              headStyle={{ fontWeight: 600 }}
            >
              {building.URLs && building.URLs.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <Carousel dots autoplay autoplaySpeed={3000} pauseOnHover={false}>
                    {building.URLs.map((url, index) => (
                      <div key={index}>
                        <Image
                          src={url}
                          height={180}
                          style={{ width: '100%', objectFit: 'cover', borderRadius: 12 }}
                          preview={false}
                        />
                      </div>
                    ))}
                  </Carousel>
                </div>
              )}
              <Typography.Paragraph type="secondary">{building.DiaChi}</Typography.Paragraph>
              <Space size="small" wrap>
                {building.NamXayDung && <Tag color="magenta">{building.NamXayDung}</Tag>}
                {building.SoTang && <Tag color="cyan">{building.SoTang} tầng</Tag>}
                {building.ChuDauTu && <Tag color="volcano">{building.ChuDauTu}</Tag>}
              </Space>
              {building.MoTa && (
                <Typography.Paragraph style={{ marginTop: 12 }}>{building.MoTa}</Typography.Paragraph>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Danh sách chung cư
          </Typography.Title>
          <Typography.Text type="secondary">
            {isManager
              ? 'Quản lý dự án, tòa nhà và thông tin chung'
              : 'Xem nhanh thông tin dự án, vị trí và tiện ích để lựa chọn nơi ở phù hợp.'}
          </Typography.Text>
        </div>
        {isManager && (
          <Button
            type="primary"
            style={{ background: '#ff7f50', borderColor: '#ff7f50', fontWeight: 600 }}
            onClick={() => openModal()}
          >
            Thêm chung cư
          </Button>
        )}
      </div>

      {isManager ? (
        <Table
          rowKey="ID"
          loading={loading}
          dataSource={filteredData}
          columns={columns}
          bordered
          style={{ borderRadius: 20 }}
        />
      ) : (
        renderResidentView()
      )}

      <Modal
        title={editing ? 'Chỉnh sửa chung cư' : 'Thêm chung cư'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Lưu"
        okButtonProps={{ style: { background: '#2563eb', borderColor: '#2563eb' } }}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Tên"
            name="Ten"
            rules={[{ required: true, message: 'Nhập tên chung cư' }]}
          >
            <Input placeholder="APT Skyline" />
          </Form.Item>
          <Form.Item
            label="Địa chỉ"
            name="DiaChi"
            rules={[{ required: true, message: 'Nhập địa chỉ' }]}
          >
            <Input placeholder="123 Hoa Phượng, TP.HCM" />
          </Form.Item>
          <Form.Item label="Chủ đầu tư" name="ChuDauTu">
            <Input placeholder="PHQ Group" />
          </Form.Item>
          <Form.Item label="Năm xây dựng" name="NamXayDung">
            <InputNumber style={{ width: '100%' }} placeholder="2020" />
          </Form.Item>
          <Form.Item label="Số tầng" name="SoTang">
            <InputNumber style={{ width: '100%' }} placeholder="25" />
          </Form.Item>
          <Form.Item label="Mô tả" name="MoTa">
            <Input.TextArea rows={3} placeholder="Mô tả tiện ích, quy mô..." />
          </Form.Item>
          <Form.Item label="Ảnh (URL, cách nhau dấu phẩy)" name="ImageURLsText">
            <Input.TextArea rows={2} placeholder="https://... , https://..." />
          </Form.Item>
          <Upload {...uploadProps}>
            <Button type="dashed" style={{ marginTop: 8 }}>
              Tải ảnh lên Supabase
            </Button>
          </Upload>
        </Form>
      </Modal>
    </Space>
  );
};

export default BuildingsPage;
