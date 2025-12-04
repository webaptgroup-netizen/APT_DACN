import { App as AntdApp, Button, Card, Col, Empty, Row, Space, Tag, Typography, Carousel, Image } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import type { Building } from '../types';

const BuildingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<Building>(`/buildings/${id}`);
        setBuilding(data);
      } catch (err: any) {
        message.error(err.response?.data?.message ?? 'Không thể tải thông tin chung cư');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, message]);

  if (!id) {
    return <Empty description="Thiếu mã chung cư" />;
  }

  if (!loading && !building) {
    return <Empty description="Không tìm thấy chung cư" />;
  }

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}
      >
        <Space>
          <Button onClick={() => navigate(-1)}>Quay lại</Button>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Chi tiết chung cư
            </Typography.Title>
            <Typography.Text type="secondary">
              Xem đầy đủ thông tin và bộ sưu tập hình ảnh của dự án.
            </Typography.Text>
          </div>
        </Space>
      </div>

      {building && (
        <Row gutter={[24, 24]}>
          <Col xs={24} md={14}>
            {building.URLs && building.URLs.length > 0 ? (
              <Carousel dots autoplay autoplaySpeed={3000} pauseOnHover={false}>
                {building.URLs.map((url, index) => (
                  <div key={index}>
                    <Image
                      src={url}
                      alt={building.Ten}
                      style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 16 }}
                    />
                  </div>
                ))}
              </Carousel>
            ) : (
              <Empty description="Chưa có hình ảnh cho chung cư này" />
            )}
          </Col>
          <Col xs={24} md={10}>
            <Card style={{ borderRadius: 16 }}>
              <Typography.Title level={4}>{building.Ten}</Typography.Title>
              <Typography.Paragraph type="secondary">{building.DiaChi}</Typography.Paragraph>
              <Space size="small" wrap>
                {building.NamXayDung && <Tag color="magenta">{building.NamXayDung}</Tag>}
                {building.SoTang && <Tag color="cyan">{building.SoTang} tầng</Tag>}
                {building.ChuDauTu && <Tag color="volcano">{building.ChuDauTu}</Tag>}
              </Space>
              {building.MoTa && (
                <Typography.Paragraph style={{ marginTop: 12 }}>{building.MoTa}</Typography.Paragraph>
              )}
            </Card>
          </Col>
        </Row>
      )}
    </Space>
  );
};

export default BuildingDetailPage;

