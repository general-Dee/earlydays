export const COLLECTIONS = {
  announcements: "announcements",
  applications: "applications",
  inquiries: "inquiries",
  events: "events",
  parents: "parents",
  reports: "reports",
  payments: "payments",
} as const;

export const paths = {
  parent: (uid: string) => `${COLLECTIONS.parents}/${uid}`,
  payments: (uid: string) => `${COLLECTIONS.parents}/${uid}/${COLLECTIONS.payments}`,
  payment: (uid: string, reference: string) => `${paths.payments(uid)}/${reference}`,
};
