import {
  ApartmentOutlined,
  BankOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  ReadOutlined,
  ShoppingOutlined
} from '@ant-design/icons';
import { Button, Card, Col, Progress, Row, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import '../App.css';
import type { Apartment, Building, Complaint, Invoice, News, Service } from '../types';

interface DashboardStats {
  buildings: Building[];
  apartments: Apartment[];
  services: Service[];
  invoices: Invoice[];
  news: News[];
  complaints: Complaint[];
}

const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [buildings, apartments, services, invoices, news, complaints] = await Promise.all([
          api.get('/buildings'),
          api.get('/apartments'),
          api.get('/services'),
          api.get('/invoices'),
          api.get('/news'),
          api.get('/complaints')
        ]);
        setStats({
          buildings: buildings.data,
          apartments: apartments.data,
          services: services.data,
          invoices: invoices.data,
          news: news.data,
          complaints: complaints.data
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const paidInvoices = useMemo(() => stats?.invoices.filter((i) => i.TrangThai === 'Da thanh toan').length ?? 0, [stats]);
  const openComplaints = useMemo(() => stats?.complaints.filter((c) => c.TrangThai !== 'Da xu ly').length ?? 0, [stats]);

  if (loading || !stats) {
    return <Card loading style={{ minHeight: 240, borderRadius: 24 }} />;
  }

  const metricCards = [
    {
      title: 'Chung cu',
      value: stats.buildings.length,
      suffix: 'd? án',
      icon: <BankOutlined />,
      gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)'
    },
    {
      title: 'Can h?',
      value: stats.apartments.length,
      icon: <ApartmentOutlined />,
      gradient: 'linear-gradient(135deg,#0ea5e9,#22d3ee)'
    },
    {
      title: 'D?ch v?',
      value: stats.services.length,
      icon: <ShoppingOutlined />,
      gradient: 'linear-gradient(135deg,#16a34a,#22c55e)'
    },
    {
      title: 'Hóa don dã thanh toán',
      value: paidInvoices,
      suffix: `/ ${stats.invoices.length}`,
      icon: <CheckCircleOutlined />,
      gradient: 'linear-gradient(135deg,#f97316,#f87171)'
    },
    {
      title: 'Tin t?c',
      value: stats.news.length,
      icon: <ReadOutlined />,
      gradient: 'linear-gradient(135deg,#ec4899,#f472b6)'
    },
    {
      title: 'Ph?n ánh m?',
      value: openComplaints,
      suffix: `/ ${stats.complaints.length}`,
      icon: <MessageOutlined />,
      gradient: 'linear-gradient(135deg,#facc15,#f97316)'
    }
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card
        style={{
          border: 'none',
          borderRadius: 24,
          background: 'linear-gradient(120deg,rgba(37,99,235,0.9),rgba(14,165,233,0.85))',
          color: '#fff'
        }}
        bodyStyle={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}
      >
        <div>
          <Typography.Title level={2} style={{ color: '#fff', margin: 0 }}>
            Xin chào, d?i ngu v?n hành!
          </Typography.Title>
          <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.8)', maxWidth: 480 }}>
            T?t c? s? li?u m?i nh?t v? cu dân, d?ch v? và ph?n ánh d?u du?c c?p nh?t realtime. Chúc b?n m?t ngày làm vi?c hi?u qu?.
          </Typography.Paragraph>
          <Space>
            <Button type="primary" ghost>
              Xem báo cáo PDF
            </Button>
            <Button ghost>G?i thông báo hàng lo?t</Button>
          </Space>
        </div>
        <div style={{ minWidth: 240 }}>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.8)' }}>Ti?n d? x? lý ph?n ánh</Typography.Text>
          <Progress
            percent={
              stats.complaints.length
                ? Math.round(((stats.complaints.length - openComplaints) / stats.complaints.length) * 100)
                : 100
            }
            status="active"
            strokeColor="#facc15"
          />
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {metricCards.map((card) => (
          <Col xs={24} sm={12} xl={8} key={card.title}>
            <Card
              className="metric-card"
              style={{ background: card.gradient, border: 'none', color: '#fff' }}
              bodyStyle={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <Typography.Text style={{ color: 'rgba(255,255,255,0.85)' }}>{card.title}</Typography.Text>
                <Typography.Title level={2} style={{ color: '#fff', margin: 0 }}>
                  {card.value} <small>{card.suffix}</small>
                </Typography.Title>
              </div>
              <div className="metric-icon">{card.icon}</div>
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
};

export default DashboardPage;
