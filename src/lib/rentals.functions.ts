import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function getPublicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const RentalInputSchema = z.object({
  suit_id: z.string().uuid(),
  suit_size_id: z.string().uuid(),
  size_id: z.string().uuid(),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().optional(),
  start_date: z.string().date(),
  end_date: z.string().date(),
  notes: z.string().optional(),
});

export const listRentals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("rentals")
      .select("*, suits(name), sizes(name)")
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createRental = createServerFn({ method: "POST" })
  .inputValidator((input) => RentalInputSchema.parse(input))
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const { data: rental, error } = await supabase
      .from("rentals")
      .insert({
        suit_id: data.suit_id,
        suit_size_id: data.suit_size_id,
        size_id: data.size_id,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone ?? null,
        start_date: data.start_date,
        end_date: data.end_date,
        notes: data.notes ?? null,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rental;
  });

export const updateRentalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "confirmed", "active", "completed", "cancelled"]) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("rentals").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRental = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("rentals").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
