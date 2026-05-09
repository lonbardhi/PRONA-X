"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type AppRole, requireAdminUser } from "@/lib/supabase/server";

const roleOptions: AppRole[] = ["pending", "viewer", "agent", "manager", "admin"];

export async function updateUserRoleAction(formData: FormData) {
  const { supabase, user } = await requireAdminUser();
  const profileId = String(formData.get("profile_id") || "");
  const role = String(formData.get("role") || "") as AppRole;

  if (!profileId || !roleOptions.includes(role)) {
    redirect("/admin/users?message=Choose a valid user and role.");
  }

  if (profileId === user.id && role !== "admin") {
    redirect("/admin/users?message=You cannot remove your own admin access.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", profileId);

  if (error) {
    redirect(`/admin/users?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?message=User role updated.");
}
