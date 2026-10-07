// Admin > Nursing / Behavioral Health: IT Admin sees both,
// HOPE_nursing_admin / HOPE_behavioral_admin their own, nobody else.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/Auth/ProtectedRoute';
import AdminLayout from '../views/admin/AdminLayout';
import {
  DOCUMENTATION_REPORT_GROUPS, canOpenAdminConsole, canViewAuditTrail,
  canViewNursingReport, canViewBehavioralReport,
} from '../backend/config/groupConfig';

// The real Object Ids are filled in once known; use sample ones here
DOCUMENTATION_REPORT_GROUPS.nursing = 'nursing-admin-group';
DOCUMENTATION_REPORT_GROUPS.behavioral = 'behavioral-admin-group';

const IT_GROUP = '47e60a70-aeab-4f3e-80bd-940cc951622f';
const LEVEL1_GROUP = 'f47eca14-0206-4719-91c7-fba7b2be382c';

let groups = [];
vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ accounts: [{ idTokenClaims: { groups } }] }),
  useIsAuthenticated: () => true,
}));

// Same shape as the /admin branch in App.jsx
const renderAdmin = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/admin" element={<ProtectedRoute canAccess={canOpenAdminConsole}><AdminLayout /></ProtectedRoute>}>
        <Route path="audit" element={<ProtectedRoute canAccess={canViewAuditTrail}><div>Audit page</div></ProtectedRoute>} />
        <Route path="nursing" element={<ProtectedRoute canAccess={canViewNursingReport}><div>Nursing page</div></ProtectedRoute>} />
        <Route path="behavioral" element={<ProtectedRoute canAccess={canViewBehavioralReport}><div>Behavioral page</div></ProtectedRoute>} />
      </Route>
      <Route path="/unauthorized" element={<div>Access Denied</div>} />
    </Routes>
  </MemoryRouter>
);

describe('documentation report access', () => {
  it('gives the nursing admin group the Nursing report and nothing else', () => {
    groups = ['nursing-admin-group'];
    renderAdmin('/admin/nursing');
    expect(screen.getByText('Nursing page')).toBeInTheDocument();
    expect(screen.getByText('Nursing (S5)')).toBeInTheDocument();
    expect(screen.queryByText('Behavioral Health (S1–4)')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Trail')).not.toBeInTheDocument();
  });

  it('keeps the nursing admin group out of the Behavioral report and the audit trail', () => {
    groups = ['nursing-admin-group'];
    renderAdmin('/admin/behavioral');
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('gives the behavioral admin group the Behavioral report only', () => {
    groups = ['behavioral-admin-group'];
    renderAdmin('/admin/behavioral');
    expect(screen.getByText('Behavioral page')).toBeInTheDocument();
    expect(screen.queryByText('Nursing (S5)')).not.toBeInTheDocument();
  });

  it('keeps Level 1 out of both reports', () => {
    groups = [LEVEL1_GROUP];
    renderAdmin('/admin/nursing');
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('gives IT Admin both reports', () => {
    groups = [IT_GROUP];
    renderAdmin('/admin/nursing');
    expect(screen.getByText('Nursing page')).toBeInTheDocument();
    expect(screen.getByText('Behavioral Health (S1–4)')).toBeInTheDocument();
  });
});
