import { Routes, Route } from 'react-router-dom';
import { RequireAuth } from './components/auth/RequireAuth';
import { AppShell } from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import WorkflowEditor from './pages/WorkflowEditor';
import ExecutionHistory from './pages/ExecutionHistory';
import ExecutionDetail from './pages/ExecutionDetail';
import Settings from './pages/Settings';
import Login from './pages/Login';

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/auth/login" element={<Login />} />

      {/* All protected routes require authentication */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/executions" element={<ExecutionHistory />} />
          <Route path="/executions/:id" element={<ExecutionDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="/workflow/:id" element={<WorkflowEditor />} />
      </Route>
    </Routes>
  );
}
