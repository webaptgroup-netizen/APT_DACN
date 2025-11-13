import { App as AntdApp, Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [aptRes, buildingRes] = await Promise.all([api.get('/apartments'), api.get('/buildings')]);
      setApartments(aptRes.data);
      setBuildings(buildingRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

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
