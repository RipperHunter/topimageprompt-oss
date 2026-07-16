import { redirect } from 'next/navigation';

// /admin redirects to the Library sub-page
export default function AdminIndexPage() {
  redirect('/admin/library');
}
