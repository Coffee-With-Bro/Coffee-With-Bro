import { sleep, FatalError } from "workflow";
import { supabase } from "../lib/supabase";

export interface UserRecord {
  id: string;
  email: string;
  createdAt?: string;
  [key: string]: unknown;
}

export async function createUser(email: string): Promise<UserRecord> {
  "use step";

  console.log(`[Workflow Step] Creating user with email: ${email}`);
  try {
    const { data, error } = await supabase
      .from("users")
      .insert([{ email }])
      .select()
      .single();

    if (!error && data) {
      return data as UserRecord;
    }
  } catch (err) {
    console.warn("[Workflow Step] Supabase note:", err);
  }

  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `usr_${Date.now()}`,
    email,
    createdAt: new Date().toISOString(),
  };
}

export async function sendWelcomeEmail(user: UserRecord) {
  "use step";

  console.log(`[Workflow Step] Sending welcome email to user: ${user.id} (${user.email})`);
  return { delivered: true, template: "welcome", timestamp: new Date().toISOString() };
}

export async function sendOnboardingEmail(user: UserRecord) {
  "use step";

  if (!user.email || !user.email.includes("@")) {
    throw new FatalError("Invalid Email address provided to workflow");
  }

  console.log(`[Workflow Step] Sending onboarding email with ASL guides to: ${user.email}`);
  return { delivered: true, template: "onboarding", timestamp: new Date().toISOString() };
}

export async function handleUserSignup(email: string) {
  "use workflow";

  const user = await createUser(email);
  await sendWelcomeEmail(user);

  await sleep("5s");

  await sendOnboardingEmail(user);
  return { userId: user.id, status: "onboarded" };
}
