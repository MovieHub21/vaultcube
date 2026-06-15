import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [addrs, bals, profile] = await Promise.all([
      supabase.from("wallet_addresses").select("network,address").eq("user_id", userId),
      supabase.rpc("get_my_token_balances"),
      supabase.from("profiles").select("username,display_name").eq("id", userId).maybeSingle(),
    ]);
    return {
      addresses: (addrs.data ?? []) as { network: string; address: string }[],
      balances: (bals.data ?? []) as { network: string; token: string; amount: number }[],
      profile: profile.data,
    };
  });

export const getMyTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

const SendSchema = z.object({
  toAddress: z.string().min(6).max(120),
  network: z.string().min(2).max(10),
  token: z.string().min(2).max(15),
  amount: z.number().positive().max(1_000_000_000),
  note: z.string().max(200).optional(),
});

export const sendFunds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SendSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Recipient must own an address on the SAME network as the token
    const { data: recipient } = await supabase
      .from("wallet_addresses")
      .select("user_id,network,address")
      .eq("address", data.toAddress)
      .eq("network", data.network)
      .maybeSingle();

    if (!recipient) throw new Error("Address not found on this network");
    if (recipient.user_id === userId) throw new Error("You cannot send to your own address");

    const { data: sender } = await supabase
      .from("wallet_addresses")
      .select("address")
      .eq("user_id", userId)
      .eq("network", data.network)
      .maybeSingle();
    if (!sender) throw new Error("Sender address not found");

    const { data: bals } = await supabase.rpc("get_my_token_balances");
    const bal = (bals ?? []).find(
      (b: { network: string; token: string; amount: number }) => b.network === data.network && b.token === data.token
    );
    if (!bal || Number(bal.amount) < data.amount) throw new Error(`Insufficient ${data.token} balance`);

    const { error } = await supabase.from("transactions").insert({
      from_user_id: userId,
      to_user_id: recipient.user_id,
      from_address: sender.address,
      to_address: recipient.address,
      network: data.network,
      token: data.token,
      amount: data.amount,
      note: data.note,
      kind: "transfer",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const FundSchema = z.object({
  network: z.string().min(2).max(10),
  token: z.string().min(2).max(15),
  amount: z.number().positive().max(10_000),
});

export const demoFund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FundSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: addr } = await supabase
      .from("wallet_addresses")
      .select("address")
      .eq("user_id", userId)
      .eq("network", data.network)
      .maybeSingle();
    if (!addr) throw new Error("Wallet address not found");
    const { error } = await supabase.from("transactions").insert({
      from_user_id: null,
      to_user_id: userId,
      from_address: "FAUCET",
      to_address: addr.address,
      network: data.network,
      token: data.token,
      amount: data.amount,
      note: "Demo faucet",
      kind: "faucet",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getWatchlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("watchlist").select("coin_id").eq("user_id", userId);
    return (data ?? []).map((r: { coin_id: string }) => r.coin_id);
  });

export const toggleWatchlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ coinId: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const existing = await supabase.from("watchlist").select("id").eq("user_id", userId).eq("coin_id", data.coinId).maybeSingle();
    if (existing.data) {
      await supabase.from("watchlist").delete().eq("id", existing.data.id);
      return { added: false };
    }
    await supabase.from("watchlist").insert({ user_id: userId, coin_id: data.coinId });
    return { added: true };
  });

const SwapSchema = z.object({
  fromNetwork: z.string().min(2).max(10),
  fromToken: z.string().min(2).max(15),
  toNetwork: z.string().min(2).max(10),
  toToken: z.string().min(2).max(15),
  fromAmount: z.number().positive().max(1_000_000_000),
  toAmount: z.number().positive().max(1_000_000_000),
});

export const swapTokens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SwapSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bals } = await supabase.rpc("get_my_token_balances");
    const bal = (bals ?? []).find(
      (b: { network: string; token: string; amount: number }) => b.network === data.fromNetwork && b.token === data.fromToken
    );
    if (!bal || Number(bal.amount) < data.fromAmount) throw new Error(`Insufficient ${data.fromToken} balance`);

    const { data: fromAddr } = await supabase.from("wallet_addresses").select("address").eq("user_id", userId).eq("network", data.fromNetwork).maybeSingle();
    const { data: toAddr } = await supabase.from("wallet_addresses").select("address").eq("user_id", userId).eq("network", data.toNetwork).maybeSingle();
    if (!fromAddr || !toAddr) throw new Error("Wallet address missing");

    const debit = await supabase.from("transactions").insert({
      from_user_id: userId, to_user_id: null,
      from_address: fromAddr.address, to_address: "SWAP",
      network: data.fromNetwork, token: data.fromToken, amount: data.fromAmount,
      kind: "swap_out", note: `Swap to ${data.toToken}`,
    });
    if (debit.error) throw new Error(debit.error.message);

    const credit = await supabase.from("transactions").insert({
      from_user_id: null, to_user_id: userId,
      from_address: "SWAP", to_address: toAddr.address,
      network: data.toNetwork, token: data.toToken, amount: data.toAmount,
      kind: "swap_in", note: `Swap from ${data.fromToken} (10% fee)`,
    });
    if (credit.error) throw new Error(credit.error.message);

    return { ok: true };
  });

