import { App as AntdApp, Button, Card, Col, Empty, Form, Input, Row, Select, Space, Tabs, Tag, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Uploader from '../components/Uploader';
import type { Apartment, Building } from '../types';

const statusOptions = [
  { label: 'Đang bán', value: 'Dang ban', color: 'blue' },
  { label: 'Đã bán', value: 'Da ban', color: 'red' },
  { label: 'Cho thuê', value: 'Cho thue', color: 'green' },
  { label: 'Đã thuê', value: 'Da thue', color: 'orange' }
];

type ApartmentSummary = {
  apartment: Apartment;
  residentsCount: number;
  isOwner: boolean;
  owner?: { hoTen: string; email: string; soDienThoai?: string };
  residents?: Array<{
    ID: number;
    ID_NguoiDung: number;
    LaChuHo: boolean;
    NguoiDungs?: { HoTen: string; Email: string; SoDienThoai?: string; LoaiNguoiDung: string };
  }>;
};

const MyApartmentsPage = () => {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<ApartmentSummary[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [form] = Form.useForm();

  const selected = useMemo(
    () => summaries.find((s) => s.apartment.ID === selectedId) ?? summaries[0],
    [summaries, selectedId]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mineRes, buildingsRes] = await Promise.all([api.get('/apartments/mine'), api.get('/buildings')]);
      setSummaries(mineRes.data ?? []);
      setBuildings(buildingsRes.data ?? []);

      const nextSelected = (mineRes.data?.[0]?.apartment?.ID as number | undefined) ?? undefined;
      setSelectedId((prev) => prev ?? nextSelected);

      const first = mineRes.data?.[0] as ApartmentSummary | undefined;
      if (first?.apartment) {
        form.setFieldsValue({
          MoTa: first.apartment.MoTa ?? '',
          Model3DUrl: first.apartment.Model3DUrl ?? '',
          URLs: Array.isArray(first.apartment.URLs) ? first.apartment.URLs.join(', ') : ''
        });
      }
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selected) return;
    form.setFieldsValue({
      MoTa: selected.apartment.MoTa ?? '',
      Model3DUrl: selected.apartment.Model3DUrl ?? '',
      URLs: Array.isArray(selected.apartment.URLs) ? selected.apartment.URLs.join(', ') : ''
    });
  }, [selected, form]);

  const appendUrl = (url: string) => {
    const current = form.getFieldValue('URLs') as string | undefined;
    const next = current && current.trim().length ? `${current.trim()}, ${url}` : url;
    form.setFieldsValue({ URLs: next });
  };

  const handleUpdate = async (values: { MoTa?: string; Model3DUrl?: string; URLs?: string }) => {
    if (!selected) return;
    const urls = values.URLs ? values.URLs.split(',').map((u) => u.trim()).filter(Boolean) : [];
    const payload = {
      MoTa: values.MoTa?.trim() ? values.MoTa : undefined,
      Model3DUrl: values.Model3DUrl?.trim() ? values.Model3DUrl : undefined,
      URLs: urls
    };

    const { data } = await api.put(`/apartments/mine/${selected.apartment.ID}`, payload);
    setSummaries((prev) =>
      prev.map((item) =>
        item.apartment.ID === selected.apartment.ID ? { ...item, apartment: { ...item.apartment, ...data } } : item
      )
    );
    message.success('Đã cập nhật thông tin căn hộ');
  };

  const buildingName = useMemo(() => {
    if (!selected) return '---';
    return buildings.find((b) => b.ID === selected.apartment.ID_ChungCu)?.Ten ?? '---';
  }, [buildings, selected]);

  const selectedStatus = selected ? statusOptions.find((s) => s.value === selected.apartment.TrangThai) : undefined;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Space direction="vertical" size={0}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Căn hộ của tôi
          </Typography.Title>
          <Typography.Text type="secondary">Xem thông tin, số cư dân và chỉnh sửa (nếu là chủ hộ).</Typography.Text>
        </Space>
        <Space>
          <Button onClick={() => navigate('/apartments')}>Xem căn hộ chung</Button>
        </Space>
      </div>

      {!summaries.length && !loading ? (
        <Empty description="Bạn chưa được gắn với căn hộ nào" />
      ) : (
        <Tabs
          items={[
            {
              key: 'info',
              label: 'Thông tin',
              children: (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Card loading={loading} variant="borderless">
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      <Space wrap>
                        <Typography.Text strong>Chọn căn hộ:</Typography.Text>
                        <Select
                          style={{ minWidth: 220 }}
                          value={selected?.apartment.ID}
                          options={summaries.map((s) => ({
                            value: s.apartment.ID,
                            label: `${s.apartment.MaCan} - ${buildings.find((b) => b.ID === s.apartment.ID_ChungCu)?.Ten ?? '---'}`
                          }))}
                          onChange={(value) => setSelectedId(value)}
                        />
                        {selected?.isOwner ? <Tag color="green">Chủ hộ</Tag> : <Tag>Thành viên</Tag>}
                        {selectedStatus && <Tag color={selectedStatus.color}>{selectedStatus.label}</Tag>}
                      </Space>

                      {selected && (
                        <>
                          <Typography.Title level={4} style={{ margin: 0 }}>
                            {selected.apartment.MaCan} · {buildingName}
                          </Typography.Title>
                          <Space size="small" wrap>
                            <Tag>Số cư dân: {selected.residentsCount}</Tag>
                            {selected.apartment.DienTich && <Tag>{selected.apartment.DienTich} m²</Tag>}
                            {selected.apartment.SoPhong && <Tag color="purple">{selected.apartment.SoPhong} phòng</Tag>}
                          </Space>

                          {selected.owner && (
                            <Card size="small" style={{ borderRadius: 12, background: 'rgba(255,255,255,0.6)' }}>
                              <Space direction="vertical" size={2}>
                                <Typography.Text strong>Chủ hộ</Typography.Text>
                                <Typography.Text>{selected.owner.hoTen}</Typography.Text>
                                <Typography.Text type="secondary">{selected.owner.email}</Typography.Text>
                                {selected.owner.soDienThoai && (
                                  <Typography.Text type="secondary">{selected.owner.soDienThoai}</Typography.Text>
                                )}
                              </Space>
                            </Card>
                          )}

                          {Array.isArray(selected.residents) && selected.residents.length > 0 && (
                            <Card
                              size="small"
                              title="Danh sách cư dân"
                              style={{ borderRadius: 12, background: 'rgba(255,255,255,0.6)' }}
                            >
                              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                                {selected.residents.map((r) => (
                                  <div
                                    key={r.ID}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: 12
                                    }}
                                  >
                                    <Space direction="vertical" size={0}>
                                      <Typography.Text>
                                        {r.NguoiDungs?.HoTen ?? '---'} {r.LaChuHo ? '(Chủ hộ)' : ''}
                                      </Typography.Text>
                                      <Typography.Text type="secondary">{r.NguoiDungs?.Email ?? '---'}</Typography.Text>
                                      {r.NguoiDungs?.SoDienThoai && (
                                        <Typography.Text type="secondary">{r.NguoiDungs.SoDienThoai}</Typography.Text>
                                      )}
                                    </Space>
                                    <Space>
                                      {r.LaChuHo && <Tag color="green">Chủ hộ</Tag>}
                                      {r.NguoiDungs?.LoaiNguoiDung && <Tag>{r.NguoiDungs.LoaiNguoiDung}</Tag>}
                                    </Space>
                                  </div>
                                ))}
                              </Space>
                            </Card>
                          )}

                          {selected.apartment.URLs && selected.apartment.URLs.length > 0 && (
                            <Row gutter={[12, 12]}>
                              {selected.apartment.URLs.slice(0, 6).map((url, index) => (
                                <Col xs={12} md={8} xl={6} key={`${url}-${index}`}>
                                  <img
                                    src={url}
                                    alt="Ảnh căn hộ"
                                    style={{ width: '100%', borderRadius: 12, maxHeight: 180, objectFit: 'cover' }}
                                  />
                                </Col>
                              ))}
                            </Row>
                          )}

                          {selected.apartment.Model3DUrl && (
                            <Card
                              size="small"
                              title="Mô hình 3D (Momento360)"
                              style={{ borderRadius: 12, background: 'rgba(255,255,255,0.6)' }}
                              extra={
                                <Button size="small" onClick={() => window.open(selected.apartment.Model3DUrl, '_blank')}>
                                  Mở toàn màn hình
                                </Button>
                              }
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
                                  src={selected.apartment.Model3DUrl}
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
                            </Card>
                          )}
                        </>
                      )}
                    </Space>
                  </Card>

                  {selected?.isOwner ? (
                    <Card title="Chỉnh sửa thông tin (Chủ hộ)" loading={loading} variant="borderless">
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <div>
                          <Typography.Text type="secondary">Tải ảnh/video và thêm vào danh sách URLs</Typography.Text>
                          <div style={{ marginTop: 8 }}>
                            <Uploader
                              folder="apartment-media"
                              onUploaded={(url) => {
                                appendUrl(url);
                                message.info('Đã tải lên. Bấm "Cập nhật" để lưu.');
                              }}
                            />
                          </div>
                        </div>

                        <Form layout="vertical" form={form} onFinish={handleUpdate}>
                          <Form.Item label="Mô tả" name="MoTa">
                            <Input.TextArea rows={3} placeholder="Mô tả căn hộ..." />
                          </Form.Item>
                          <Form.Item label="Link 3D (Momento360)" name="Model3DUrl">
                            <Input placeholder="https://momento360.com/..." />
                          </Form.Item>
                          <Form.Item label="URLs (cách nhau dấu phẩy)" name="URLs">
                            <Input.TextArea rows={3} placeholder="https://... , https://..." />
                          </Form.Item>
                          <Button type="primary" htmlType="submit">
                            Cập nhật
                          </Button>
                        </Form>
                      </Space>
                    </Card>
                  ) : (
                    <Card title="Chỉnh sửa thông tin" variant="borderless">
                      <Typography.Text type="secondary">Chỉ chủ hộ mới có quyền chỉnh sửa thông tin căn hộ.</Typography.Text>
                    </Card>
                  )}
                </Space>
              )
            },
            {
              key: 'list',
              label: 'Danh sách',
              children: (
                <Row gutter={[16, 16]}>
                  {summaries.map((s) => {
                    const bName = buildings.find((b) => b.ID === s.apartment.ID_ChungCu)?.Ten ?? '---';
                    const statusMeta = statusOptions.find((opt) => opt.value === s.apartment.TrangThai);
                    return (
                      <Col xs={24} md={12} xl={8} key={s.apartment.ID}>
                        <Card
                          hoverable
                          style={{ borderRadius: 20, height: '100%' }}
                          title={`${s.apartment.MaCan} · ${bName}`}
                          onClick={() => {
                            setSelectedId(s.apartment.ID);
                          }}
                          extra={s.isOwner ? <Tag color="green">Chủ hộ</Tag> : undefined}
                        >
                          <Space size="small" wrap>
                            <Tag>Số cư dân: {s.residentsCount}</Tag>
                            <Tag color={statusMeta?.color}>{statusMeta?.label ?? s.apartment.TrangThai}</Tag>
                          </Space>
                          {s.apartment.URLs && s.apartment.URLs.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <img
                                src={s.apartment.URLs[0]}
                                alt="Ảnh căn hộ"
                                style={{ width: '100%', borderRadius: 12, maxHeight: 220, objectFit: 'cover' }}
                              />
                            </div>
                          )}
                          <Typography.Paragraph style={{ marginTop: 12 }}>
                            {s.apartment.MoTa ?? 'Chưa có mô tả.'}
                          </Typography.Paragraph>
                          <Button type="link" onClick={() => navigate(`/apartments/${s.apartment.ID}`)} style={{ padding: 0 }}>
                            Xem chi tiết →
                          </Button>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              )
            }
          ]}
        />
      )}
    </Space>
  );
};

export default MyApartmentsPage;
