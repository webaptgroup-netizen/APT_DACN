import {
  ApartmentOutlined,
  BankOutlined,
  CheckCircleOutlined,
  MessageOutlined,
  ReadOutlined,
  RocketOutlined,
  SafetyOutlined,
  ShoppingOutlined,
  SmileOutlined
} from '@ant-design/icons';
import { App, Button, Card, Col, Progress, Result, Row, Space, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import '../App.css';
import type { Apartment, Building, Complaint, Invoice, News, Service } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import MarketingShowcase from '../components/MarketingShowcase';

interface DashboardStats {
  buildings: Building[];
  apartments: Apartment[];
  services: Service[];
  invoices: Invoice[];
  news: News[];
  complaints: Complaint[];
}

const DashboardPage = () => {
  const { message } = App.useApp();
  const { user } = useAuthStore();
  const isManager = user?.role === 'Ban quan ly';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(!!isManager);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isManager) return;
    setLoading(true);
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
      setError(null);
    } catch (err: any) {
      console.error('Failed to load dashboard metrics', err);
      const details = err?.response?.data?.message ?? err?.message ?? 'Không thể tải dữ liệu tổng quan.';
      setError(details);
      setStats(null);
      message.error('Không thể tải dữ liệu tổng quan, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [isManager, message]);

  useEffect(() => {
    if (isManager) void load();
    else setLoading(false);
  }, [isManager, load]);

  const paidInvoices = useMemo(() => stats?.invoices.filter((i) => i.TrangThai === 'Da thanh toan').length ?? 0, [stats]);
  const openComplaints = useMemo(() => stats?.complaints.filter((c) => c.TrangThai !== 'Da xu ly').length ?? 0, [stats]);

  if (!isManager) {
    return (
      <MarketingShowcase
        headline="Chào mừng bạn đến APT‑CONNECT!"
        description="Không gian tổng quan dành cho cư dân và khách mời khám phá hệ sinh thái tiện ích thông minh."
        promo="Giảm 20% phí dịch vụ 3 tháng đầu"
        primaryCta="Đăng ký tham quan"
        secondaryCta="Nhận brochure"
        highlights={[
          { icon: <SmileOutlined />, title: 'Cộng đồng thân thiện', description: 'Hơn 1.200 cư dân đang sinh sống, hoạt động sôi nổi mỗi ngày.' },
          { icon: <SafetyOutlined />, title: 'An ninh 24/7', description: 'Camera AI, bảo vệ đa lớp và ứng dụng phản ánh tức thì.' },
          { icon: <RocketOutlined />, title: 'Tiện ích thông minh', description: 'Đặt dịch vụ, thanh toán hóa đơn, nhận thông báo ngay trên app.' }
        ]}
      />
    );
  }

  if (loading) return <Card loading style={{ minHeight: 240, borderRadius: 24 }} />;

  if (error || !stats) {
    return (
      <Card style={{ minHeight: 320, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Result
          status="error"
          title="Không thể tải dữ liệu"
          subTitle={error ?? 'Dữ liệu không khả dụng.'}
          extra={<Button type="primary" onClick={() => void load()}>Thử lại</Button>}
        />
      </Card>
    );
  }

  const metricCards = [
    { title: 'Chung cư', value: stats.buildings.length, suffix: 'dự án', icon: <BankOutlined />, gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    { title: 'Căn hộ', value: stats.apartments.length, icon: <ApartmentOutlined />, gradient: 'linear-gradient(135deg,#0ea5e9,#22d3ee)' },
    { title: 'Dịch vụ', value: stats.services.length, icon: <ShoppingOutlined />, gradient: 'linear-gradient(135deg,#16a34a,#22c55e)' },
    { title: 'Hóa đơn đã thanh toán', value: paidInvoices, suffix: `/ ${stats.invoices.length}`, icon: <CheckCircleOutlined />, gradient: 'linear-gradient(135deg,#f97316,#f87171)' },
    { title: 'Tin tức', value: stats.news.length, icon: <ReadOutlined />, gradient: 'linear-gradient(135deg,#ec4899,#f472b6)' },
    { title: 'Phản ánh mở', value: openComplaints, suffix: `/ ${stats.complaints.length}`, icon: <MessageOutlined />, gradient: 'linear-gradient(135deg,#facc15,#f97316)' }
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card
        style={{ border: 'none', borderRadius: 24, background: 'linear-gradient(120deg,rgba(37,99,235,0.9),rgba(14,165,233,0.85))', color: '#fff' }}
        styles={{ body: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 } }}
      >
        <div>
          <Typography.Title level={2} style={{ color: '#fff', margin: 0 }}>
            Xin chào, đội ngũ vận hành!
          </Typography.Title>
          <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.9)', maxWidth: 520 }}>
            Tất cả số liệu mới nhất về cư dân, dịch vụ và phản ánh đều được cập nhật theo thời gian thực. Chúc bạn một ngày làm việc hiệu quả.
          </Typography.Paragraph>
          <Space>
            <Button type="primary" ghost>Xem báo cáo PDF</Button>
            <Button ghost>Gửi thông báo hàng loạt</Button>
          </Space>
        </div>
        <div style={{ minWidth: 240 }}>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.85)' }}>Tiến độ xử lý phản ánh</Typography.Text>
          <Progress
            percent={stats.complaints.length ? Math.round(((stats.complaints.length - openComplaints) / stats.complaints.length) * 100) : 100}
            status="active"
            strokeColor="#facc15"
          />
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {metricCards.map((card) => (
          <Col xs={24} sm={12} xl={8} key={card.title}>
            <Card className="metric-card" style={{ background: card.gradient, border: 'none', color: '#fff' }} styles={{ body: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }}>
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

