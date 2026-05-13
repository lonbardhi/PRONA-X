"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type AppRole, requireAdminUser } from "@/lib/supabase/server";

const roleOptions: AppRole[] = [
  "pending",
  "viewer",
  "agent",
  "manager",
  "support",
  "admin",
];

export async function updateUserRoleAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser();
  const profileId = String(formData.get("profile_id") || "");
  const role = String(formData.get("role") || "") as AppRole;

  if (!profileId || !roleOptions.includes(role)) {
    redirect("/admin/users?message=Zgjidh nje perdorues dhe rol te vlefshem.");
  }

  if (profileId === user.id && role !== "admin") {
    redirect("/admin/users?message=Nuk mund te heqesh aksesin tend admin.");
  }

  const accountStatus = role === "pending" ? "pending_approval" : "active";
  let { error } = await supabase
    .from("profiles")
    .update({ account_status: accountStatus, role })
    .eq("id", profileId);

  if (error && error.message.includes("account_status")) {
    const fallback = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", profileId);
    error = fallback.error;
  }

  if (error) {
    redirect(
      `/admin/users?message=${encodeURIComponent("Roli nuk u perditesua. Provo perseri.")}`,
    );
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?message=Roli i perdoruesit u perditesua.");
}
