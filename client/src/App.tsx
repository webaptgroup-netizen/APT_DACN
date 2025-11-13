import { App as AntdApp, ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import './App.css';
import ChatbotWidget from './components/ChatbotWidget';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import ApartmentsPage from './pages/ApartmentsPage';
import BuildingsPage from './pages/BuildingsPage';
import ComplaintsPage from './pages/ComplaintsPage';
import DashboardPage from './pages/Dashboard';
import InvoicesPage from './pages/InvoicesPage';
import LoginPage from './pages/Login';
import NewsPage from './pages/NewsPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/Register';
import ServicesPage from './pages/ServicesPage';
import ResidentsPage from './pages/ResidentsPage';

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
      { path: 'apartments', element: <ApartmentsPage /> },
      { path: 'services', element: <ServicesPage /> },
      { path: 'residents', element: <ResidentsPage /> },
      { path: 'invoices', element: <InvoicesPage /> },
      { path: 'news', element: <NewsPage /> },
      { path: 'complaints', element: <ComplaintsPage /> },
      { path: 'profile', element: <ProfilePage /> }
    ]
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> }
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
            headerBg: '#ffffff',
            siderBg: '#0f172a',
            bodyBg: '#f5f6fa'
          }
        }
      }}
    >
      <AntdApp>
        <RouterProvider router={router} />
        <ChatbotWidget />
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
