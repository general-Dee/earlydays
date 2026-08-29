import * as fs from "fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { ref, getDownloadURL, uploadString, deleteObject } from "firebase/storage";

let testEnv: RulesTestEnvironment;

const OWNER_UID = "owner-uid";
const OTHER_UID = "other-uid";
const REPORT_PATH = `reports/${OWNER_UID}/report.pdf`;

function asOwner() {
  return testEnv.authenticatedContext(OWNER_UID).storage();
}

function asOther() {
  return testEnv.authenticatedContext(OTHER_UID).storage();
}

function asGuest() {
  return testEnv.unauthenticatedContext().storage();
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-earlydays",
    storage: { rules: fs.readFileSync("storage.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await uploadString(ref(ctx.storage(), REPORT_PATH), "fake pdf contents");
  });
});

describe("reports/{uid}/{fileName}", () => {
  it("lets the owner read their own report", async () => {
    await assertSucceeds(getDownloadURL(ref(asOwner(), REPORT_PATH)));
  });

  it("denies another authenticated user reading it", async () => {
    await assertFails(getDownloadURL(ref(asOther(), REPORT_PATH)));
  });

  it("denies an unauthenticated request reading it", async () => {
    await assertFails(getDownloadURL(ref(asGuest(), REPORT_PATH)));
  });

  it("denies writes from anyone, including the owner", async () => {
    await assertFails(uploadString(ref(asOwner(), REPORT_PATH), "overwritten"));
    await assertFails(deleteObject(ref(asOwner(), REPORT_PATH)));
  });
});

describe("any other path", () => {
  it("denies read and write to everyone", async () => {
    await assertFails(getDownloadURL(ref(asOwner(), "random/other/path.txt")));
    await assertFails(uploadString(ref(asOwner(), "random/other/path.txt"), "nope"));
  });
});
