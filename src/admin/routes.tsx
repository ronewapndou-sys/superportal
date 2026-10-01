import type { RouteObject } from 'react-router-dom';
import Layout from './components/Layout';
import RequireRole from './components/RequireRole';
import AddUserPage from './pages/AddUserPage';
import AdminMenuPage from './pages/AdminMenuPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DovsAdminPage from './pages/DovsAdminPage';
import InstitutionsPage from './pages/InstitutionsPage';
import MyProfilePage from './pages/MyProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import UserActionPage from './pages/UserActionPage';
import UserManualPage from './pages/UserManualPage';
import UserSearchPage from './pages/UserSearchPage';

/**
 * Portal Admin: the XDS admin portal, used by XDS employees to manage XDS portal users, their access
 * and products, and web service passwords. Mounted under /admin inside the Mettus Central shell.
 */
export const adminRoutes: RouteObject[] = [
  {
    path: 'admin',
    element: <Layout />,
    children: [
      { index: true, element: <AdminMenuPage /> },
      { path: 'user-manual', element: <UserManualPage /> },
      {
        element: <RequireRole roles={['super', 'clientAdmin']} />,
        children: [
          { path: 'users/search', element: <UserSearchPage /> },
          { path: 'users/add', element: <AddUserPage /> },
          { path: 'users/deactivate', element: <UserActionPage key="deactivate" title="Deactivate User" subtitle="Remove a user's access" verb="Deactivate user" only="Active" /> },
          { path: 'users/activate', element: <UserActionPage key="activate" title="Activate User" subtitle="Restore access to a disabled account" verb="Activate user" only="Disabled" /> },
          { path: 'users/resend-mail', element: <UserActionPage key="resend" title="Resend Mail" subtitle="Resend the welcome email" verb="Resend welcome email" /> },
          { path: 'users/reset-password', element: <UserActionPage key="reset" title="Reset Password" subtitle="Reset a user's password" verb="Reset password" /> },
        ],
      },
      {
        element: <RequireRole roles={['super']} />,
        children: [
          { path: 'users/delete', element: <UserActionPage key="delete" title="Delete User" subtitle="Permanently remove a user" verb="Permanently delete user" danger /> },
          { path: 'institutions', element: <InstitutionsPage /> },
          { path: 'dovs-admin', element: <DovsAdminPage /> },
        ],
      },
      {
        element: <RequireRole roles={['clientAdmin', 'user']} />,
        children: [
          { path: 'account/profile', element: <MyProfilePage /> },
          { path: 'account/password', element: <ChangePasswordPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
