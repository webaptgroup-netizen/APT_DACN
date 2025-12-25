import { App as AntdApp, Avatar, Badge, Button, Card, Form, Input, List, Select, Space, Tabs, Tag, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { FileImageOutlined, SendOutlined, ClockCircleOutlined, CheckCircleOutlined, SyncOutlined, MessageOutlined, UserOutlined, PictureOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import api from '../api/client';
import type { Complaint } from '../types';
import { useAuthStore } from '../store/useAuthStore';

type StatusOption = {
  label: string;
  value: Complaint['TrangThai'];
  color: string;
  icon: ReactNode;
};

const statusOptions: StatusOption[] = [
  { label: 'Chưa xử lý', value: 'Chua xu ly', color: '#ff4d4f', icon: <ClockCircleOutlined /> },
  { label: 'Đang xử lý', value: 'Dang xu ly', color: '#faad14', icon: <SyncOutlined spin /> },
  { label: 'Đã xử lý', value: 'Da xu ly', color: '#52c41a', icon: <CheckCircleOutlined /> }
];

const ComplaintsPage = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [activeStatusTab, setActiveStatusTab] = useState<Complaint['TrangThai']>('Chua xu ly');
  const [form] = Form.useForm();
  const { user } = useAuthStore();
  const { message } = AntdApp.useApp();
  const isManager = user?.role === 'Ban quan ly';

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/complaints');
      setComplaints(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadComplaints();
  }, []);

  const handleSubmit = async (values: { NoiDung: string; HinhAnh?: string }) => {
    await api.post('/complaints', values);
    message.success('Đã gửi phản ánh thành công! 🎉');
    form.resetFields();
    setImageUrl('');
    await loadComplaints();
  };

  const handleUpdate = async (item: Complaint, payload: Partial<Complaint>) => {
    await api.patch(`/complaints/${item.ID}`, payload);
    message.success('Đã cập nhật phản ánh! ✅');
    await loadComplaints();
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
        folder: 'complaints',
        fileName: file.name
      });
      form.setFieldsValue({ HinhAnh: data.url });
      setImageUrl(data.url);
      message.success('Đã tải ảnh lên thành công! 📸');
      return false;
    }
  };

  const complaintsByStatus = useMemo(() => {
    const grouped: Record<Complaint['TrangThai'], Complaint[]> = {
      'Chua xu ly': [],
      'Dang xu ly': [],
      'Da xu ly': []
    };

    for (const complaint of complaints) {
      grouped[complaint.TrangThai].push(complaint);
    }

    return grouped;
  }, [complaints]);

  const totalCount = complaints.length;
  const activeCount = complaintsByStatus[activeStatusTab].length;

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <h1 style={{ 
              color: 'white', 
              fontSize: 42, 
              fontWeight: 700,
              marginBottom: 8,
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
            }}>
              💬 Hệ Thống Phản Ánh
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
              Gửi phản ánh và theo dõi tiến độ xử lý
            </p>
          </div>

          {/* Form gửi phản ánh */}
          {user && !isManager && (
            <Card 
              style={{ 
                borderRadius: 20,
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                border: 'none',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: '2px solid #f0f0f0'
              }}>
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16
                }}>
                  <SendOutlined style={{ fontSize: 24, color: 'white' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Gửi Phản Ánh Mới</h2>
                  <p style={{ margin: 0, color: '#8c8c8c' }}>Chia sẻ vấn đề bạn gặp phải</p>
                </div>
              </div>

              <Form layout="vertical" form={form} onFinish={handleSubmit}>
                <Form.Item 
                  label={<span style={{ fontSize: 16, fontWeight: 500 }}>Nội dung phản ánh</span>}
                  name="NoiDung" 
                  rules={[{ required: true, message: 'Vui lòng nhập nội dung phản ánh' }]}
                >
                  <Input.TextArea 
                    rows={5} 
                    placeholder="Mô tả chi tiết sự cố hoặc vấn đề bạn gặp phải..."
                    style={{ 
                      borderRadius: 12,
                      fontSize: 15,
                      border: '2px solid #e8e8e8'
                    }}
                  />
                </Form.Item>

                <Form.Item name="HinhAnh" hidden>
                  <Input />
                </Form.Item>

                {imageUrl && (
                  <div style={{ 
                    marginBottom: 16,
                    padding: 16,
                    background: '#f6ffed',
                    borderRadius: 12,
                    border: '2px dashed #52c41a'
                  }}>
                    <img 
                      src={imageUrl} 
                      alt="Preview" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: 200, 
                        borderRadius: 8,
                        display: 'block',
                        margin: '0 auto'
                      }} 
                    />
                  </div>
                )}

                <Space size="middle">
                  <Upload {...uploadProps}>
                    <Button 
                      icon={<PictureOutlined />}
                      size="large"
                      style={{
                        borderRadius: 12,
                        height: 48,
                        paddingLeft: 24,
                        paddingRight: 24,
                        border: '2px dashed #d9d9d9',
                        fontWeight: 500
                      }}
                    >
                      Thêm Ảnh Minh Chứng
                    </Button>
                  </Upload>

                  <Button 
                    type="primary" 
                    htmlType="submit"
                    icon={<SendOutlined />}
                    size="large"
                    style={{
                      borderRadius: 12,
                      height: 48,
                      paddingLeft: 32,
                      paddingRight: 32,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: 16,
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                    }}
                  >
                    Gửi Phản Ánh
                  </Button>
                </Space>
              </Form>
            </Card>
          )}

          {/* Danh sách phản ánh */}
          <Card 
            style={{ 
              borderRadius: 20,
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              border: 'none',
              background: 'white'
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: 24,
              paddingBottom: 16,
              borderBottom: '2px solid #f0f0f0'
            }}>
              <div style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fa8c16 0%, #faad14 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16
              }}>
                <FileImageOutlined style={{ fontSize: 24, color: 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Danh Sách Phản Ánh</h2>
                <p style={{ margin: 0, color: '#8c8c8c' }}>
                  <Badge count={activeCount} style={{ backgroundColor: '#52c41a' }} />
                  <span style={{ marginLeft: 8 }}>Tổng số phản ánh</span>
                  <Tag style={{ marginLeft: 12, borderRadius: 999 }} color="default">
                    {totalCount}
                  </Tag>
                </p>
              </div>
            </div>

            <Tabs
              activeKey={activeStatusTab}
              onChange={(key) => setActiveStatusTab(key as Complaint['TrangThai'])}
              style={{ marginBottom: 16 }}
              items={statusOptions.map((tab) => ({
                key: tab.value,
                label: (
                  <Space size={10}>
                    <span style={{ color: tab.color }}>{tab.icon}</span>
                    <span>{tab.label}</span>
                    <Badge
                      count={complaintsByStatus[tab.value].length}
                      style={{ backgroundColor: tab.color }}
                      overflowCount={999}
                    />
                  </Space>
                )
              }))}
            />

            <List
              loading={loading}
              dataSource={complaintsByStatus[activeStatusTab]}
              renderItem={(item) => {
                const status = statusOptions.find((s) => s.value === item.TrangThai);
                return (
                  <List.Item
                    style={{
                      padding: 20,
                      marginBottom: 16,
                      background: 'linear-gradient(135deg, #fafafa 0%, #ffffff 100%)',
                      borderRadius: 16,
                      border: '2px solid #f0f0f0',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    actions={
                      isManager
                        ? [
                            <Select
                              key="status"
                              options={statusOptions.map(s => ({
                                ...s,
                                label: (
                                  <span>
                                    {s.icon} {s.label}
                                  </span>
                                )
                              }))}
                              value={item.TrangThai}
                              style={{ width: 180 }}
                              size="large"
                              onChange={(value) => handleUpdate(item, { TrangThai: value as Complaint['TrangThai'] })}
                            />,
                            <Button
                              key="reply"
                              type="primary"
                              icon={<MessageOutlined />}
                              style={{
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, #13c2c2 0%, #36cfc9 100%)',
                                border: 'none'
                              }}
                              onClick={() => {
                                const reply = window.prompt('Nhập phản hồi gửi cư dân', item.PhanHoi ?? '');
                                if (reply) handleUpdate(item, { PhanHoi: reply, TrangThai: 'Da xu ly' });
                              }}
                            >
                              Phản Hồi
                            </Button>
                          ]
                        : undefined
                    }
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size={56} 
                          icon={<UserOutlined />}
                          style={{ 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: '3px solid white',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                        />
                      }
                      title={
                        <Space size="middle">
                          <strong style={{ fontSize: 18 }}>{item.NguoiDungs?.HoTen ?? 'Ẩn danh'}</strong>
                          <Tag 
                            icon={status?.icon}
                            color={status?.color}
                            style={{ 
                              fontSize: 13,
                              padding: '4px 12px',
                              borderRadius: 20,
                              fontWeight: 500
                            }}
                          >
                            {status?.label}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space style={{ color: '#8c8c8c', fontSize: 14 }}>
                          <ClockCircleOutlined />
                          {dayjs(item.NgayGui).format('DD/MM/YYYY • HH:mm')}
                        </Space>
                      }
                    />
                    <div style={{ marginTop: 16 }}>
                      <p style={{ 
                        fontSize: 15, 
                        lineHeight: 1.6,
                        color: '#262626',
                        marginBottom: 12
                      }}>
                        {item.NoiDung}
                      </p>
                      
                      {item.HinhAnh && (
                        <div style={{ 
                          marginTop: 16,
                          padding: 12,
                          background: '#f5f5f5',
                          borderRadius: 12,
                          display: 'inline-block'
                        }}>
                          <img 
                            src={item.HinhAnh} 
                            alt="Ảnh minh chứng" 
                            style={{ 
                              maxWidth: 300, 
                              borderRadius: 8,
                              display: 'block',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }} 
                          />
                          <a 
                            href={item.HinhAnh} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ 
                              display: 'block',
                              marginTop: 8,
                              fontSize: 13,
                              textAlign: 'center'
                            }}
                          >
                            <FileImageOutlined /> Xem ảnh gốc
                          </a>
                        </div>
                      )}
                      
                      {item.PhanHoi && (
                        <Card 
                          size="small" 
                          style={{ 
                            marginTop: 16,
                            background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)',
                            border: '2px solid #95de64',
                            borderRadius: 12,
                            boxShadow: '0 2px 8px rgba(82, 196, 26, 0.15)'
                          }}
                        >
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <MessageOutlined style={{ marginRight: 8, color: '#52c41a', fontSize: 16 }} />
                              <strong style={{ color: '#52c41a', fontSize: 15 }}>Phản Hồi Từ Ban Quản Lý</strong>
                            </div>
                            <p style={{ 
                              marginBottom: 0, 
                              fontSize: 14,
                              lineHeight: 1.6,
                              color: '#262626'
                            }}>
                              {item.PhanHoi}
                            </p>
                          </Space>
                        </Card>
                      )}
                    </div>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Space>
      </div>
    </div>
  );
};

export default ComplaintsPage;
