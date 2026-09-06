import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createTopupInput,
  parseLaoSlipTime,
  recipientNameMatches,
  sha256Hex,
  slipTimeIsValid,
  submitSlipInput,
  TOPUP_EXPIRE_MINUTES,
  topupIdInput,
} from "./topup.server";

// ---------- create ----------
export const createTopupRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(createTopupInput)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

    // Cancel any expired pending
    await admin
      .from("topup_requests")
      .update({ status: "expired" })
      .eq("user_id", userId)
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString());

    // Pressing "create" always issues a brand new request: cancel every
    // pending one first so an old QR/slip can never come back.
    await admin
      .from("topup_requests")
      .update({ status: "canceled" })
      .eq("user_id", userId)
      .eq("status", "pending");


    const expiresAt = new Date(Date.now() + TOPUP_EXPIRE_MINUTES * 60 * 1000).toISOString();
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let referenceCode = "GL";
    for (let i = 0; i < 6; i++) referenceCode += chars[Math.floor(Math.random() * chars.length)];
    const { data: created, error } = await supabase
      .from("topup_requests")
      .insert({
        user_id: userId,
        amount: data.amount,
        status: "pending",
        reference_code: referenceCode,
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
      .is("slip_url", null)
      .gt("expires_at", new Date().toISOString())

      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { request: data ?? null };
  });

// ---------- cancel ----------
export const cancelTopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(topupIdInput)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    await admin
      .from("topup_requests")
      .update({ status: "canceled" })
      .eq("id", data.id)
      .eq("user_id", userId)
      .eq("status", "pending");
    return { ok: true };
  });

// ---------- submit slip ----------
type VerdictJson = {
  amount: number | null;
  receiver_name: string | null;
  transfer_datetime: string | null;
  looks_authentic: boolean;
  confidence: number;
};

export const submitSlip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(submitSlipInput)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
      await supabaseAdmin.from("topup_requests").update({ status: "expired" }).eq("id", req.id);
      throw new Error("ໝົດເວລາ 15 ນາທີ, ກະລຸນາສ້າງ QR ໃໝ່");
    }

    // Consume this request as soon as a slip is submitted. It must never be
    // restored as an active QR request or accept a second image, even when a
    // later verification/provider step fails.
    const { data: consumed, error: consumeErr } = await supabaseAdmin
      .from("topup_requests")
      .update({ status: "processing" })
      .eq("id", req.id)
      .eq("user_id", userId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (consumeErr) throw new Error(consumeErr.message);
    if (!consumed) throw new Error("ລາຍການນີ້ຖືກໃຊ້ໄປແລ້ວ ກະລຸນາສ້າງ QR ໃໝ່");

    // Decode + hash
    const bytes = Uint8Array.from(atob(data.image_base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 6 * 1024 * 1024) {
      await supabaseAdmin.from("topup_requests").update({ status: "rejected", verify_reason: "FILE_TOO_LARGE" }).eq("id", req.id);
      throw new Error("ຮູບໃຫຍ່ເກີນ 6MB");
    }
    const hash = await sha256Hex(bytes);

    // Check duplicates with privileged access so the same slip cannot be reused
    // from a different customer account hidden by row-level access rules.
    const { data: dup } = await supabaseAdmin
      .from("topup_requests")
      .select("id")
      .eq("slip_hash", hash)
      .maybeSingle();
    if (dup && dup.id !== req.id) {
      await supabaseAdmin.from("topup_requests")
        .update({ status: "rejected", verify_reason: "ບໍ່ສາມາດຢືນຢັນຂໍ້ມູນສະລິບໄດ້" })
        .eq("id", req.id);
      throw new Error("ບໍ່ສາມາດຢືນຢັນຂໍ້ມູນສະລິບໄດ້, ກະລຸນາຕິດຕໍ່ແອດມິນ");
    }

    // Upload to storage
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
              "You are a strict bank transfer slip inspector. Extract the recipient name, exact transferred amount, and complete transfer date and time from visible text only. Never infer or invent a missing date or time. If any required field is unreadable, the image is not a bank transfer slip, or it appears edited/tampered/reused, set looks_authentic=false. Return ONLY the tool call.",
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
                  transfer_datetime: { type: ["string", "null"], description: "Complete visible transfer date and time. Use ISO 8601 with the printed timezone when known; use Lao timezone +07:00 when no timezone is printed. Return null if either date or time is missing or unreadable." },
                  looks_authentic: { type: "boolean", description: "True if slip appears genuine/unedited." },
                  confidence: { type: "number", description: "0..1 confidence in extraction." },
                },
                required: ["amount", "receiver_name", "transfer_datetime", "looks_authentic", "confidence"],
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
      await supabaseAdmin.from("topup_requests")
        .update({ status: "rejected", slip_url: objectPath, slip_hash: hash, verify_reason: "AI_ERROR" })
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

    const reqId = req.id;
    const reqAmount = req.amount;
    async function reject(reasonCode: string) {
      await supabaseAdmin.from("topup_requests")
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
      return { ok: false, reason: "ອ່ານຂໍ້ມູນໃນຮູບບໍ່ໄດ້ — ກະລຸນາແນບຮູບສະລິບທີ່ຊັດເຈນ ເຫັນຊື່ຜູ້ຮັບ, ຈຳນວນເງິນ ແລະ ວັນ-ເວລາ" };
    }

    // Authenticity
    if (!verdict.looks_authentic || verdict.confidence < 0.5) {
      await reject("AUTH_FAIL");
      return { ok: false, reason: "ຮູບນີ້ບໍ່ຄືສະລິບໂອນເງິນຈິງ ຫຼື ຂໍ້ມູນບໍ່ຊັດເຈນ (ອາດຖືກແກ້ໄຂ/ຖ່າຍບໍ່ຄົບ)" };
    }

    // Amount check (must match exactly, ±1 kip rounding tolerance)
    if (verdict.amount == null || Math.abs(verdict.amount - req.amount) > 1) {
      await reject("AMOUNT_MISMATCH");
      return {
        ok: false,
        reason: verdict.amount == null
          ? "ບໍ່ພົບຈຳນວນເງິນໃນສະລິບ"
          : `ຈຳນວນເງິນບໍ່ຕົງກັນ: ໃນສະລິບ ${verdict.amount.toLocaleString()} ₭ ແຕ່ລາຍການນີ້ຕ້ອງເປັນ ${req.amount.toLocaleString()} ₭`,
      };
    }

    // Receiver name: SOMYONE KHAMKHEUNG is required; MR is optional.
    if (!recipientNameMatches(verdict.receiver_name)) {
      await reject("NAME_MISMATCH");
      return {
        ok: false,
        reason: `ຊື່ບັນຊີຜູ້ຮັບບໍ່ຖືກຕ້ອງ: ໃນສະລິບແມ່ນ "${verdict.receiver_name ?? "ບໍ່ພົບ"}" ແຕ່ຕ້ອງໂອນເຂົ້າຊື່ SOMYONE KHAMKHEUNG`,
      };
    }

    // A visible date and time are mandatory: same Lao calendar day and within
    // the 15-minute window beginning when this request was created.
    if (!slipTimeIsValid(verdict.transfer_datetime, req.created_at)) {
      await reject("DATETIME_MISMATCH");
      const parsed = parseLaoSlipTime(verdict.transfer_datetime);
      const fmt = (ms: number) =>
        new Date(ms + 7 * 3_600_000).toISOString().replace("T", " ").slice(0, 16);
      return {
        ok: false,
        reason: parsed == null
          ? "ບໍ່ພົບວັນ-ເວລາໂອນໃນສະລິບ ຫຼື ອ່ານບໍ່ອອກ"
          : `ວັນ-ເວລາໂອນບໍ່ຖືກຕ້ອງ: ໃນສະລິບ ${fmt(parsed)} ແຕ່ຕ້ອງໂອນໃນວັນດຽວກັນ ແລະ ພາຍໃນ ${TOPUP_EXPIRE_MINUTES} ນາທີ ຫຼັງສ້າງລາຍການ (${fmt(Date.parse(req.created_at))})`,
      };
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

    await supabaseAdmin.from("topup_requests")
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
