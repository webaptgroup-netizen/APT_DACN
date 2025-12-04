import { App as AntdApp, Button, Card, Empty, Space, Tag, Typography, Carousel, Image } from 'antd';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import type { Apartment, Building } from '../types';

interface ApartmentDetail extends Apartment {
  BuildingName?: string;
}

const ApartmentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [apartment, setApartment] = useState<ApartmentDetail | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<Apartment>(`/apartments/${id}`);
        setApartment(data);
        if (data.ID_ChungCu) {
          const buildingRes = await api.get<Building>(`/buildings/${data.ID_ChungCu}`);
          setBuilding(buildingRes.data);
        }
      } catch (err: any) {
        message.error(err.response?.data?.message ?? 'Khong the tai thong tin can ho');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, message]);

  if (!id) {
    return <Empty description="Thieu ma can ho" />;
  }

  if (!loading && !apartment) {
    return <Empty description="Khong tim thay can ho" />;
  }

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div
        className="page-header"
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, textAlign: 'center' }}
      >
        <Space>
          <Button onClick={() => navigate(-1)}>Quay lai</Button>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Chi tiet can ho
            </Typography.Title>
            <Typography.Text type="secondary">
              Xem day du hinh anh, dien tich, so phong, gia va mo hinh 3D cua can ho.
            </Typography.Text>
          </div>
        </Space>
      </div>

      {apartment && (
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
          {apartment.URLs && apartment.URLs.length > 0 ? (
            <Carousel dots autoplay autoplaySpeed={3000} pauseOnHover={false}>
              {apartment.URLs.map((url, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 360,
                    background: '#000',
                    overflow: 'hidden',
                    borderRadius: 16
                  }}
                >
                  <img
                    src={url}
                    alt={apartment.MaCan}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              ))}
            </Carousel>
          ) : (
            <Empty description="Chua co hinh anh cho can ho nay" />
          )}

          <Card style={{ borderRadius: 16, marginTop: 24, textAlign: 'center' }}>
            <Typography.Title level={4}>
              {apartment.MaCan} {building ? `- ${building.Ten}` : ''}
            </Typography.Title>
            <Space size="small" wrap style={{ justifyContent: 'center', width: '100%' }}>
              {apartment.DienTich && <Tag>{apartment.DienTich} m2</Tag>}
              {apartment.SoPhong && <Tag color="purple">{apartment.SoPhong} phong</Tag>}
              {apartment.TrangThai && <Tag color="blue">{apartment.TrangThai}</Tag>}
            </Space>
            {apartment.MoTa && (
              <Typography.Paragraph style={{ marginTop: 12 }}>{apartment.MoTa}</Typography.Paragraph>
            )}
            {apartment.Gia && (
              <Typography.Title level={4} style={{ marginTop: 16 }}>
                {apartment.Gia.toLocaleString('vi-VN')} VND
              </Typography.Title>
            )}

            {apartment.Model3DUrl && (
              <div style={{ marginTop: 32 }}>
                <Typography.Title level={5} style={{ marginBottom: 4 }}>
                  Mau 3D can ho (ty le nguoi that)
                </Typography.Title>
                <Typography.Text type="secondary">
                  Khung xem rong ty le 16:9 giup hinh dung kich thuoc noi that so voi co the nguoi. Ban co the bat
                  full-screen/VR trong viewer de quan sat ro hon.
                </Typography.Text>
                <div
                  style={{
                    marginTop: 12,
                    background: 'radial-gradient(circle at 20% 20%, #1c2541, #0b1021)',
                    borderRadius: 14,
                    padding: 12,
                    boxShadow: '0 16px 40px rgba(0,0,0,0.35)'
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16 / 9',
                      minHeight: 420,
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: '#000'
                    }}
                  >
                    <iframe
                      src={apartment.Model3DUrl}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        border: '0'
                      }}
                      allowFullScreen
                      allow="xr-spatial-tracking; fullscreen; accelerometer; gyroscope"
                      loading="lazy"
                      title="Apartment 3D view"
                    />
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Button
                    size="small"
                    onClick={() => window.open(apartment.Model3DUrl, '_blank')}
                    style={{ borderRadius: 6 }}
                  >
                    Mở toàn màn hình / VR
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </Space>
  );
};

export default ApartmentDetailPage;
