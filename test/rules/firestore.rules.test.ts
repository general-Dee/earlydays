import * as fs from "fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

let testEnv: RulesTestEnvironment;

const OWNER_UID = "owner-uid";
const OTHER_UID = "other-uid";

function asOwner() {
  return testEnv.authenticatedContext(OWNER_UID).firestore();
}

function asOther() {
  return testEnv.authenticatedContext(OTHER_UID).firestore();
}

function asGuest() {
  return testEnv.unauthenticatedContext().firestore();
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-earlydays",
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("parents/{uid}", () => {
  // Longer timeout: this is the first test to hit the emulator, so it also
  // pays the cold-start connection cost that later tests in this file don't.
  it(
    "lets the owner read their own doc, but denies self-service create",
    async () => {
      await testEnv.withSecurityRulesDisabled(async (ctx) => {
        await setDoc(doc(ctx.firestore(), "parents", OWNER_UID), {
          guardianName: "Aisha",
          email: "a@b.com",
          children: [],
          createdAt: Date.now(),
        });
      });

      await assertSucceeds(getDoc(doc(asOwner(), "parents", OWNER_UID)));

      // OTHER_UID has no parents doc yet — this is exactly the self-signup
      // shape (own uid, no admin-provisioned doc) that used to be allowed.
      await assertFails(
        setDoc(doc(asOther(), "parents", OTHER_UID), {
          guardianName: "Hijacker",
          email: "hijacker@b.com",
          children: [],
          createdAt: Date.now(),
        })
      );
    },
    15000
  );

  it("lets the owner self-service edit their guardianName and phone", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "parents", OWNER_UID), { guardianName: "Aisha" });
    });
    await assertSucceeds(updateDoc(doc(asOwner(), "parents", OWNER_UID), { guardianName: "Aisha B." }));
    await assertSucceeds(updateDoc(doc(asOwner(), "parents", OWNER_UID), { phone: "+2348000000000" }));
  });

  it("denies the owner updating any other field, even alongside an allowed one", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "parents", OWNER_UID), {
        guardianName: "Aisha",
        email: "a@b.com",
        children: [],
      });
    });
    await assertFails(updateDoc(doc(asOwner(), "parents", OWNER_UID), { email: "hijacked@b.com" }));
    await assertFails(updateDoc(doc(asOwner(), "parents", OWNER_UID), { children: [{ id: "x", name: "New Kid", stage: "n1" }] }));
    await assertFails(
      updateDoc(doc(asOwner(), "parents", OWNER_UID), { guardianName: "Aisha B.", email: "hijacked@b.com" })
    );
  });

  it("denies another authenticated user reading, creating, or updating it", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "parents", OWNER_UID), { guardianName: "Aisha" });
    });

    await assertFails(getDoc(doc(asOther(), "parents", OWNER_UID)));
    await assertFails(updateDoc(doc(asOther(), "parents", OWNER_UID), { guardianName: "Hijacked" }));
    await assertFails(setDoc(doc(asOther(), "parents", OWNER_UID), { guardianName: "Hijacked" }));
  });

  it("denies an unauthenticated request entirely", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "parents", OWNER_UID), { guardianName: "Aisha" });
    });
    await assertFails(getDoc(doc(asGuest(), "parents", OWNER_UID)));
  });

  it("denies delete even for the owner", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "parents", OWNER_UID), { guardianName: "Aisha" });
    });
    await assertFails(deleteDoc(doc(asOwner(), "parents", OWNER_UID)));
  });
});

describe("parents/{uid}/payments/{reference}", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "parents", OWNER_UID, "payments", "ref1"), {
        reference: "ref1",
        status: "success",
      });
    });
  });

  it("lets the owner read their own payment", async () => {
    await assertSucceeds(getDoc(doc(asOwner(), "parents", OWNER_UID, "payments", "ref1")));
  });

  it("denies another user reading it", async () => {
    await assertFails(getDoc(doc(asOther(), "parents", OWNER_UID, "payments", "ref1")));
  });

  it("denies writes from anyone, including the owner", async () => {
    await assertFails(setDoc(doc(asOwner(), "parents", OWNER_UID, "payments", "ref2"), { status: "pending" }));
  });
});

describe("parents/{uid}/reports/{reportId}", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "parents", OWNER_UID, "reports", "r1"), {
        childName: "Kid",
        term: "Term 1",
      });
    });
  });

  it("lets the owner read their own report", async () => {
    await assertSucceeds(getDoc(doc(asOwner(), "parents", OWNER_UID, "reports", "r1")));
  });

  it("denies another user reading it", async () => {
    await assertFails(getDoc(doc(asOther(), "parents", OWNER_UID, "reports", "r1")));
  });

  it("denies writes from anyone, including the owner", async () => {
    await assertFails(setDoc(doc(asOwner(), "parents", OWNER_UID, "reports", "r2"), { childName: "Kid" }));
  });
});

describe("announcements/{id}", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "announcements", "a1"), { title: "Hello" });
    });
  });

  it("allows any authenticated user to read", async () => {
    await assertSucceeds(getDoc(doc(asOwner(), "announcements", "a1")));
  });

  it("denies an unauthenticated request", async () => {
    await assertFails(getDoc(doc(asGuest(), "announcements", "a1")));
  });

  it("denies writes from anyone", async () => {
    await assertFails(setDoc(doc(asOwner(), "announcements", "a2"), { title: "Hijacked" }));
  });
});

describe("events/{id}", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "events", "e1"), { title: "Sports Day" });
    });
  });

  it("allows even an unauthenticated request to read", async () => {
    await assertSucceeds(getDoc(doc(asGuest(), "events", "e1")));
  });

  it("denies writes from anyone", async () => {
    await assertFails(setDoc(doc(asOwner(), "events", "e2"), { title: "Hijacked" }));
  });
});

describe("staff/{id}", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "staff", "s1"), { name: "Mrs. Grace A." });
    });
  });

  it("allows even an unauthenticated request to read", async () => {
    await assertSucceeds(getDoc(doc(asGuest(), "staff", "s1")));
  });

  it("denies writes from anyone", async () => {
    await assertFails(setDoc(doc(asOwner(), "staff", "s2"), { name: "Hijacked" }));
  });
});

describe("gallery/{id}", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "gallery", "g1"), { alt: "Campus photo" });
    });
  });

  it("allows even an unauthenticated request to read", async () => {
    await assertSucceeds(getDoc(doc(asGuest(), "gallery", "g1")));
  });

  it("denies writes from anyone", async () => {
    await assertFails(setDoc(doc(asOwner(), "gallery", "g2"), { alt: "Hijacked" }));
  });
});

describe("collections with no explicit rule fall through to the catch-all deny", () => {
  const paths: Array<[string, ...string[]]> = [
    ["applications", "app1"],
    ["inquiries", "i1"],
    ["blog", "b1"],
    ["testimonials", "t1"],
    ["settings", "term"],
    ["settings", "fees"],
    ["rateLimits", "contact:1.2.3.4"],
    ["adminUsers", "u1"],
    ["auditLog", "log1"],
  ];

  for (const [collectionName, id] of paths) {
    it(`denies both authenticated and unauthenticated access to ${collectionName}/${id}`, async () => {
      await assertFails(getDoc(doc(asOwner(), collectionName, id)));
      await assertFails(getDoc(doc(asGuest(), collectionName, id)));
      await assertFails(setDoc(doc(asOwner(), collectionName, id), { hijacked: true }));
    });
  }
});
