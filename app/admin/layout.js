import '../admin.css';

export const dynamic = 'force-dynamic';

// Admin layout: no public Navbar or Footer — admin has its own sidebar
export default function AdminLayout({ children }) {
  return (
    <div className="admin-layout-wrapper" style={{ display: 'flex', minHeight: '100vh' }}>
      {children}
    </div>
  );
}
