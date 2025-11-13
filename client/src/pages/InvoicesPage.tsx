import { Badge, Button, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Invoice } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const statusOptions = [
  { label: 'Chưa thanh toán', value: 'Chua thanh toan', color: 'orange' },
  { label: 'Đã thanh toán', value: 'Da thanh toan', color: 'green' }
];

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();
  const isManager = user?.role === 'Ban quan ly';

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/invoices');
      setInvoices(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvoices();
  }, []);

  const handleStatusChange = async (record: Invoice, status: Invoice['TrangThai']) => {
    await api.patch(`/invoices/${record.ID}/status`, { status });
    await loadInvoices();
  };

  const columns: ColumnsType<Invoice> = [
    { title: 'Căn hộ', dataIndex: ['CanHos', 'MaCan'], key: 'canho' },
    { title: 'Chung cư', dataIndex: ['ChungCus', 'Ten'], key: 'chungcu' },
    {
      title: 'Ngày lập',
      dataIndex: 'NgayLap',
      key: 'NgayLap',
      render: (value: string) => dayjs(value).format('DD/MM/YYYY')
    },
    {
      title: 'Số tiền',
      dataIndex: 'SoTien',
      key: 'SoTien',
      render: (value: number) => <Tag color="blue">{value.toLocaleString('vi-VN')} đ</Tag>
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'HoaDonDichVu_DichVus',
      key: 'services',
      render: (list?: { DichVus: { TenDichVu: string } }[]) =>
        list?.map((item) => item.DichVus?.TenDichVu).join(', ') ?? '-'
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      key: 'TrangThai',
      render: (value: string, record) =>
        isManager ? (
          <Select
            value={value}
            options={statusOptions}
            onChange={(status) => handleStatusChange(record, status as Invoice['TrangThai'])}
            style={{ width: 160 }}
          />
        ) : (
          <Badge
            color={statusOptions.find((s) => s.value === value)?.color}
            text={statusOptions.find((s) => s.value === value)?.label ?? value}
          />
        )
    }
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Hóa đơn dịch vụ
          </Typography.Title>
          <Typography.Text type="secondary">Theo dõi chi tiết phí tiện ích và tình trạng thanh toán</Typography.Text>
        </div>
        <Space>
          <Button onClick={() => loadInvoices()}>Tải lại</Button>
        </Space>
      </div>
      <Table rowKey="ID" loading={loading} dataSource={invoices} columns={columns} bordered />
    </>
  );
};

export default InvoicesPage;
