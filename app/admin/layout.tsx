import { AdminAccessProvider } from "@/components/AdminGate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAccessProvider>{children}</AdminAccessProvider>;
}
