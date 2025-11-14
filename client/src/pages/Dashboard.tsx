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

  const videoUrls = [
    'https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/view.mp4',
    'https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/view1.mp4',
    'https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/view2.mp4',
    'https://dwmksmgzljllumyaajti.supabase.co/storage/v1/object/public/apt-assets/NEN/view3.mp4'
  ];

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

  // Video Background Component - Clear, no blur
  const VideoBackground = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
      overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        {videoUrls.map((url, index) => (
          <video
            key={index}
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: '25%',
              height: '100%',
              objectFit: 'cover'
            }}
          >
            <source src={url} type="video/mp4" />
          </video>
        ))}
      </div>
    </div>
  );

  if (!isManager) {
    return (
      <>
        <VideoBackground />
        <div style={{ position: 'relative', zIndex: 1 }}>
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
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <VideoBackground />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Card 
            loading 
            style={{ 
              minHeight: 240, 
              borderRadius: 24, 
              background: 'rgba(255,255,255,0.15)', 
              backdropFilter: 'blur(20px)', 
              border: 'none',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
            }} 
          />
        </div>
      </>
    );
  }

  if (error || !stats) {
    return (
      <>
        <VideoBackground />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Card 
            style={{ 
              minHeight: 320, 
              borderRadius: 24, 
              background: 'rgba(255,255,255,0.95)', 
              backdropFilter: 'blur(20px)', 
              border: 'none', 
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)' 
            }}
          >
            <Result
              status="error"
              title="Không thể tải dữ liệu"
              subTitle={error ?? 'Dữ liệu không khả dụng.'}
              extra={<Button type="primary" onClick={() => void load()}>Thử lại</Button>}
            />
          </Card>
        </div>
      </>
    );
  }

  const metricCards = [
    { 
      title: 'Chung cư', 
      value: stats.buildings.length, 
      suffix: 'dự án', 
      icon: <BankOutlined />, 
      borderColor: '#6366f1', 
      iconBg: 'rgba(99,102,241,0.1)',
      description: 'Tổng số tòa nhà đang quản lý',
      trend: '+2 tháng này'
    },
    { 
      title: 'Căn hộ', 
      value: stats.apartments.length, 
      icon: <ApartmentOutlined />, 
      borderColor: '#0ea5e9', 
      iconBg: 'rgba(14,165,233,0.1)',
      description: 'Căn hộ đã đăng ký',
      trend: 'Đầy 95%'
    },
    { 
      title: 'Dịch vụ', 
      value: stats.services.length, 
      icon: <ShoppingOutlined />, 
      borderColor: '#16a34a', 
      iconBg: 'rgba(22,163,74,0.1)',
      description: 'Dịch vụ đang hoạt động',
      trend: 'Tất cả khả dụng'
    },
    { 
      title: 'Hóa đơn đã thanh toán', 
      value: paidInvoices, 
      suffix: `/ ${stats.invoices.length}`, 
      icon: <CheckCircleOutlined />, 
      borderColor: '#f97316', 
      iconBg: 'rgba(249,115,22,0.1)',
      description: 'Tỷ lệ thanh toán đúng hạn',
      trend: `${stats.invoices.length ? Math.round((paidInvoices / stats.invoices.length) * 100) : 0}%`
    },
    { 
      title: 'Tin tức', 
      value: stats.news.length, 
      icon: <ReadOutlined />, 
      borderColor: '#ec4899', 
      iconBg: 'rgba(236,72,153,0.1)',
      description: 'Bài viết đã đăng',
      trend: '12 tuần gần đây'
    },
    { 
      title: 'Phản ánh mở', 
      value: openComplaints, 
      suffix: `/ ${stats.complaints.length}`, 
      icon: <MessageOutlined />, 
      borderColor: '#facc15', 
      iconBg: 'rgba(250,204,21,0.1)',
      description: 'Phản ánh cần xử lý',
      trend: `${stats.complaints.length - openComplaints} đã giải quyết`
    }
  ];

  return (
    <>
      <VideoBackground />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <Card
            style={{ 
              border: 'none', 
              borderRadius: 24, 
              background: 'rgba(37,99,235,0.85)', 
              color: '#fff',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              WebkitBackdropFilter: 'blur(20px)'
            }}
            styles={{ body: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 } }}
          >
            <div>
              <Typography.Title level={2} style={{ color: '#fff', margin: 0 }}>
                Xin chào, đội ngũ vận hành!
              </Typography.Title>
              <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.95)', maxWidth: 520, marginBottom: 16 }}>
                Tất cả số liệu mới nhất về cư dân, dịch vụ và phản ánh đều được cập nhật theo thời gian thực. Chúc bạn một ngày làm việc hiệu quả.
              </Typography.Paragraph>
              <Space>
                <Button type="primary" ghost style={{ borderColor: 'rgba(255,255,255,0.8)', color: '#fff' }}>Xem báo cáo PDF</Button>
                <Button ghost style={{ borderColor: 'rgba(255,255,255,0.6)', color: 'rgba(255,255,255,0.9)' }}>Gửi thông báo hàng loạt</Button>
              </Space>
            </div>
            <div style={{ minWidth: 240 }}>
              <Typography.Text style={{ color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: 8 }}>Tiến độ xử lý phản ánh</Typography.Text>
              <Progress
                percent={stats.complaints.length ? Math.round(((stats.complaints.length - openComplaints) / stats.complaints.length) * 100) : 100}
                status="active"
                strokeColor="#facc15"
              />
            </div>
          </Card>

          <Row gutter={[20, 20]}>
            {metricCards.map((card) => (
              <Col xs={24} sm={12} lg={8} key={card.title}>
                <Card 
                  className="metric-card" 
                  style={{ 
                    background: 'rgba(255,255,255,0.95)', 
                    border: `3px solid ${card.borderColor}`, 
                    backdropFilter: 'blur(20px)',
                    boxShadow: `0 8px 30px rgba(0,0,0,0.25), 0 0 15px ${card.borderColor}30`,
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: 16,
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    transform: 'translateY(0)',
                    height: '100%'
                  }}
                  styles={{ 
                    body: { 
                      display: 'flex', 
                      flexDirection: 'column',
                      padding: '20px 20px',
                      height: '100%',
                      minHeight: 240
                    } 
                  }}
                  hoverable
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.boxShadow = `0 15px 45px rgba(0,0,0,0.35), 0 0 25px ${card.borderColor}50`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.25), 0 0 15px ${card.borderColor}30`;
                  }}
                >
                  {/* Header với Icon và Title */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12,
                    marginBottom: 16,
                    paddingBottom: 12,
                    borderBottom: `2px solid ${card.borderColor}20`
                  }}>
                    <div className="metric-icon" style={{ 
                      fontSize: '2.5em', 
                      background: card.iconBg,
                      color: card.borderColor,
                      borderRadius: '12px',
                      width: 60,
                      height: 60,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 3px 15px ${card.borderColor}25`,
                      border: `2px solid ${card.borderColor}15`,
                      flexShrink: 0
                    }}>
                      {card.icon}
                    </div>
                    <Typography.Text style={{ 
                      color: '#475569', 
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'block',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      lineHeight: 1.3,
                      flex: 1
                    }}>
                      {card.title}
                    </Typography.Text>
                  </div>

                  {/* Main Number */}
                  <div style={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12
                  }}>
                    <Typography.Title level={1} style={{ 
                      color: '#1e293b', 
                      margin: 0,
                      fontSize: 42,
                      fontWeight: 700,
                      lineHeight: 1
                    }}>
                      {card.value}
                    </Typography.Title>
                    {card.suffix && (
                      <Typography.Text style={{ 
                        color: '#94a3b8', 
                        fontSize: 13,
                        display: 'block',
                        marginTop: 6,
                        fontWeight: 500
                      }}>
                        {card.suffix}
                      </Typography.Text>
                    )}
                  </div>

                  {/* Footer Info */}
                  <div style={{
                    background: `${card.iconBg}`,
                    padding: '10px 12px',
                    borderRadius: 10,
                    marginTop: 'auto'
                  }}>
                    <Typography.Text style={{ 
                      color: '#64748b', 
                      fontSize: 12,
                      display: 'block',
                      marginBottom: 4,
                      fontWeight: 500
                    }}>
                      {card.description}
                    </Typography.Text>
                    <Typography.Text style={{ 
                      color: card.borderColor, 
                      fontSize: 13,
                      display: 'block',
                      fontWeight: 600
                    }}>
                      {card.trend}
                    </Typography.Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Space>
      </div>
    </>
  );
};

export default DashboardPage;

