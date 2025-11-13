import { App as AntdApp, Button, Card, Col, Empty, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuthStore();
  const { message } = AntdApp.useApp();
  const [filters, setFilters] = useState<{ buildingId?: number; status?: string }>({});

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

  const filteredData = useMemo(() => {
    return apartments.filter((apt) => {
      const byBuilding = filters.buildingId ? apt.ID_ChungCu === filters.buildingId : true;
      const byStatus = filters.status ? apt.TrangThai === filters.status : true;
      return byBuilding && byStatus;
    });
  }, [apartments, filters]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      await api.post('/apartments', {
        ...values,
        URLs: values.URLs ? values.URLs.split(',').map((url: string) => url.trim()) : []
      });
      message.success('Đã thêm căn hộ');
      setModalOpen(false);
      form.resetFields();
      await loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Không thể thêm căn hộ');
    }
  };

  const columns: ColumnsType<Apartment> = [
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
      render: (val?: number) => (val ? `${val.toLocaleString('vi-VN')} đ` : '-')
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
              <Card style={{ borderRadius: 20, height: '100%' }} title={`${apt.MaCan} · ${buildingName}`}>
                <Space size="small" wrap>
                  <Tag color={statusMeta?.color}>{statusMeta?.label ?? apt.TrangThai}</Tag>
                  {apt.DienTich && <Tag>{apt.DienTich} m²</Tag>}
                  {apt.SoPhong && <Tag color="purple">{apt.SoPhong} phòng</Tag>}
                </Space>
                {apt.URLs && apt.URLs.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <img
                      src={apt.URLs[0]}
                      alt="Ảnh căn hộ"
                      style={{ width: '100%', borderRadius: 12, maxHeight: 220, objectFit: 'cover' }}
                    />
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
              options={buildings.map((b) => ({ label: b.Ten, value: b.ID }))}
              onChange={(value) => setFilters((prev) => ({ ...prev, buildingId: value }))}
            />
            <Select
              allowClear
              placeholder="Trạng thái"
              style={{ minWidth: 160 }}
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
              options={buildings.map((b) => ({ label: b.Ten, value: b.ID }))}
              onChange={(value) => setFilters((prev) => ({ ...prev, buildingId: value }))}
            />
            <Select
              allowClear
              placeholder="Trạng thái"
              style={{ minWidth: 160 }}
              options={statusOptions}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
            />
          </Space>
        </Space>
        {isManager && (
          <Button type="primary" onClick={() => setModalOpen(true)}>
            Thêm căn hộ
          </Button>
        )}
      </div>

      <Table
        rowKey="ID"
        dataSource={filteredData}
        loading={loading}
        columns={columns}
        bordered
      />

      <Modal
        title="Thêm căn hộ"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Lưu"
      >
        <Form layout="vertical" form={form}>
          <Form.Item label="Mã căn" name="MaCan" rules={[{ required: true, message: 'Nhập mã căn' }]}>
            <Input placeholder="A1-05" />
          </Form.Item>
          <Form.Item label="Thuộc chung cư" name="ID_ChungCu" rules={[{ required: true, message: 'Chọn chung cư' }]}>
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
          <Form.Item label="Ảnh (URL, cách nhau dấu phẩy)" name="URLs">
            <Input.TextArea rows={2} placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ApartmentsPage;
