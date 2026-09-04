export const COLLECTIONS = {
  announcements: "announcements",
  applications: "applications",
  inquiries: "inquiries",
  events: "events",
  parents: "parents",
  reports: "reports",
  payments: "payments",
  staff: "staff",
  blog: "blog",
  gallery: "gallery",
  testimonials: "testimonials",
  faqs: "faqs",
  subscribers: "subscribers",
  rsvps: "rsvps",
  settings: "settings",
  rateLimits: "rateLimits",
  adminUsers: "adminUsers",
  auditLog: "auditLog",
} as const;

export const paths = {
  parent: (uid: string) => `${COLLECTIONS.parents}/${uid}`,
  payments: (uid: string) => `${COLLECTIONS.parents}/${uid}/${COLLECTIONS.payments}`,
  payment: (uid: string, reference: string) => `${paths.payments(uid)}/${reference}`,
  eventRsvps: (eventId: string) => `${COLLECTIONS.events}/${eventId}/${COLLECTIONS.rsvps}`,
  eventRsvp: (eventId: string, rsvpId: string) => `${paths.eventRsvps(eventId)}/${rsvpId}`,
};
