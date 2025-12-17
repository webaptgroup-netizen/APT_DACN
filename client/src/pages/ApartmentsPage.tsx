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
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  Carousel
} from 'antd';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import type { Apartment, Building } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const statusOptions = [
  { label: 'Đang bán', value: 'Dang ban', color: 'blue' },
  { label: 'Đã bán', value: 'Da ban', color: 'red' },
  { label: 'Cho thuê', value: 'Cho thue', color: 'green' },
  { label: 'Đã thuê', value: 'Da thue', color: 'orange' }
];

const ApartmentsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Apartment | null>(null);
  const [form] = Form.useForm();
  const { user } = useAuthStore();
  const { message } = AntdApp.useApp();
  const [filters, setFilters] = useState<{ buildingId?: number; status?: string }>({});
  const initialFiltersAppliedRef = useRef(false);

  const isManager = user?.role === 'Ban quan ly';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [aptRes, buildingRes] = await Promise.all([api.get('/apartments'), api.get('/buildings')]);
      setApartments(aptRes.data);
      setBuildings(buildingRes.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (initialFiltersAppliedRef.current) return;

    const buildingIdParam = searchParams.get('buildingId');
    const buildingNameParam = searchParams.get('buildingName') ?? searchParams.get('building');
    const statusParam = searchParams.get('status');

    if (!buildingIdParam && !buildingNameParam && !statusParam) {
      initialFiltersAppliedRef.current = true;
      return;
    }

    const nextFilters: { buildingId?: number; status?: string } = {};

    if (buildingIdParam) {
      const parsed = Number(buildingIdParam);
      if (Number.isFinite(parsed)) {
        nextFilters.buildingId = parsed;
      } else {
        initialFiltersAppliedRef.current = true;
      }
    } else if (buildingNameParam) {
      if (!buildings.length) return;
      const found = buildings.find((b) => b.Ten === buildingNameParam);
      if (found) nextFilters.buildingId = found.ID;
    }

    if (statusParam) {
      nextFilters.status = statusParam;
    }

    setFilters((prev) => ({ ...prev, ...nextFilters }));
    initialFiltersAppliedRef.current = true;
  }, [buildings, searchParams]);

  const filteredData = useMemo(() => {
    return apartments.filter((apt) => {
      const byBuilding = filters.buildingId ? apt.ID_ChungCu === filters.buildingId : true;
      const byStatus = filters.status ? apt.TrangThai === filters.status : true;
      return byBuilding && byStatus;
    });
  }, [apartments, filters]);

  const openModal = (record?: Apartment) => {
    if (record) {
      setEditing(record);
      form.setFieldsValue({
        MaCan: record.MaCan,
        ID_ChungCu: record.ID_ChungCu,
        DienTich: record.DienTich,
        SoPhong: record.SoPhong,
        Gia: record.Gia,
        TrangThai: record.TrangThai,
        MoTa: record.MoTa,
        Model3DUrl: record.Model3DUrl,
        URLs: record.URLs?.join(', ') ?? ''
      });
    } else {
      setEditing(null);
      form.resetFields();
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      MaCan: values.MaCan,
      ID_ChungCu: values.ID_ChungCu,
      DienTich: values.DienTich,
      SoPhong: values.SoPhong,
      Gia: values.Gia,
      TrangThai: values.TrangThai,
      MoTa: values.MoTa,
      Model3DUrl: values.Model3DUrl,
      URLs: values.URLs ? values.URLs.split(',').map((url: string) => url.trim()) : []
    };

    try {
      if (editing) {
        await api.put(`/apartments/${editing.ID}`, payload);
        message.success('Đã cập nhật căn hộ');
      } else {
        await api.post('/apartments', payload);
        message.success('Đã thêm căn hộ');
      }
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      await loadData();
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
        'Không thể lưu căn hộ';

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
        folder: 'apartments',
        fileName: file.name
      });

      const current: string = form.getFieldValue('URLs') || '';
      const urls = current
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);
      urls.push(data.url);

      form.setFieldsValue({ URLs: urls.join(', ') });
      message.success('Đã tải ảnh căn hộ lên');

      return false;
    }
  };

  const columns: ColumnsType<Apartment> = useMemo(() => {
    const base: ColumnsType<Apartment> = [
      {
        title: 'Hình ảnh',
        dataIndex: 'URLs',
        key: 'URLs',
        width: 120,
        render: (urls?: string[]) =>
          urls && urls.length > 0 ? (
            <img
              src={urls[0]}
              alt="Ảnh căn hộ"
              style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8 }}
            />
          ) : (
            '-'
          )
      },
      { title: 'Mã căn', dataIndex: 'MaCan', key: 'MaCan' },
      {
        title: 'Chung cư',
        dataIndex: 'ID_ChungCu',
        key: 'ID_ChungCu',
        render: (id: number) => buildings.find((b) => b.ID === id)?.Ten ?? '-'
      },
      {
        title: 'Diện tích',
        dataIndex: 'DienTich',
        key: 'DienTich',
        render: (val?: number) => (val ? `${val} m²` : '-')
      },
      {
        title: 'Giá',
        dataIndex: 'Gia',
        key: 'Gia',
        render: (val?: number) => (val ? `${val.toLocaleString('vi-VN')} ₫` : '-')
      },
      {
        title: 'Trạng thái',
        dataIndex: 'TrangThai',
        key: 'TrangThai',
        render: (val: string) => {
          const found = statusOptions.find((s) => s.value === val);
          return <Tag color={found?.color}>{found?.label ?? val}</Tag>;
        }
      }
    ];

    if (isManager) {
      base.push({
        title: 'Thao tác',
        key: 'actions',
        fixed: 'right',
        render: (_, record) => (
          <Space>
            {false && (
            <Button type="primary" onClick={() => navigate('/apartments/my')}>
              Căn hộ của tôi
            </Button>
            )}
            <Button type="link" onClick={() => navigate(`/apartments/${record.ID}`)}>
              Xem chi tiết
            </Button>
            <Button type="link" onClick={() => openModal(record)}>
              Chỉnh sửa
            </Button>
          </Space>
        )
      });
    }

    return base;
  }, [buildings, isManager, navigate]);

  const renderResidentView = () => {
    if (loading) {
      return (
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map((item) => (
            <Col xs={24} md={12} xl={8} key={item}>
              <Card loading style={{ borderRadius: 20, height: '100%' }} />
            </Col>
          ))}
        </Row>
      );
    }

    if (!filteredData.length) {
      return <Empty description="Chưa có căn hộ phù hợp" />;
    }

    return (
      <Row gutter={[16, 16]}>
        {filteredData.map((apt) => {
          const buildingName = buildings.find((b) => b.ID === apt.ID_ChungCu)?.Ten ?? '---';
          const statusMeta = statusOptions.find((s) => s.value === apt.TrangThai);
          return (
            <Col xs={24} md={12} xl={8} key={apt.ID}>
              <Card
                style={{ borderRadius: 20, height: '100%' }}
                title={`${apt.MaCan} • ${buildingName}`}
                hoverable
                onClick={() => navigate(`/apartments/${apt.ID}`)}
              >
                <Space size="small" wrap>
                  <Tag color={statusMeta?.color}>{statusMeta?.label ?? apt.TrangThai}</Tag>
                  {apt.DienTich && <Tag>{apt.DienTich} m²</Tag>}
                  {apt.SoPhong && <Tag color="purple">{apt.SoPhong} phòng</Tag>}
                </Space>
                {apt.URLs && apt.URLs.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <Carousel dots autoplay autoplaySpeed={3000} pauseOnHover={false}>
                      {apt.URLs.map((url, index) => (
                        <div key={index}>
                          <img
                            src={url}
                            alt="Ảnh căn hộ"
                            style={{
                              width: '100%',
                              borderRadius: 12,
                              maxHeight: 220,
                              objectFit: 'cover'
                            }}
                          />
                        </div>
                      ))}
                    </Carousel>
                  </div>
                )}
                <Typography.Paragraph style={{ marginTop: 12 }}>
                  {apt.MoTa ?? 'Căn hộ phù hợp cho gia đình hiện đại.'}
                </Typography.Paragraph>
                {apt.Gia && (
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {apt.Gia.toLocaleString('vi-VN')} ₫
                  </Typography.Title>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  if (!isManager) {
    return (
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Button type="primary" onClick={() => navigate('/apartments/my')} style={{ alignSelf: 'flex-start' }}>
          Căn hộ của tôi
        </Button>
        <div className="page-header">
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Khám phá căn hộ
            </Typography.Title>
            <Typography.Text type="secondary">
              Lọc theo tòa nhà hoặc trạng thái để tìm không gian sống phù hợp.
            </Typography.Text>
          </div>
          <Space>
            <Select
              allowClear
              placeholder="Chọn chung cư"
              style={{ minWidth: 200 }}
              value={filters.buildingId}
              options={buildings.map((b) => ({ label: b.Ten, value: b.ID }))}
              onChange={(value) => setFilters((prev) => ({ ...prev, buildingId: value }))}
            />
            <Select
              allowClear
              placeholder="Trạng thái"
              style={{ minWidth: 160 }}
              value={filters.status}
              options={statusOptions}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
            />
          </Space>
        </div>
        {renderResidentView()}
      </Space>
    );
  }

  return (
    <>
      <div className="page-header">
        <Space direction="vertical">
          <h2>Căn hộ</h2>
          <Space>
            <Select
              allowClear
              placeholder="Chọn chung cư"
              style={{ minWidth: 200 }}
              value={filters.buildingId}
              options={buildings.map((b) => ({ label: b.Ten, value: b.ID }))}
              onChange={(value) => setFilters((prev) => ({ ...prev, buildingId: value }))}
            />
            <Select
              allowClear
              placeholder="Trạng thái"
              style={{ minWidth: 160 }}
              value={filters.status}
              options={statusOptions}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
            />
          </Space>
        </Space>
        {isManager && (
          <Button type="primary" onClick={() => openModal()}>
            Thêm căn hộ
          </Button>
        )}
      </div>

      <Table rowKey="ID" dataSource={filteredData} loading={loading} columns={columns} bordered />

      <Modal
        title={editing ? 'Chỉnh sửa căn hộ' : 'Thêm căn hộ'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onOk={handleSubmit}
        okText="Lưu"
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Mã căn"
            name="MaCan"
            rules={[{ required: true, message: 'Nhập mã căn' }]}
          >
            <Input placeholder="A1-05" />
          </Form.Item>
          <Form.Item
            label="Thuộc chung cư"
            name="ID_ChungCu"
            rules={[{ required: true, message: 'Chọn chung cư' }]}
          >
            <Select options={buildings.map((b) => ({ label: b.Ten, value: b.ID }))} placeholder="Chọn chung cư" />
          </Form.Item>
          <Form.Item label="Diện tích (m²)" name="DienTich">
            <InputNumber style={{ width: '100%' }} placeholder="75" />
          </Form.Item>
          <Form.Item label="Số phòng" name="SoPhong">
            <InputNumber style={{ width: '100%' }} placeholder="3" />
          </Form.Item>
          <Form.Item label="Giá (VND)" name="Gia">
            <InputNumber style={{ width: '100%' }} placeholder="2500000000" />
          </Form.Item>
          <Form.Item label="Trạng thái" name="TrangThai" initialValue="Dang ban">
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item label="Mô tả" name="MoTa">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Mô hình 3D (Momento360 URL)" name="Model3DUrl">
            <Input placeholder="https://momento360.com/..." />
          </Form.Item>
          <Form.Item label="Ảnh (URL, cách nhau dấu phẩy)" name="URLs">
            <Input.TextArea rows={2} placeholder="https://..." />
          </Form.Item>
          <Upload {...uploadProps}>
            <Button type="dashed">Tải ảnh lên Supabase</Button>
          </Upload>
        </Form>
      </Modal>
    </>
  );
};

export default ApartmentsPage;
