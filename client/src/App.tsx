import { App as AntdApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import ApartmentsPage from './pages/ApartmentsPage';
import BuildingsPage from './pages/BuildingsPage';
import ComplaintsPage from './pages/ComplaintsPage';
import DashboardPage from './pages/Dashboard';
import InvoicesPage from './pages/InvoicesPage';
import LoginPage from './pages/Login';
import NewsPage from './pages/NewsPage';
import InteriorDesignerPage from './pages/InteriorDesignerPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/Register';
import ForgotPasswordRequestPage from './pages/ForgotPasswordRequest';
import ForgotPasswordVerifyPage from './pages/ForgotPasswordVerify';
import ForgotPasswordResetPage from './pages/ForgotPasswordReset';
import ServicesPage from './pages/ServicesPage';
import ResidentsPage from './pages/ResidentsPage';
import UsersPage from './pages/UsersPage';
import BuildingDetailPage from './pages/BuildingDetailPage';
import ApartmentDetailPage from './pages/ApartmentDetailPage';
import ChatPanel from './components/ChatPanel';
import MyApartmentsPage from './pages/MyApartmentsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'buildings', element: <BuildingsPage /> },
      { path: 'buildings/:id', element: <BuildingDetailPage /> },
      { path: 'apartments', element: <ApartmentsPage /> },
      { path: 'apartments/my', element: <MyApartmentsPage /> },
      { path: 'apartments/:id', element: <ApartmentDetailPage /> },
      { path: 'services', element: <ServicesPage /> },
      { path: 'residents', element: <ResidentsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
      { path: 'news', element: <NewsPage /> },
      { path: 'complaints', element: <ComplaintsPage /> },
      { path: 'interior', element: <InteriorDesignerPage /> },
      { path: 'profile', element: <ProfilePage /> }
    ]
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordRequestPage /> },
  { path: '/forgot-password/verify', element: <ForgotPasswordVerifyPage /> },
  { path: '/forgot-password/reset', element: <ForgotPasswordResetPage /> }
]);

function App() {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#2563eb',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        },
        components: {
          Layout: {
            headerBg: 'rgba(255,255,255,0.9)',
            siderBg: 'rgba(15,23,42,0.96)',
            bodyBg: 'transparent'
          },
          Card: {
            colorBgContainer: 'rgba(255,255,255,0.85)',
            borderRadiusLG: 20
          },
          Modal: {
            colorBgElevated: 'rgba(255,255,255,0.9)',
            borderRadiusLG: 18
          }
        }
      }}
    >
      <AntdApp>
        <RouterProvider router={router} />
        <ChatPanel />
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
