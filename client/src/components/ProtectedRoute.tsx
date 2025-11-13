import { Spin } from 'antd';
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, user, fetchProfile, loading, hydrated } = useAuthStore();

  useEffect(() => {
    if (hydrated && token && !user && !loading) {
      void fetchProfile();
    }
  }, [hydrated, token, user, loading, fetchProfile]);

  if (!hydrated) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
