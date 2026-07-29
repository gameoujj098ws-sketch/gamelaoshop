import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ACCOUNT_NAME_TOKENS = ["SOMYONE", "KHAMKHEUNG"];
const EXPIRE_MINUTES = 15;

function genRef() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "GL";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function sha256Hex(bytes: Uint8Array) {
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- create ----------
export const createTopupRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ amount: z.number().int().min(1000).max(10_000_000) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Cancel any expired pending
    await supabase
      .from("topup_requests")
      .update({ status: "expired" })
      .eq("user_id", userId)
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    // Active one?
    const { data: existing } = await supabase
      .from("topup_requests")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && existing.amount === data.amount) return { request: existing };

    // Cancel other pending
    if (existing) {
      await supabase
        .from("topup_requests")
        .update({ status: "canceled" })
        .eq("id", existing.id);
    }

    const expiresAt = new Date(Date.now() + EXPIRE_MINUTES * 60 * 1000).toISOString();
    const { data: created, error } = await supabase
      .from("topup_requests")
      .insert({
        user_id: userId,
        amount: data.amount,
        status: "pending",
        reference_code: genRef(),
        expires_at: expiresAt,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { request: created };
  });

// ---------- fetch active ----------
export const getActiveTopup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("topup_requests")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { request: data ?? null };
  });

// ---------- cancel ----------
export const cancelTopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("topup_requests")
      .update({ status: "canceled" })
      .eq("id", data.id)
      .eq("user_id", userId);
    return { ok: true };
  });

// ---------- submit slip ----------
const submitInput = z.object({
  request_id: z.string().uuid(),
  image_base64: z.string().min(100),
  mime: z.string().regex(/^image\/(png|jpe?g|webp)$/),
});

type VerdictJson = {
  amount: number | null;
  receiver_name: string | null;
  reference: string | null;
  transfer_datetime: string | null;
  looks_authentic: boolean;
  confidence: number;
};

export const submitSlip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => submitInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: req, error: reqErr } = await supabase
      .from("topup_requests")
      .select("*")
      .eq("id", data.request_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);
    if (!req) throw new Error("ບໍ່ພົບລາຍການເຕີມເງິນ");
    if (req.status !== "pending") throw new Error("ລາຍການນີ້ຖືກປິດແລ້ວ");
    if (new Date(req.expires_at).getTime() < Date.now()) {
      await supabase.from("topup_requests").update({ status: "expired" }).eq("id", req.id);
      throw new Error("ໝົດເວລາ 15 ນາທີ, ກະລຸນາສ້າງ QR ໃໝ່");
    }

    // Decode + hash
    const bytes = Uint8Array.from(atob(data.image_base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 6 * 1024 * 1024) throw new Error("ຮູບໃຫຍ່ເກີນ 6MB");
    const hash = await sha256Hex(bytes);

    // Reject dup slip
    const { data: dup } = await supabase
      .from("topup_requests")
      .select("id")
      .eq("slip_hash", hash)
      .maybeSingle();
    if (dup && dup.id !== req.id) {
      await supabase.from("topup_requests")
        .update({ status: "rejected", verify_reason: "ບໍ່ສາມາດຢືນຢັນຂໍ້ມູນສະລິບໄດ້" })
        .eq("id", req.id);
      throw new Error("ບໍ່ສາມາດຢືນຢັນຂໍ້ມູນສະລິບໄດ້, ກະລຸນາຕິດຕໍ່ແອດມິນ");
    }

    // Upload to storage
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ext = data.mime.split("/")[1].replace("jpeg", "jpg");
    const objectPath = `${userId}/${req.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("slips")
      .upload(objectPath, bytes, { contentType: data.mime, upsert: false });
    if (upErr) throw new Error(upErr.message);

    // Call Lovable AI Gateway (Gemini vision) with structured output
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const dataUrl = `data:${data.mime};base64,${data.image_base64}`;
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a bank transfer slip inspector. Extract fields precisely from the image. If the image is not a bank transfer slip, or looks edited/tampered/screenshot-of-a-screenshot, set looks_authentic=false. Return ONLY the tool call.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract slip fields." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report",
              description: "Report extracted slip fields.",
              parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                  amount: { type: ["number", "null"], description: "Transfer amount in KIP (LAK)." },
                  receiver_name: { type: ["string", "null"], description: "Receiver full name as printed." },
                  reference: { type: ["string", "null"], description: "Transaction reference / ID." },
                  transfer_datetime: { type: ["string", "null"], description: "ISO datetime of transfer." },
                  looks_authentic: { type: "boolean", description: "True if slip appears genuine/unedited." },
                  confidence: { type: "number", description: "0..1 confidence in extraction." },
                },
                required: ["amount", "receiver_name", "reference", "transfer_datetime", "looks_authentic", "confidence"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report" } },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text();
      console.error("AI gateway error", aiRes.status, body);
      await supabase.from("topup_requests")
        .update({ slip_url: objectPath, slip_hash: hash, verify_reason: "AI_ERROR" })
        .eq("id", req.id);
      throw new Error("ບໍ່ສາມາດຢືນຢັນສະລິບໄດ້, ກະລຸນາລອງໃໝ່");
    }
    const aiJson = await aiRes.json();
    const call = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let verdict: VerdictJson | null = null;
    try {
      verdict = call ? (JSON.parse(call.function.arguments) as VerdictJson) : null;
    } catch {
      verdict = null;
    }

    const failGeneric = "ບໍ່ສາມາດຢືນຢັນຂໍ້ມູນສະລິບໄດ້, ກະລຸນາກວດເບິ່ງແລ້ວລອງໃໝ່";
    const reqId = req.id;
    const reqAmount = req.amount;
    async function reject(reasonCode: string) {
      await supabase.from("topup_requests")
        .update({
          status: "rejected",
          slip_url: objectPath,
          slip_hash: hash,
          verify_reason: reasonCode,
          verified_amount: verdict?.amount ?? null,
          verified_name: verdict?.receiver_name ?? null,
        })

        .eq("id", reqId);
      const { notifyDiscord } = await import("./discord.server");
      await notifyDiscord("❌ ເຕີມເງິນບໍ່ສຳເລັດ", [
        `**ຈຳນວນທີ່ສ້າງ:** ${reqAmount.toLocaleString()} ₭`,
        `**ເຫດຜົນ (internal):** ${reasonCode}`,
        `**Request ID:** ${reqId}`,
      ], 0xef4444);

    }

    if (!verdict) {
      await reject("NO_VERDICT");
      return { ok: false, reason: failGeneric };
    }

    // Authenticity
    if (!verdict.looks_authentic || verdict.confidence < 0.5) {
      await reject("AUTH_FAIL");
      return { ok: false, reason: failGeneric };
    }

    // Amount check (must match exactly, ±1 kip rounding tolerance)
    if (verdict.amount == null || Math.abs(verdict.amount - req.amount) > 1) {
      await reject("AMOUNT_MISMATCH");
      return { ok: false, reason: "ຈຳນວນເງິນໃນສະລິບບໍ່ຕົງກັບຍອດທີ່ສ້າງໄວ້" };
    }

    // Receiver name check (must contain both tokens, case-insensitive)
    const nameUp = (verdict.receiver_name ?? "").toUpperCase().replace(/[^A-Z ]/g, "");
    const nameOk = ACCOUNT_NAME_TOKENS.every((t) => nameUp.includes(t));
    if (!nameOk) {
      await reject("NAME_MISMATCH");
      return { ok: false, reason: "ຊື່ບັນຊີຜູ້ຮັບບໍ່ຖືກຕ້ອງ" };
    }

    // Date check — slip must be from the same day the request was created
    // (Lao time, UTC+7). Time-of-day is not checked strictly; the 15-minute
    // window is already enforced by the request expiry above.
    if (verdict.transfer_datetime) {
      const laoDay = (d: Date) =>
        new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
      const raw = verdict.transfer_datetime.trim();
      let slipDay: string | null = null;
      const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
      const dmy = raw.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
      if (iso) slipDay = `${iso[1]}-${iso[2]}-${iso[3]}`;
      else if (dmy)
        slipDay = `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

      if (slipDay) {
        const reqDay = laoDay(new Date(req.created_at));
        const diffDays = Math.abs(
          (Date.parse(slipDay) - Date.parse(reqDay)) / 86_400_000,
        );
        if (diffDays > 1) {
          await reject("DATE_MISMATCH");
          return { ok: false, reason: failGeneric };
        }
      }
    }


    // === Approve: credit wallet + mark approved ===
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);

    const newBalance = (profile?.wallet_balance ?? 0) + req.amount;

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ wallet_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (updErr) throw new Error(updErr.message);

    await supabase.from("topup_requests")
      .update({
        status: "approved",
        slip_url: objectPath,
        slip_hash: hash,
        verified_at: new Date().toISOString(),
        verified_amount: verdict.amount,
        verified_name: verdict.receiver_name,
        verify_reason: "OK",
      })
      .eq("id", req.id);

    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: userId,
      amount: req.amount,
      balance_after: newBalance,
      kind: "topup_credit",
      reference_id: req.id,
      note: "ເຕີມເງິນຜ່ານ QR",
    });

    // Notify admins
    const { data: admins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (admins && admins.length) {
      const rows = admins.map((a) => ({
        user_id: a.user_id,
        title: "ມີການເຕີມເງິນສຳເລັດ",
        body: `ຜູ້ໃຊ້ເຕີມ ${reqAmount.toLocaleString()} ₭`,
      }));
      await supabaseAdmin.from("notifications").insert(rows);
    }

    const { notifyDiscord } = await import("./discord.server");
    await notifyDiscord("💰 ເຕີມເງິນສຳເລັດ", [
      `**ຈຳນວນ:** ${reqAmount.toLocaleString()} ₭`,
      `**ຊື່ຜູ້ໂອນ/ຜູ້ຮັບ:** ${verdict.receiver_name ?? "-"}`,
      `**ຍອດຄົງເຫຼືອໃໝ່:** ${newBalance.toLocaleString()} ₭`,
    ], 0x22c55e);


    return { ok: true, balance: newBalance };

  });
