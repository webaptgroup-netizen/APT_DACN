import { Badge, Button, Card, Col, Empty, Modal, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import type { Invoice, Resident } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const statusOptions = [
  { label: 'Chưa thanh toán', value: 'Chua thanh toan', color: 'red' },
  { label: 'Đã thanh toán', value: 'Da thanh toan', color: 'green' }
];

interface Receipt {
  ID: number;
  NgayXuat: string;
  NguoiDungs?: {
    ID: number;
    HoTen: string;
    Email: string;
  };
  HoaDonDichVus?: Invoice & {
    HoaDonDichVu_DichVus?: { DichVus: { TenDichVu: string } }[];
  };
}

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);

  const { user } = useAuthStore();
  const isManager = user?.role === 'Ban quan ly';

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/invoices');
      setInvoices(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    if (!isManager) return;
    const loadResidents = async () => {
      try {
        const { data } = await api.get<Resident[]>('/residents');
        setResidents(data);
      } catch {
        // ignore error for admin helper info
      }
    };
    void loadResidents();
  }, [isManager]);

  const handleStatusChange = async (record: Invoice, status: Invoice['TrangThai']) => {
    try {
      const payload: { status: Invoice['TrangThai']; ngayThucHien?: string } = { status };
      if (!record.NgayThucHien && status === 'Da thanh toan') {
        payload.ngayThucHien = new Date().toISOString();
      }
      await api.patch(`/invoices/${record.ID}/status`, payload);
      message.success('Đã cập nhật trạng thái hóa đơn');
      await loadInvoices();
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Không thể cập nhật hóa đơn');
    }
  };

  const handleViewReceipt = async (invoiceId: number) => {
    try {
      setReceiptLoading(true);
      const { data } = await api.get<Receipt>(`/invoices/${invoiceId}/receipt`);
      setReceipt(data);
      setReceiptOpen(true);
    } catch (err: any) {
      if (err.response?.status === 404) {
        message.warning('Hóa đơn này chưa có phiếu thu');
      } else {
        message.error(err.response?.data?.message ?? 'Không thể tải phiếu thu');
      }
    } finally {
      setReceiptLoading(false);
    }
  };

  const renderServicesText = (invoice: Invoice | Receipt['HoaDonDichVus']) => {
    const list = invoice?.HoaDonDichVu_DichVus;
    if (!list || !list.length) {
      return 'Không xác định';
    }
    return list
      .map((item) => item.DichVus?.TenDichVu)
      .filter(Boolean)
      .join(', ');
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
      title: 'Ngày thực hiện',
      dataIndex: 'NgayThucHien',
      key: 'NgayThucHien',
      render: (_: unknown, record) =>
        record.NgayThucHien
          ? dayjs(record.NgayThucHien).format('DD/MM/YYYY')
          : record.TrangThai === 'Chua thanh toan'
          ? 'Ban quản lý đang duyệt'
          : '-'
    },
    {
      title: 'Số tiền',
      dataIndex: 'SoTien',
      key: 'SoTien',
      render: (value: number) => <Tag color="blue">{value.toLocaleString('vi-VN')} ₫</Tag>
    },
    {
      title: 'Dịch vụ',
      dataIndex: 'HoaDonDichVu_DichVus',
      key: 'services',
      render: (_: unknown, record) => renderServicesText(record)
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
    },
    ...(isManager
      ? [
          {
            title: 'Phiếu thu',
            key: 'receipt',
            render: (_: unknown, record: Invoice) => (
              <Button size="small" onClick={() => void handleViewReceipt(record.ID)}>
                Xem phiếu thu
              </Button>
            )
          } as ColumnsType<Invoice>[number]
        ]
      : [])
  ];

  const renderResidentView = () => {
    if (loading) {
      return (
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map((idx) => (
            <Col xs={24} md={12} key={idx}>
              <Card loading style={{ borderRadius: 20 }} />
            </Col>
          ))}
        </Row>
      );
    }

    if (!invoices.length) {
      return <Empty description="Chưa có hóa đơn nào" />;
    }

    return (
      <Row gutter={[16, 16]}>
        {invoices.map((invoice) => {
          const statusMeta = statusOptions.find((s) => s.value === invoice.TrangThai);

          return (
            <Col xs={24} md={12} key={invoice.ID}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #ec4899 100%)',
                  padding: 2,
                  borderRadius: 24
                }}
              >
                <Card
                  bordered={false}
                  bodyStyle={{
                    padding: 16,
                    borderRadius: 22,
                    background: '#ffffff'
                  }}
                  style={{
                    borderRadius: 22,
                    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)'
                  }}
                >
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 4
                      }}
                    >
                      <Typography.Title level={4} style={{ margin: 0 }}>
                        Hóa đơn dịch vụ căn hộ {invoice.CanHos?.MaCan ?? '---'}
                      </Typography.Title>
                      <Tag
                        color={statusMeta?.color ?? 'blue'}
                        style={{ paddingInline: 10, borderRadius: 999 }}
                      >
                        {statusMeta?.label ?? invoice.TrangThai}
                      </Tag>
                    </div>

                    <Typography.Text type="secondary">
                      Chung cư{' '}
                      <Typography.Text strong>
                        {invoice.ChungCus?.Ten ?? '---'}
                      </Typography.Text>
                    </Typography.Text>

                    <Typography.Title
                      level={3}
                      style={{ margin: 4, color: '#047857', fontWeight: 700 }}
                    >
                      {invoice.SoTien.toLocaleString('vi-VN')} ₫
                    </Typography.Title>

                    <Typography.Text type="secondary">
                      Ngày lập: {dayjs(invoice.NgayLap).format('DD/MM/YYYY')}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      Ngày thực hiện:{' '}
                      {invoice.NgayThucHien
                        ? dayjs(invoice.NgayThucHien).format('DD/MM/YYYY')
                        : invoice.TrangThai === 'Chua thanh toan'
                        ? 'Ban quản lý đang duyệt'
                        : '-'}
                    </Typography.Text>

                    <div
                      style={{
                        marginTop: 8,
                        padding: 12,
                        borderRadius: 16,
                        background: '#f9fafb',
                        border: '1px dashed #e5e7eb'
                      }}
                    >
                      <Typography.Paragraph style={{ marginBottom: 4 }}>
                        <strong>Cư dân:</strong> {user?.hoTen} ({user?.email})
                      </Typography.Paragraph>
                      <Typography.Paragraph style={{ marginBottom: 4 }}>
                        <strong>Dịch vụ:</strong> {renderServicesText(invoice)}
                      </Typography.Paragraph>
                    </div>

                    <Button
                      size="small"
                      onClick={() => void handleViewReceipt(invoice.ID)}
                      disabled={invoice.TrangThai !== 'Da thanh toan'}
                    >
                      Xem phiếu thu
                    </Button>
                  </Space>
                </Card>
              </div>
            </Col>
          );
        })}
      </Row>
    );
  };

  const renderReceiptModal = () => {
    if (!receipt) return null;
    const inv = receipt.HoaDonDichVus;

    return (
      <Modal
        open={receiptOpen}
        onCancel={() => setReceiptOpen(false)}
        footer={null}
        title="Phiếu thu dịch vụ"
        width={640}
      >
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 16,
            background: '#ffffff'
          }}
        >
          <Typography.Title level={4} style={{ textAlign: 'center', marginTop: 0 }}>
            PHIẾU THU DỊCH VỤ
          </Typography.Title>
          <Typography.Paragraph style={{ textAlign: 'center', marginBottom: 16 }}>
            Ngày xuất phiếu:{' '}
            <strong>{dayjs(receipt.NgayXuat).format('DD/MM/YYYY HH:mm')}</strong>
          </Typography.Paragraph>

          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Paragraph>
              <strong>Căn hộ:</strong> {inv?.CanHos?.MaCan ?? '---'}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>Chung cư:</strong> {inv?.ChungCus?.Ten ?? '---'}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>Dịch vụ:</strong> {renderServicesText(inv)}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>Số tiền:</strong> {inv?.SoTien.toLocaleString('vi-VN')} ₫
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>Ngày lập hóa đơn:</strong>{' '}
              {inv ? dayjs(inv.NgayLap).format('DD/MM/YYYY') : '-'}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>Ngày thực hiện:</strong>{' '}
              {inv?.NgayThucHien ? dayjs(inv.NgayThucHien).format('DD/MM/YYYY') : '-'}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>Người xuất phiếu:</strong> {receipt.NguoiDungs?.HoTen} (
              {receipt.NguoiDungs?.Email})
            </Typography.Paragraph>
          </Space>

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button
              type="primary"
              onClick={() => {
                window.print();
              }}
            >
              In / Tải phiếu thu
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  if (!isManager) {
    return (
      <>
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <div className="page-header">
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>
                Hóa đơn hộ gia đình
              </Typography.Title>
              <Typography.Text type="secondary">
                Theo dõi trạng thái thanh toán của căn hộ bạn đang sinh sống.
              </Typography.Text>
            </div>
            <Button onClick={() => void loadInvoices()}>Tải lại</Button>
          </div>
          {renderResidentView()}
        </Space>
        {renderReceiptModal()}
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Hóa đơn dịch vụ
          </Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi chi tiết phí dịch vụ, ngày thực hiện và tình trạng thanh toán.
          </Typography.Text>
        </div>
        <Space>
          <Button onClick={() => void loadInvoices()}>Tải lại</Button>
        </Space>
      </div>
      <Table rowKey="ID" loading={loading} dataSource={invoices} columns={columns} bordered />
      {renderReceiptModal()}
      {receiptLoading && <div />}
    </>
  );
};

export default InvoicesPage;
