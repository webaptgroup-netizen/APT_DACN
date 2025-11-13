import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Table,
  Tag,
  Typography
} from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import type { Building } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const BuildingsPage = () => {
  const [data, setData] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Building | null>(null);
  const [form] = Form.useForm();
  const { user } = useAuthStore();
  const { message } = AntdApp.useApp();

  const isManager = user?.role === 'Ban quan ly';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/buildings');
      setData(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openModal = (record?: Building) => {
    if (record) {
      setEditing(record);
      form.setFieldsValue({
        Ten: record.Ten,
        DiaChi: record.DiaChi,
        ChuDauTu: record.ChuDauTu,
        NamXayDung: record.NamXayDung,
        SoTang: record.SoTang,
        MoTa: record.MoTa
      });
    } else {
      setEditing(null);
      form.resetFields();
    }
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await api.put(`/buildings/${editing.ID}`, values);
        message.success('Đã cập nhật chung cư');
      } else {
        await api.post('/buildings', values);
        message.success('Đã thêm chung cư mới');
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Không thể lưu chung cư');
    }
  };

  const handleDelete = async (record: Building) => {
    try {
      await api.delete(`/buildings/${record.ID}`);
      message.success('Đã xóa chung cư');
      await loadData();
    } catch (err: any) {
      message.error(err.response?.data?.message ?? 'Không thể xóa');
    }
  };

  const columns: ColumnsType<Building> = useMemo(() => {
    const base: ColumnsType<Building> = [
      { title: 'Tên', dataIndex: 'Ten', key: 'Ten' },
      { title: 'Địa chỉ', dataIndex: 'DiaChi', key: 'DiaChi', width: 280 },
      { title: 'Chủ đầu tư', dataIndex: 'ChuDauTu', key: 'ChuDauTu' },
      {
        title: 'Năm hoàn thành',
        dataIndex: 'NamXayDung',
        key: 'NamXayDung',
        render: (val?: number) => (val ? <Tag color="blue">{val}</Tag> : '-')
      },
      {
        title: 'Số tầng',
        dataIndex: 'SoTang',
        key: 'SoTang',
        render: (val?: number) => (val ? <Tag>{val}</Tag> : '-')
      }
    ];
    if (isManager) {
      base.push({
        title: 'Thao tác',
        key: 'actions',
        fixed: 'right',
        render: (_, record) => (
          <Space>
            <Button type="link" onClick={() => openModal(record)}>
              Chỉnh sửa
            </Button>
            <Popconfirm title="Xóa chung cư này?" onConfirm={() => handleDelete(record)}>
              <Button type="link" danger>
                Xóa
              </Button>
            </Popconfirm>
          </Space>
        )
      });
    }
    return base;
  }, [isManager]);

  const renderResidentView = () => {
    if (loading) {
      return (
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map((skeleton) => (
            <Col xs={24} md={12} xl={8} key={skeleton}>
              <Card loading style={{ borderRadius: 20, height: '100%' }} />
            </Col>
          ))}
        </Row>
      );
    }

    if (!data.length) {
      return <Empty description="Chưa có dữ liệu chung cư" />;
    }

    return (
      <Row gutter={[16, 16]}>
        {data.map((building) => (
          <Col xs={24} md={12} xl={8} key={building.ID}>
            <Card style={{ borderRadius: 20, height: '100%' }} title={building.Ten}>
              <Typography.Paragraph type="secondary">{building.DiaChi}</Typography.Paragraph>
              <Space size="small" wrap>
                {building.NamXayDung && <Tag color="blue">{building.NamXayDung}</Tag>}
                {building.SoTang && <Tag>{building.SoTang} tầng</Tag>}
                {building.ChuDauTu && <Tag color="purple">{building.ChuDauTu}</Tag>}
              </Space>
              {building.MoTa && (
                <Typography.Paragraph style={{ marginTop: 12 }}>{building.MoTa}</Typography.Paragraph>
              )}
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  if (!isManager) {
    return (
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <div className="page-header">
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Danh sách chung cư
            </Typography.Title>
            <Typography.Text type="secondary">
              Xem nhanh thông tin dự án, vị trí và tiện ích để lựa chọn nơi ở phù hợp.
            </Typography.Text>
          </div>
        </div>
        {renderResidentView()}
      </Space>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Danh sách chung cư
          </Typography.Title>
          <Typography.Text type="secondary">Quản lý dự án, tòa nhà và thông tin chung</Typography.Text>
        </div>
        {isManager && (
          <Button type="primary" onClick={() => openModal()}>
            Thêm chung cư
          </Button>
        )}
      </div>

      <Table
        rowKey="ID"
        loading={loading}
        dataSource={data}
        columns={columns}
        bordered
        scroll={{ x: 900 }}
      />

      <Modal
        title={editing ? 'Chỉnh sửa chung cư' : 'Thêm chung cư'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Lưu"
      >
        <Form layout="vertical" form={form}>
          <Form.Item label="Tên" name="Ten" rules={[{ required: true, message: 'Nhập tên chung cư' }]}>
            <Input placeholder="APT Skyline" />
          </Form.Item>
          <Form.Item label="Địa chỉ" name="DiaChi" rules={[{ required: true, message: 'Nhập địa chỉ' }]}>
            <Input placeholder="123 Hoa Phượng, TP.HCM" />
          </Form.Item>
          <Form.Item label="Chủ đầu tư" name="ChuDauTu">
            <Input placeholder="PHQ Group" />
          </Form.Item>
          <Form.Item label="Năm xây dựng" name="NamXayDung">
            <InputNumber style={{ width: '100%' }} placeholder="2020" />
          </Form.Item>
          <Form.Item label="Số tầng" name="SoTang">
            <InputNumber style={{ width: '100%' }} placeholder="25" />
          </Form.Item>
          <Form.Item label="Mô tả" name="MoTa">
            <Input.TextArea rows={3} placeholder="Mô tả tiện ích, quy mô..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default BuildingsPage;
