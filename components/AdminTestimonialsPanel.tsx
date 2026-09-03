"use client";

import AdminGate from "@/components/AdminGate";
import AdminTestimonialsList from "@/components/AdminTestimonialsList";

export default function AdminTestimonialsPanel() {
  return <AdminGate area="testimonials">{(user) => <AdminTestimonialsList user={user} />}</AdminGate>;
}
