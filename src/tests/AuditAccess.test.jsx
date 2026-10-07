// Level 1 can open Admin > Audit Trail, but not the rest of the admin console.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Menuitems, { filterMenuItems } from '../layouts/full/vertical/sidebar/MenuItems';
import ProtectedRoute from '../components/Auth/ProtectedRoute';
import AdminLayout from '../views/admin/AdminLayout';
import { canViewAuditTrail } from '../backend/config/groupConfig';

const IT_GROUP = '47e60a70-aeab-4f3e-80bd-940cc951622f';
const LEVEL1_GROUP = 'f47eca14-0206-4719-91c7-fba7b2be382c';
const CASE_GROUP = '59b40286-56c6-4b1e-8de2-854c7d91179b';

let groups = [];
vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ accounts: [{ idTokenClaims: { groups } }] }),
  useIsAuthenticated: () => true,
}));

const titles = (items) => items.map((i) => i.title || i.subheader).filter(Boolean);

describe('sidebar menu', () => {
  it('shows only the Audit Trail admin entry to Level 1', () => {
    const items = titles(filterMenuItems(Menuitems, { isAdmin: false, canViewAudit: true }));
    expect(items).toContain('Administration');
    expect(items).toContain('Audit Trail');
    expect(items).not.toContain('System Errors');
    expect(items).not.toContain('Reports & Analytics');
  });

  it('hides the admin section from other staff', () => {
    const items = titles(filterMenuItems(Menuitems, { isAdmin: false, canViewAudit: false }));
    expect(items).not.toContain('Administration');
    expect(items).not.toContain('Audit Trail');
  });

  it('shows everything to IT Admin', () => {
    const items = titles(filterMenuItems(Menuitems, { isAdmin: true, canViewAudit: true }));
    expect(items).toEqual(expect.arrayContaining(['System Errors', 'Audit Trail', 'Reports & Analytics']));
  });
});

const renderAdmin = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/admin" element={<ProtectedRoute canAccess={canViewAuditTrail}><AdminLayout /></ProtectedRoute>}>
        <Route path="audit" element={<div>Audit page</div>} />
        <Route path="errors" element={<ProtectedRoute adminOnly><div>Errors page</div></ProtectedRoute>} />
      </Route>
      <Route path="/unauthorized" element={<div>Access Denied</div>} />
    </Routes>
  </MemoryRouter>
);

describe('admin console access', () => {
  it('lets Level 1 open the audit trail, with only that link in the admin sidebar', () => {
    groups = [LEVEL1_GROUP];
    renderAdmin('/admin/audit');
    expect(screen.getByText('Audit page')).toBeInTheDocument();
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    expect(screen.queryByText('System Errors')).not.toBeInTheDocument();
    expect(screen.queryByText('Reports & Analytics')).not.toBeInTheDocument();
  });

  it('keeps Level 1 out of System Errors', () => {
    groups = [LEVEL1_GROUP];
    renderAdmin('/admin/errors');
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('keeps other staff out of the audit trail', () => {
    groups = [CASE_GROUP];
    renderAdmin('/admin/audit');
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('still gives IT Admin the full console', () => {
    groups = [IT_GROUP];
    renderAdmin('/admin/errors');
    expect(screen.getByText('Errors page')).toBeInTheDocument();
    expect(screen.getByText('System Errors')).toBeInTheDocument();
  });
});
