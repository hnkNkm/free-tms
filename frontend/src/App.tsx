import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import Layout from '@/components/Layout';
import PrivateRoute from '@/components/PrivateRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Employees from '@/pages/Employees';
import EmployeeProfile from '@/pages/EmployeeProfile';
import Skills from '@/pages/Skills';

function App() {
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <PrivateRoute>
              <Layout>
                <Employees />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/employees/:id"
          element={
            <PrivateRoute>
              <Layout>
                <EmployeeProfile />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/skills"
          element={
            <PrivateRoute>
              <Layout>
                <Skills />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/search"
          element={
            <PrivateRoute>
              <Layout>
                <div>検索（未実装）</div>
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/jobs"
          element={
            <PrivateRoute>
              <Layout>
                <div>ジョブ管理（未実装）</div>
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <Layout>
                <div>分析（未実装）</div>
              </Layout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;