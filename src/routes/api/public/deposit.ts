import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

// Inbound deposit webhook for cross-project transfers (e.g. Neo Exchange).
// External project signs the raw JSON body with HMAC-SHA256 using the shared
// secret NEO_DEPOSIT_WEBHOOK_SECRET and sends the hex digest in
// `x-deposit-signature`. We look up the destination wallet address on this
// project and credit the matching user. Idempotent on `external_tx_id`.

const Schema = z.object({
  to_address: z.string().min(6).max(120),
  network: z.string().min(2).max(10),
  token: z.string().min(2).max(15),
  amount: z.number().positive().max(1_000_000_000),
  external_tx_id: z.string().min(4).max(120),
  from_address: z.string().max(120).optional(),
  note: z.string().max(200).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/deposit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.NEO_DEPOSIT_WEBHOOK_SECRET;
        if (!secret) return json({ error: "Webhook not configured" }, 500);

        const raw = await request.text();
        const sig = request.headers.get("x-deposit-signature") ?? "";
        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(sig, "utf8");
        const b = Buffer.from(expected, "utf8");
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return json({ error: "Invalid signature" }, 401);
        }

        let parsed: z.infer<typeof Schema>;
        try {
          parsed = Schema.parse(JSON.parse(raw));
        } catch (e: any) {
          return json({ error: "Invalid payload", detail: e?.message }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find the destination user by address + network
        const { data: addr } = await supabaseAdmin
          .from("wallet_addresses")
          .select("user_id,address")
          .eq("address", parsed.to_address)
          .eq("network", parsed.network)
          .maybeSingle();

        if (!addr) return json({ error: "Unknown destination address" }, 404);

        // Idempotency: skip if we've already recorded this external tx
        const noteTag = `ext:${parsed.external_tx_id}`;
        const { data: existing } = await supabaseAdmin
          .from("transactions")
          .select("id")
          .eq("to_user_id", addr.user_id)
          .eq("network", parsed.network)
          .eq("token", parsed.token)
          .ilike("note", `%${noteTag}%`)
          .maybeSingle();

        if (existing) return json({ ok: true, duplicate: true, id: existing.id });

        const { data: inserted, error } = await supabaseAdmin
          .from("transactions")
          .insert({
            from_user_id: null,
            to_user_id: addr.user_id,
            from_address: parsed.from_address ?? "EXTERNAL",
            to_address: parsed.to_address,
            network: parsed.network,
            token: parsed.token,
            amount: parsed.amount,
            kind: "deposit",
            note: `${parsed.note ?? "Deposit from Neo Exchange"} (${noteTag})`,
          })
          .select("id")
          .single();
        if (error) return json({ error: error.message }, 500);

        return json({ ok: true, id: inserted!.id });
      },
    },
  },
});
