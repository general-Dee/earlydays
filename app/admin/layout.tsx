import { AdminAccessProvider } from "@/components/AdminGate";
import AdminNav from "@/components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAccessProvider>
      <div className="bg-paper">
        <div className="wrap">
          <AdminNav />
        </div>
        {children}
      </div>
    </AdminAccessProvider>
  );
}
