import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import type { Apartment, Building, Resident, UserSummary } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const ResidentsPage = () => {
  const { user } = useAuthStore();
  const { message } = AntdApp.useApp();
  const isManager = user?.role === 'Ban quan ly';

  const [residents, setResidents] = useState<Resident[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [referencesLoading, setReferencesLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState<{ buildingId?: number }>({});
  const [selectedBuilding, setSelectedBuilding] = useState<number>();

  const loadResidents = useCallback(
    async (buildingId?: number) => {
      setLoading(true);
      try {
        const { data } = await api.get('/residents', {
          params: buildingId ? { buildingId } : undefined
        });
        setResidents(data);
      } catch (err: any) {
        message.error(err.response?.data?.message ?? 'Không thể tải danh sách cư dân');
      } finally {
        setLoading(false);
      }
    },
    [message]
  );

  useEffect(() => {
    void loadResidents(filters.buildingId);
  }, [filters.buildingId, loadResidents]);

  useEffect(() => {
    if (!isManager) {
      return;
    }
    const loadReferences = async () => {
      setReferencesLoading(true);
      try {
        const [buildingRes, apartmentRes, userRes] = await Promise.all([
          api.get('/buildings'),
          api.get('/apartments'),
          api.get('/auth/users')
        ]);
        setBuildings(buildingRes.data);
        setApartments(apartmentRes.data);
        setUsers(userRes.data);
      } catch (err: any) {
        message.error(err.response?.data?.message ?? 'Không thể tải dữ liệu tham chiếu');
      } finally {
        setReferencesLoading(false);
      }
    };

    void loadReferences();
  }, [isManager, message]);

  const buildingOptions = useMemo(
    () => buildings.map((b) => ({ label: b.Ten, value: b.ID })),
    [buildings]
  );

  const buildingMap = useMemo(() => {
    const map = new Map<number, string>();
    buildings.forEach((b) => map.set(b.ID, b.Ten));
    return map;
  }, [buildings]);

  const apartmentOptions = useMemo(() => {
    if (!selectedBuilding) {
      return apartments.map((apt) => ({ label: apt.MaCan, value: apt.ID }));
    }
    return apartments
      .filter((apt) => apt.ID_ChungCu === selectedBuilding)
      .map((apt) => ({ label: apt.MaCan, value: apt.ID }));
  }, [apartments, selectedBuilding]);

  const availableUsers = useMemo(() => {
    const assigned = new Set(residents.map((resident) => resident.ID_NguoiDung));
    return users
      .filter((u) => !assigned.has(u.ID))
      .map((u) => ({
        label: `${u.HoTen} (${u.Email})`,
        value: u.ID
      }));
  }, [residents, users]);

  const handleOwnerToggle = useCallback(
    async (resident: Resident, isOwner: boolean) => {
      try {
        await api.post(`/residents/${resident.ID}/owner`, { isOwner });
        message.success(isOwner ? 'Đã đánh dấu chủ hộ' : 'Đã bỏ trạng thái chủ hộ');
        await loadResidents(filters.buildingId);
      } catch (err: any) {
        message.error(err.response?.data?.message ?? 'Không thể cập nhật chủ hộ');
      }
    },
    [filters.buildingId, loadResidents, message]
  );

  const handleDelete = useCallback(
    async (resident: Resident) => {
      try {
        await api.delete(`/residents/${resident.ID}`);
        message.success('Đã xóa cư dân khỏi căn hộ');
        await loadResidents(filters.buildingId);
      } catch (err: any) {
        message.error(err.response?.data?.message ?? 'Không thể xóa cư dân');
      }
    },
    [filters.buildingId, loadResidents, message]
  );

  const openModal = () => {
    form.resetFields();
    setSelectedBuilding(undefined);
    setModalOpen(true);
  };

  const handleModalSubmit = async () => {
    const values = await form.validateFields();
    try {
      setSaving(true);
      await api.post('/residents', {
        ID_NguoiDung: values.ID_NguoiDung,
        ID_ChungCu: values.ID_ChungCu,
        ID_CanHo: values.ID_CanHo,
        LaChuHo: values.LaChuHo ?? false
      });
      message.success('Đã gán cư dân cho căn hộ');
      setModalOpen(false);
      await loadResidents(filters.buildingId);
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Không thể gán cư dân');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<Resident> = useMemo(() => {
    const base: ColumnsType<Resident> = [
      {
        title: 'Cư dân',
        dataIndex: ['NguoiDungs', 'HoTen'],
        key: 'resident',
        render: (_: any, record) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{record.NguoiDungs?.HoTen ?? '---'}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.NguoiDungs?.Email}
            </Typography.Text>
          </Space>
        )
      },
      {
        title: 'Liên hệ',
        key: 'contact',
        render: (_, record) => record.NguoiDungs?.SoDienThoai ?? '---'
      },
      {
        title: 'Chung cư',
        dataIndex: 'ID_ChungCu',
        key: 'building',
        render: (value: number) => buildingMap.get(value) ?? value
      },
      {
        title: 'Căn hộ',
        dataIndex: ['CanHos', 'MaCan'],
        key: 'apartment',
        render: (val, record) => val ?? record.ID_CanHo
      },
      {
        title: 'Chủ hộ',
        dataIndex: 'LaChuHo',
        key: 'owner',
        render: (value: boolean) => (
          <Tag color={value ? 'green' : 'default'}>{value ? 'Chủ hộ' : 'Thành viên'}</Tag>
        )
      }
    ];

    if (isManager) {
      base.push({
        title: 'Thao tác',
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Button
              type="link"
              onClick={() => handleOwnerToggle(record, !record.LaChuHo)}
            >
              {record.LaChuHo ? 'Bỏ chủ hộ' : 'Đặt chủ hộ'}
            </Button>
            <Popconfirm
              title="Gỡ cư dân khỏi căn hộ?"
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" danger>
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        )
      });
    }

    return base;
  }, [buildingMap, handleDelete, handleOwnerToggle, isManager]);

  if (!isManager) {
    return (
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <div className="page-header">
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Thông tin cư dân
            </Typography.Title>
            <Typography.Text type="secondary">Theo dõi trạng thái cư trú và chủ hộ của căn hộ bạn.</Typography.Text>
          </div>
        </div>
        {loading ? (
          <Row gutter={[16, 16]}>
            {[1, 2].map((idx) => (
              <Col xs={24} md={12} key={idx}>
                <Card loading style={{ borderRadius: 20 }} />
              </Col>
            ))}
          </Row>
        ) : residents.length ? (
          <Row gutter={[16, 16]}>
            {residents.map((resident) => (
              <Col xs={24} md={12} key={resident.ID}>
                <Card style={{ borderRadius: 20 }}>
                  <Typography.Title level={4} style={{ marginTop: 0 }}>
                    {resident.NguoiDungs?.HoTen ?? '---'}
                  </Typography.Title>
                  <Typography.Text type="secondary">{resident.NguoiDungs?.Email}</Typography.Text>
                  <div style={{ marginTop: 12 }}>
                    <Tag color={resident.LaChuHo ? 'green' : 'default'}>
                      {resident.LaChuHo ? 'Chủ hộ' : 'Thành viên'}
                    </Tag>
                  </div>
                  <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                    Căn hộ: <strong>{resident.CanHos?.MaCan ?? resident.ID_CanHo}</strong>
                  </Typography.Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="Chưa có thông tin cư trú" />
        )}
      </Space>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Quản lý cư dân & chủ hộ
          </Typography.Title>
          <Typography.Text type="secondary">Gán cư dân cho căn hộ, phân bổ chủ hộ và đồng bộ quyền hệ thống.</Typography.Text>
        </div>
        <Space>
          <Select
            allowClear
            placeholder="Lọc chung cư"
            style={{ minWidth: 200 }}
            options={buildingOptions}
            value={filters.buildingId}
            onChange={(value) =>
              setFilters((prev) => ({
                ...prev,
                buildingId: value ?? undefined
              }))
            }
            loading={referencesLoading}
          />
          <Button type="primary" onClick={openModal} loading={referencesLoading}>
            Gán cư dân
          </Button>
        </Space>
      </div>

      <Table
        rowKey="ID"
        columns={columns}
        dataSource={residents}
        loading={loading}
        bordered
      />

      <Modal
        title="Gán cư dân vào căn hộ"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleModalSubmit}
        okText="Lưu"
        confirmLoading={saving}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Người dùng"
            name="ID_NguoiDung"
            rules={[{ required: true, message: 'Chọn người dùng' }]}
          >
            <Select
              showSearch
              placeholder="Chọn cư dân"
              options={availableUsers}
              optionFilterProp="label"
              loading={referencesLoading}
            />
          </Form.Item>
          <Form.Item
            label="Chung cư"
            name="ID_ChungCu"
            rules={[{ required: true, message: 'Chọn chung cư' }]}
          >
            <Select
              placeholder="Chọn chung cư"
              options={buildingOptions}
              onChange={(value) => {
                setSelectedBuilding(value);
                form.setFieldsValue({ ID_CanHo: undefined });
              }}
              loading={referencesLoading}
            />
          </Form.Item>
          <Form.Item
            label="Căn hộ"
            name="ID_CanHo"
            rules={[{ required: true, message: 'Chọn căn hộ' }]}
          >
            <Select
              placeholder="Chọn căn hộ"
              options={apartmentOptions}
              loading={referencesLoading}
              disabled={!apartmentOptions.length}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item label="Đặt chủ hộ" name="LaChuHo" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ResidentsPage;
