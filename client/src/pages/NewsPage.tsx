import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Table,
  Typography,
  Upload,
  Image
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import type { News } from '../types';
import { useAuthStore } from '../store/useAuthStore';

const NewsPage = () => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuthStore();
  const { message } = AntdApp.useApp();
  const isManager = user?.role === 'Ban quan ly';

  const loadNews = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/news');
      setNews(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNews();
  }, [loadNews]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await api.post('/news', values);
    message.success('Đã đăng bài viết');
    setModalOpen(false);
    form.resetFields();
    await loadNews();
  };

  const handleDelete = async (record: News) => {
    await api.delete(`/news/${record.ID}`);
    message.success('Đã xóa bài viết');
    await loadNews();
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const uploadProps: UploadProps = {
    showUploadList: false,
    beforeUpload: async (file) => {
      const dataUrl = await fileToBase64(file);
      const { data } = await api.post('/storage/upload', {
        base64: dataUrl,
        folder: 'news',
        fileName: file.name
      });
      form.setFieldsValue({ HinhAnh: data.url });
      message.success('Đã tải ảnh lên');
      return false;
    }
  };

  const renderResidentView = () => {
    if (loading) {
      return (
        <Row gutter={[16, 16]}>
          {[1, 2, 3].map((idx) => (
            <Col xs={24} md={12} xl={8} key={idx}>
              <Card loading style={{ borderRadius: 20, height: '100%' }} />
            </Col>
          ))}
        </Row>
      );
    }

    if (!news.length) {
      return <Empty description="Chưa có tin tức nào" />;
    }

    return (
      <Row gutter={[16, 16]}>
        {news.map((item) => (
          <Col xs={24} md={12} xl={8} key={item.ID}>
            <Card style={{ borderRadius: 20, height: '100%' }}>
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                {item.TieuDe}
              </Typography.Title>
              <Typography.Text type="secondary">
                {dayjs(item.NgayDang).format('DD/MM/YYYY HH:mm')}
              </Typography.Text>
              <Typography.Paragraph style={{ marginTop: 12 }}>
                {item.NoiDung}
              </Typography.Paragraph>
              {item.HinhAnh && (
                <>
                  <Image
                    src={item.HinhAnh}
                    alt={item.TieuDe}
                    style={{ marginTop: 12, borderRadius: 12 }}
                    width="100%"
                  />
                  <Typography.Link href={item.HinhAnh} target="_blank">
                    Xem hình ảnh
                  </Typography.Link>
                </>
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
              Bản tin cư dân
            </Typography.Title>
            <Typography.Text type="secondary">
              Theo dõi thông báo mới nhất từ ban quản lý & cộng đồng.
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
        <Typography.Title level={3} style={{ margin: 0 }}>
          Tin tức & truyền thông
        </Typography.Title>
        {isManager && (
          <Button type="primary" onClick={() => setModalOpen(true)}>
            Đăng bài mới
          </Button>
        )}
      </div>

      <Table
        rowKey="ID"
        dataSource={news}
        loading={loading}
        bordered
        columns={newsColumns(handleDelete, isManager)}
      />

      <Modal
        title="Đăng bài mới"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText="Đăng bài"
      >
        <Form layout="vertical" form={form}>
          <Form.Item label="Tiêu đề" name="TieuDe" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Nội dung" name="NoiDung" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item label="Hình ảnh" name="HinhAnh">
            <Input placeholder="URL ảnh" />
          </Form.Item>
          <Upload {...uploadProps}>
            <Button type="dashed">Tải ảnh lên Supabase</Button>
          </Upload>
        </Form>
      </Modal>
    </>
  );
};

export default NewsPage;

const newsColumns = (
  onDelete: (record: News) => void,
  isManager: boolean
): ColumnsType<News> => {
  const base: ColumnsType<News> = [
    { title: 'Tiêu đề', dataIndex: 'TieuDe', key: 'TieuDe' },
    {
      title: 'Ngày đăng',
      dataIndex: 'NgayDang',
      key: 'NgayDang',
      render: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm')
    },
    { title: 'Nội dung', dataIndex: 'NoiDung', key: 'NoiDung' },
    {
      title: 'Hình ảnh',
      dataIndex: 'HinhAnh',
      key: 'HinhAnh',
      render: (val?: string) =>
        val ? (
          <Image
            src={val}
            width={64}
            height={48}
            style={{ objectFit: 'cover', borderRadius: 8 }}
          />
        ) : (
          '-'
        )
    }
  ];

  if (isManager) {
    base.push({
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm
          title="Xóa bài viết này?"
          onConfirm={() => onDelete(record)}
        >
          <Button danger type="link">
            Xóa
          </Button>
        </Popconfirm>
      )
    });
  }

  return base;
};
