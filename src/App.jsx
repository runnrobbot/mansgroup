import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { RequireAuth, RequireRole, PublicOnly, RoleRedirect } from './components/auth/RouteGuards'

// Lazy imports
const HomePage = lazy(() => import('./pages/HomePage'))
const MansLaterPage = lazy(() => import('./pages/MansLaterPage'))
const MansGadaiPage = lazy(() => import('./pages/MansGadaiPage'))
const TermsPage = lazy(() => import('./pages/legal/TermsPage'))
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'))

// Auth
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))

// User dashboard
const UserDashboard = lazy(() => import('./pages/dashboard/UserDashboard'))
const ApplyLoanPage = lazy(() => import('./pages/dashboard/ApplyLoanPage'))
const ApplyGadaiPage = lazy(() => import('./pages/dashboard/ApplyGadaiPage'))
const MyLoansPage = lazy(() => import('./pages/dashboard/MyLoansPage'))
const MyGadaiPage = lazy(() => import('./pages/dashboard/MyGadaiPage'))
const PaymentsPage = lazy(() => import('./pages/dashboard/PaymentsPage'))
const ProfilePage = lazy(() => import('./pages/dashboard/ProfilePage'))
const LoanDetailPage = lazy(() => import('./pages/dashboard/LoanDetailPage'))
const NotificationsPage = lazy(() => import('./pages/dashboard/NotificationsPage'))

// Staff
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard'))
const StaffReviewQueue = lazy(() => import('./pages/staff/StaffReviewQueue'))
const StaffGadaiPickup = lazy(() => import('./pages/staff/StaffGadaiPickup'))
const StaffWarehouse = lazy(() => import('./pages/staff/StaffWarehouse'))

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminApprovals = lazy(() => import('./pages/admin/AdminApprovals'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminBlacklist = lazy(() => import('./pages/admin/AdminBlacklist'))
const AdminTransactions = lazy(() => import('./pages/admin/AdminTransactions'))

// Founder
const FounderDashboard = lazy(() => import('./pages/founder/FounderDashboard'))
const FounderRevenue = lazy(() => import('./pages/founder/FounderRevenue'))
const FounderLoans = lazy(() => import('./pages/founder/FounderLoans'))
const FounderGadai = lazy(() => import('./pages/founder/FounderGadai'))
const FounderUsers = lazy(() => import('./pages/founder/FounderUsers'))
const FounderNPL = lazy(() => import('./pages/founder/FounderNPL'))
const FounderGrowth = lazy(() => import('./pages/founder/FounderGrowth'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Memuat halaman...</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/manslater" element={<MansLaterPage />} />
      <Route path="/mansgadai" element={<MansGadaiPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* Auth */}
      <Route path="/auth/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/auth/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route path="/auth/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
      <Route path="/auth" element={<Navigate to="/auth/login" replace />} />

      {/* Smart redirect */}
      <Route path="/me" element={<RequireAuth><RoleRedirect /></RequireAuth>} />

      {/* User Dashboard */}
      <Route path="/dashboard" element={<RequireAuth><RequireRole minRole="user"><UserDashboard /></RequireRole></RequireAuth>} />
      <Route path="/dashboard/loans" element={<RequireAuth><MyLoansPage /></RequireAuth>} />
      <Route path="/dashboard/loans/apply" element={<RequireAuth><ApplyLoanPage /></RequireAuth>} />
      <Route path="/dashboard/loans/:id" element={<RequireAuth><LoanDetailPage /></RequireAuth>} />
      <Route path="/dashboard/gadai" element={<RequireAuth><MyGadaiPage /></RequireAuth>} />
      <Route path="/dashboard/gadai/apply" element={<RequireAuth><ApplyGadaiPage /></RequireAuth>} />
      <Route path="/dashboard/payments" element={<RequireAuth><PaymentsPage /></RequireAuth>} />
      <Route path="/dashboard/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      <Route path="/dashboard/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />

      {/* Staff */}
      <Route path="/staff" element={<RequireAuth><RequireRole minRole="staff"><StaffDashboard /></RequireRole></RequireAuth>} />
      <Route path="/staff/review-queue" element={<RequireAuth><RequireRole minRole="staff"><StaffReviewQueue /></RequireRole></RequireAuth>} />
      <Route path="/staff/gadai-pickup" element={<RequireAuth><RequireRole minRole="staff"><StaffGadaiPickup /></RequireRole></RequireAuth>} />
      <Route path="/staff/warehouse" element={<RequireAuth><RequireRole minRole="staff"><StaffWarehouse /></RequireRole></RequireAuth>} />

      {/* Admin */}
      <Route path="/admin" element={<RequireAuth><RequireRole minRole="admin"><AdminDashboard /></RequireRole></RequireAuth>} />
      <Route path="/admin/approvals" element={<RequireAuth><RequireRole minRole="admin"><AdminApprovals /></RequireRole></RequireAuth>} />
      <Route path="/admin/users" element={<RequireAuth><RequireRole minRole="admin"><AdminUsers /></RequireRole></RequireAuth>} />
      <Route path="/admin/blacklist" element={<RequireAuth><RequireRole minRole="admin"><AdminBlacklist /></RequireRole></RequireAuth>} />
      <Route path="/admin/transactions" element={<RequireAuth><RequireRole minRole="admin"><AdminTransactions /></RequireRole></RequireAuth>} />

      {/* Founder */}
      <Route path="/founder" element={<RequireAuth><RequireRole role="founder"><FounderDashboard /></RequireRole></RequireAuth>} />
      <Route path="/founder/revenue" element={<RequireAuth><RequireRole role="founder"><FounderRevenue /></RequireRole></RequireAuth>} />
      <Route path="/founder/loans" element={<RequireAuth><RequireRole role="founder"><FounderLoans /></RequireRole></RequireAuth>} />
      <Route path="/founder/gadai" element={<RequireAuth><RequireRole role="founder"><FounderGadai /></RequireRole></RequireAuth>} />
      <Route path="/founder/users" element={<RequireAuth><RequireRole role="founder"><FounderUsers /></RequireRole></RequireAuth>} />
      <Route path="/founder/npl" element={<RequireAuth><RequireRole role="founder"><FounderNPL /></RequireRole></RequireAuth>} />
      <Route path="/founder/growth" element={<RequireAuth><RequireRole role="founder"><FounderGrowth /></RequireRole></RequireAuth>} />

      {/* 404 */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <p className="text-6xl font-900 text-slate-200 mb-4">404</p>
            <p className="text-slate-600 font-600 mb-6">Halaman tidak ditemukan</p>
            <a href="/" className="btn-primary text-sm">← Kembali ke Beranda</a>
          </div>
        </div>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '12px',
                background: '#fff',
                color: '#0F172A',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                padding: '12px 16px',
              },
              success: { iconTheme: { primary: '#2D6A4F', secondary: '#fff' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
              duration: 4000,
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
