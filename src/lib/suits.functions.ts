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

const SuitInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category_id: z.string().uuid().optional(),
  color: z.string().optional(),
  price_per_day: z.coerce.number().min(0),
  images: z.array(z.string()).default([]),
});

const SuitWithSizesSchema = SuitInputSchema.extend({
  sizes: z.array(z.object({ size_id: z.string().uuid(), stock: z.coerce.number().min(0) })).default([]),
});

export const listSuits = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getPublicClient();
  const { data, error } = await supabase
    .from("suits")
    .select("*, categories(name), suit_sizes(*, sizes(name))")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getSuit = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = getPublicClient();
    const { data: suit, error } = await supabase
      .from("suits")
      .select("*, categories(name), suit_sizes(*, sizes(name)), rentals(id, start_date, end_date, status, suit_size_id)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return suit;
  });

export const createSuit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SuitWithSizesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: suit, error } = await context.supabase
      .from("suits")
      .insert({
        name: data.name,
        description: data.description ?? null,
        category_id: data.category_id ?? null,
        color: data.color ?? null,
        price_per_day: data.price_per_day,
        images: data.images,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.sizes.length > 0) {
      const { error: sizesError } = await context.supabase.from("suit_sizes").insert(
        data.sizes.map((s) => ({ suit_id: suit.id, size_id: s.size_id, stock: s.stock }))
      );
      if (sizesError) throw new Error(sizesError.message);
    }

    return suit;
  });

export const updateSuit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SuitWithSizesSchema.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("suits")
      .update({
        name: data.name,
        description: data.description ?? null,
        category_id: data.category_id ?? null,
        color: data.color ?? null,
        price_per_day: data.price_per_day,
        images: data.images,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await context.supabase.from("suit_sizes").delete().eq("suit_id", data.id);
    if (data.sizes.length > 0) {
      const { error: sizesError } = await context.supabase.from("suit_sizes").insert(
        data.sizes.map((s) => ({ suit_id: data.id, size_id: s.size_id, stock: s.stock }))
      );
      if (sizesError) throw new Error(sizesError.message);
    }

    return { ok: true };
  });

export const deleteSuit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("suits").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
