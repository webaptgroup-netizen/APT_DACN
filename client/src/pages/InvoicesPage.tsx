import { Badge, Button, Card, Col, DatePicker, Empty, Modal, Row, Select, Space, Table, Tag, Tabs, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import type { Invoice, Resident } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const statusOptions = [
  { label: 'Chua thanh toán', value: 'Chua thanh toan', color: 'red' },
  { label: 'Ðã thanh toán', value: 'Da thanh toan', color: 'green' }
];

const paymentMethodOptions = [
  { label: 'Ti?n m?t', value: 'Tien mat' },
  { label: 'Chuy?n kho?n', value: 'Chuyen khoan' },
  { label: 'Ví di?n t?', value: 'Vi dien tu' }
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
  Resident?: {
    ID: number;
    LaChuHo?: boolean;
    NguoiDungs?: {
      HoTen: string;
      Email: string;
    };
  } | null;
}

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [executionDate, setExecutionDate] = useState<Dayjs | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
  const [metaModalOpen, setMetaModalOpen] = useState(false);

  const { user } = useAuthStore();
  const isManager = user?.role === 'Ban quan ly';
  const unpaidInvoices = useMemo(
    () => invoices.filter((i) => i.TrangThai === 'Chua thanh toan'),
    [invoices]
  );
  const paidInvoices = useMemo(
    () => invoices.filter((i) => i.TrangThai === 'Da thanh toan'),
    [invoices]
  );

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Invoice[]>('/invoices');
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
        // ignore
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
      message.success('ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i hÃ³a Ä‘Æ¡n');
      await loadInvoices();
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'KhÃ´ng thá»ƒ cáº­p nháº­t hÃ³a Ä‘Æ¡n');
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
        message.warning('HÃ³a Ä‘Æ¡n nÃ y chÆ°a cÃ³ phiáº¿u thu');
      } else {
        message.error(err.response?.data?.message ?? 'KhÃ´ng thá»ƒ táº£i phiáº¿u thu');
      }
    } finally {
      setReceiptLoading(false);
    }
  };

  const findResidentForInvoice = (invoice: Invoice) => {
    if (!residents.length) return undefined;

    const owner =
      residents.find(
        (r) =>
          r.ID_CanHo === invoice.ID_CanHo &&
          r.ID_ChungCu === invoice.ID_ChungCu &&
          r.LaChuHo
      ) ??
      residents.find(
        (r) => r.ID_CanHo === invoice.ID_CanHo && r.ID_ChungCu === invoice.ID_ChungCu
      );

    return owner?.NguoiDungs;
  };

  const openMetaModal = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setExecutionDate(invoice.NgayThucHien ? dayjs(invoice.NgayThucHien) : dayjs(invoice.NgayLap));
    setPaymentMethod(invoice.HinhThucThanhToan);
    setMetaModalOpen(true);
  };

  const handleUpdateMeta = async () => {
    if (!editingInvoice) {
      setMetaModalOpen(false);
      return;
    }

    try {
      const body: {
        status: Invoice['TrangThai'];
        ngayThucHien?: string;
        hinhThucThanhToan?: string;
      } = {
        status: editingInvoice.TrangThai
      };

      if (executionDate) {
        body.ngayThucHien = executionDate.toISOString();
      }

      if (paymentMethod) {
        body.hinhThucThanhToan = paymentMethod;
      }

      await api.patch(`/invoices/${editingInvoice.ID}/status`, body);
      message.success('ÄÃ£ cáº­p nháº­t ngÃ y thá»±c hiá»‡n / hÃ¬nh thá»©c thanh toÃ¡n');
      setMetaModalOpen(false);
      await loadInvoices();
    } catch (err: any) {
      message.error(
        err.response?.data?.message ?? 'KhÃ´ng thá»ƒ cáº­p nháº­t ngÃ y thá»±c hiá»‡n / hÃ¬nh thá»©c thanh toÃ¡n'
      );
    }
  };

  const renderPaymentMethod = (value?: string) => {
    if (!value) return 'ChÆ°a thiáº¿t láº­p';
    const found = paymentMethodOptions.find((p) => p.value === value);
    return found?.label ?? value;
  };

  const renderServicesText = (invoice: Invoice | Receipt['HoaDonDichVus']) => {
    const list = invoice?.HoaDonDichVu_DichVus;
    if (!list || !list.length) {
      return 'KhÃ´ng xÃ¡c Ä‘á»‹nh';
    }
    return list
      .map((item) => item.DichVus?.TenDichVu)
      .filter(Boolean)
      .join(', ');
  };

  const columns: ColumnsType<Invoice> = [
    { title: 'CÄƒn há»™', dataIndex: ['CanHos', 'MaCan'], key: 'canho' },
    { title: 'Chung cÆ°', dataIndex: ['ChungCus', 'Ten'], key: 'chungcu' },
    {
      title: 'CÆ° dÃ¢n',
      key: 'resident',
      render: (_: unknown, record) => {
        const info = findResidentForInvoice(record);
        if (!info) return '---';
        return `${info.HoTen} (${info.Email})`;
      }
    },
    {
      title: 'NgÃ y láº­p',
      dataIndex: 'NgayLap',
      key: 'NgayLap',
      render: (value: string) => dayjs(value).format('DD/MM/YYYY')
    },
    {
      title: 'NgÃ y thá»±c hiá»‡n',
      dataIndex: 'NgayThucHien',
      key: 'NgayThucHien',
      render: (_: unknown, record) => {
        const text = record.NgayThucHien
          ? dayjs(record.NgayThucHien).format('DD/MM/YYYY')
          : record.TrangThai === 'Chua thanh toan'
          ? 'Ban quáº£n lÃ½ Ä‘ang duyá»‡t'
          : '-';

        if (!isManager) {
          return text;
        }

        return (
          <Space>
            <span>{text}</span>
            <Button
              size="small"
              onClick={() => openMetaModal(record)}
              style={{
                backgroundColor: '#fb923c',
                borderColor: '#f97316',
                color: '#ffffff',
                borderRadius: 999,
                fontWeight: 500
              }}
            >
              Cáº­p nháº­t
            </Button>
          </Space>
        );
      }
    },
    {
      title: 'HÃ¬nh thá»©c thanh toÃ¡n',
      dataIndex: 'HinhThucThanhToan',
      key: 'HinhThucThanhToan',
      render: (value: string | undefined, record) => {
        const text = renderPaymentMethod(value);
        if (!isManager) {
          return text;
        }

        return (
          <Space>
            <span>{text}</span>
            <Button
              size="small"
              onClick={() => openMetaModal(record)}
              style={{
                backgroundColor: '#fb923c',
                borderColor: '#f97316',
                color: '#ffffff',
                borderRadius: 999,
                fontWeight: 500
              }}
            >
              Cáº­p nháº­t
            </Button>
          </Space>
        );
      }
    },
    {
      title: 'Sá»‘ tiá»n',
      dataIndex: 'SoTien',
      key: 'SoTien',
      render: (value: number) => <Tag color="blue">{value.toLocaleString('vi-VN')} â‚«</Tag>
    },
    {
      title: 'Dá»‹ch vá»¥',
      dataIndex: 'HoaDonDichVu_DichVus',
      key: 'services',
      render: (_: unknown, record) => renderServicesText(record)
    },
    {
      title: 'Tráº¡ng thÃ¡i',
      dataIndex: 'TrangThai',
      key: 'TrangThai',
      render: (value: string, record) => {
        const meta = statusOptions.find((s) => s.value === value);

        if (isManager) {
          const isUnpaid = value === 'Chua thanh toan';
          const className = `status-select ${
            isUnpaid ? 'status-select-unpaid' : 'status-select-paid'
          }`;

          return (
            <Select
              className={className}
              value={value}
              options={statusOptions}
              onChange={(status) => handleStatusChange(record, status as Invoice['TrangThai'])}
              style={{ width: 180 }}
            />
          );
        }

        return (
          <Badge
            color={meta?.color}
            text={meta?.label ?? value}
          />
        );
      }
    },
    ...(isManager
      ? [
          {
            title: 'Phiáº¿u thu',
            key: 'receipt',
            render: (_: unknown, record: Invoice) => (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '4px 0',
                  backgroundColor: '#ffffff'
                }}
              >
                <Button
                  size="small"
                  onClick={() => void handleViewReceipt(record.ID)}
                  style={{
                    backgroundColor: '#facc15',
                    borderColor: '#eab308',
                    color: '#422006',
                    borderRadius: 999,
                    fontWeight: 500
                  }}
                >
                  Xem phiáº¿u thu
                </Button>
              </div>
            )
          } as ColumnsType<Invoice>[number]
        ]
      : [])
  ];

  const renderResidentView = (data: Invoice[]) => {
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

    if (!data.length) {
      return <Empty description="ChÆ°a cÃ³ hÃ³a Ä‘Æ¡n nÃ o" />;
    }

    return (
      <Row gutter={[16, 16]}>
        {data.map((invoice) => {
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
                        HÃ³a Ä‘Æ¡n dá»‹ch vá»¥ cÄƒn há»™ {invoice.CanHos?.MaCan ?? '---'}
                      </Typography.Title>
                      <Tag
                        color={statusMeta?.color ?? 'blue'}
                        style={{ paddingInline: 10, borderRadius: 999 }}
                      >
                        {statusMeta?.label ?? invoice.TrangThai}
                      </Tag>
                    </div>

                    <Typography.Text type="secondary">
                      Chung cÆ°{' '}
                      <Typography.Text strong>
                        {invoice.ChungCus?.Ten ?? '---'}
                      </Typography.Text>
                    </Typography.Text>

                    <Typography.Title
                      level={3}
                      style={{ margin: 4, color: '#047857', fontWeight: 700 }}
                    >
                      {invoice.SoTien.toLocaleString('vi-VN')} â‚«
                    </Typography.Title>

                    <Typography.Text type="secondary">
                      NgÃ y láº­p: {dayjs(invoice.NgayLap).format('DD/MM/YYYY')}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      NgÃ y thá»±c hiá»‡n:{' '}
                      {invoice.NgayThucHien
                        ? dayjs(invoice.NgayThucHien).format('DD/MM/YYYY')
                        : invoice.TrangThai === 'Chua thanh toan'
                        ? 'Ban quáº£n lÃ½ Ä‘ang duyá»‡t'
                        : '-'}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      HÃ¬nh thá»©c thanh toÃ¡n: {renderPaymentMethod(invoice.HinhThucThanhToan)}
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
                        <strong>CÆ° dÃ¢n:</strong> {user?.hoTen} ({user?.email})
                      </Typography.Paragraph>
                      <Typography.Paragraph style={{ marginBottom: 4 }}>
                        <strong>Dá»‹ch vá»¥:</strong> {renderServicesText(invoice)}
                      </Typography.Paragraph>
                    </div>

                    <Button
                      size="small"
                      onClick={() => void handleViewReceipt(invoice.ID)}
                      disabled={invoice.TrangThai !== 'Da thanh toan'}
                      style={{
                        backgroundColor: '#facc15',
                        borderColor: '#eab308',
                        color: '#422006',
                        borderRadius: 999,
                        fontWeight: 500
                      }}
                    >
                      Xem phiáº¿u thu
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
        title="Phiáº¿u thu dá»‹ch vá»¥"
        width={640}
      >
        <div
          className="receipt-print-area"
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: 16,
            background: '#ffffff'
          }}
        >
          <Typography.Title level={4} style={{ textAlign: 'center', marginTop: 0 }}>
            PHIáº¾U THU Dá»ŠCH Vá»¤
          </Typography.Title>
          <Typography.Paragraph style={{ textAlign: 'center', marginBottom: 16 }}>
            NgÃ y xuáº¥t phiáº¿u:{' '}
            <strong>{dayjs(receipt.NgayXuat).format('DD/MM/YYYY HH:mm')}</strong>
          </Typography.Paragraph>

          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Paragraph>
              <strong>CÄƒn há»™:</strong> {inv?.CanHos?.MaCan ?? '---'}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>Chung cÆ°:</strong> {inv?.ChungCus?.Ten ?? '---'}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>CÆ° dÃ¢n:</strong>{' '}
              {receipt.Resident?.NguoiDungs
                ? `${receipt.Resident.NguoiDungs.HoTen} (${receipt.Resident.NguoiDungs.Email})`
                : '---'}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>Dá»‹ch vá»¥:</strong> {renderServicesText(inv)}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>Sá»‘ tiá»n:</strong> {inv?.SoTien.toLocaleString('vi-VN')} â‚«
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>NgÃ y láº­p hÃ³a Ä‘Æ¡n:</strong>{' '}
              {inv ? dayjs(inv.NgayLap).format('DD/MM/YYYY') : '-'}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>NgÃ y thá»±c hiá»‡n:</strong>{' '}
              {inv?.NgayThucHien ? dayjs(inv.NgayThucHien).format('DD/MM/YYYY') : '-'}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>HÃ¬nh thá»©c thanh toÃ¡n:</strong>{' '}
              {inv ? renderPaymentMethod(inv.HinhThucThanhToan) : 'ChÆ°a thiáº¿t láº­p'}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>NgÆ°á»i xuáº¥t phiáº¿u:</strong> {receipt.NguoiDungs?.HoTen} (
              {receipt.NguoiDungs?.Email})
            </Typography.Paragraph>
          </Space>

          <div
            style={{
              marginTop: 16,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8
            }}
          >
            <Button
              onClick={() => {
                window.print();
              }}
            >
              Táº£i PDF
            </Button>
            <Button
              type="primary"
              onClick={() => {
                window.print();
              }}
            >
              In phiáº¿u thu
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
                HÃ³a Ä‘Æ¡n há»™ gia Ä‘Ã¬nh
              </Typography.Title>
              <Typography.Text type="secondary">
                Theo dÃµi tráº¡ng thÃ¡i thanh toÃ¡n cho cÄƒn há»™ báº¡n Ä‘ang sinh sá»‘ng.
              </Typography.Text>
            </div>
            <Button onClick={() => void loadInvoices()}>Táº£i láº¡i</Button>
          </div>
          <Tabs
            items={[
              {
                key: 'unpaid',
                label: `Chua thanh toán (${unpaidInvoices.length})`,
                children: renderResidentView(unpaidInvoices)
              },
              {
                key: 'paid',
                label: `Ðã thanh toán (${paidInvoices.length})`,
                children: renderResidentView(paidInvoices)
              }
            ]}
          />
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
            HÃ³a Ä‘Æ¡n dá»‹ch vá»¥
          </Typography.Title>
          <Typography.Text type="secondary">
            Theo dÃµi chi tiáº¿t phÃ­ dá»‹ch vá»¥, ngÃ y thá»±c hiá»‡n, hÃ¬nh thá»©c thanh toÃ¡n vÃ  tÃ¬nh tráº¡ng thanh
            toÃ¡n.
          </Typography.Text>
        </div>
        <Space>
          <Button onClick={() => void loadInvoices()}>Táº£i láº¡i</Button>
        </Space>
      </div>
      <Tabs
        items={[
          {
            key: 'unpaid',
            label: `Chua thanh toán (${unpaidInvoices.length})`,
            children: (
              <Table
                rowKey="ID"
                loading={loading}
                dataSource={unpaidInvoices}
                columns={columns}
                bordered
              />
            )
          },
          {
            key: 'paid',
            label: `Ðã thanh toán (${paidInvoices.length})`,
            children: (
              <Table
                rowKey="ID"
                loading={loading}
                dataSource={paidInvoices}
                columns={columns}
                bordered
              />
            )
          }
        ]}
      />
      {renderReceiptModal()}
      <Modal
        open={metaModalOpen}
        onCancel={() => setMetaModalOpen(false)}
        onOk={() => {
          void handleUpdateMeta();
        }}
        okText="LÆ°u"
        cancelText="Huá»·"
        title="Cáº­p nháº­t ngÃ y thá»±c hiá»‡n / hÃ¬nh thá»©c thanh toÃ¡n"
      >
        <Space className="meta-modal-body" direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text>NgÃ y thá»±c hiá»‡n:</Typography.Text>
          <DatePicker
            value={executionDate}
            onChange={(value) => setExecutionDate(value)}
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
          />
          <Typography.Text>HÃ¬nh thá»©c thanh toÃ¡n:</Typography.Text>
          <Select
            allowClear
            placeholder="Chá»n hÃ¬nh thá»©c thanh toÃ¡n"
            options={paymentMethodOptions}
            value={paymentMethod}
            onChange={(val) => setPaymentMethod(val)}
            style={{ width: '100%' }}
          />
        </Space>
      </Modal>
      {receiptLoading && <div />}
    </>
  );
};

export default InvoicesPage;








