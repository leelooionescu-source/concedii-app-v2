import { createClient } from "@/lib/supabase/client";

type Action = "create" | "update" | "delete";

export async function logActivity(
  action: Action,
  entityType: string,
  entityId: string | null,
  entityLabel: string,
  details?: Record<string, unknown>
) {
  try {
    const supabase = createClient();
    await supabase.from("activity_log").insert({
      user_email: "concedii-app",
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      details: details || {},
    });
  } catch {
    // Nu blocam operatia principala daca logarea esueaza
  }
}
