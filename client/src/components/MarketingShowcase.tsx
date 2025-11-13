import { Button, Card, Col, Row, Space, Typography } from 'antd';
import type { ReactNode } from 'react';

interface MarketingHighlight {
  icon: ReactNode;
  title: string;
  description: string;
}

interface MarketingShowcaseProps {
  headline: string;
  description: string;
  promo?: string;
  primaryCta?: string;
  secondaryCta?: string;
  highlights: MarketingHighlight[];
}

const MarketingShowcase = ({
  headline,
  description,
  promo,
  primaryCta = 'Tư vấn ngay',
  secondaryCta = 'Tải brochure',
  highlights
}: MarketingShowcaseProps) => (
  <Space direction="vertical" size={24} style={{ width: '100%' }}>
    <Card
      style={{
        borderRadius: 24,
        background: 'linear-gradient(120deg,#2563eb,#0ea5e9)',
        color: '#fff'
      }}
      styles={{
        body: { display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }
      }}
    >
      <div style={{ flex: 1, minWidth: 260 }}>
        <Typography.Title level={2} style={{ margin: 0, color: '#fff' }}>
          {headline}
        </Typography.Title>
        <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.85)' }}>{description}</Typography.Paragraph>
        <Space wrap>
          <Button type="primary">{primaryCta}</Button>
          <Button ghost style={{ borderColor: '#fff', color: '#fff' }}>
            {secondaryCta}
          </Button>
        </Space>
      </div>
      {promo && (
        <div style={{ minWidth: 220 }}>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.7)' }}>Ưu đãi nổi bật</Typography.Text>
          <Typography.Title level={3} style={{ margin: 0, color: '#fff' }}>
            {promo}
          </Typography.Title>
        </div>
      )}
    </Card>

    <Row gutter={[16, 16]}>
      {highlights.map((item) => (
        <Col xs={24} md={8} key={item.title}>
          <Card style={{ borderRadius: 20, height: '100%' }}>
            <Space size="large" align="start">
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: '#eef2ff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 24,
                  color: '#2563eb'
                }}
              >
                {item.icon}
              </div>
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {item.title}
                </Typography.Title>
                <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                  {item.description}
                </Typography.Paragraph>
              </div>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  </Space>
);

export default MarketingShowcase;
