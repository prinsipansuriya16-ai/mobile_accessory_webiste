// Supabase Edge Function: send-order-notification
//
// Sends the shop owner an instant email (via Resend) whenever a new Cash on
// Delivery order is placed. The Resend API key and owner email never reach
// the browser — they're read from server-side Edge Function secrets.
//
// Deploy:
//   supabase functions deploy send-order-notification
//
// Set secrets (server-side only, never prefixed with VITE_):
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
//   supabase secrets set OWNER_EMAIL=owner@kisaanaccessories.com
//   supabase secrets set NOTIFY_FROM_EMAIL="Kisaan Accessories <orders@yourdomain.com>"
//
// NOTIFY_FROM_EMAIL must be on a domain verified in Resend, or use
// Resend's onboarding@resend.dev sender while testing.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL");
const FROM_EMAIL =
  Deno.env.get("NOTIFY_FROM_EMAIL") ?? "Kisaan Accessories <onboarding@resend.dev>";

type OrderItemPayload = {
  product_name: string;
  quantity: number;
  price: number;
};

type OrderNotificationPayload = {
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  totalAmount: number;
  paymentMethod: string;
  items: OrderItemPayload[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildEmailHtml(order: OrderNotificationPayload) {
  const itemsRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(item.product_name)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">₹${(item.price * item.quantity).toLocaleString("en-IN")}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="margin-bottom:4px;">New Order Received</h2>
      <p style="color:#555;margin-top:0;">Order ID: <strong>${escapeHtml(order.orderId)}</strong></p>

      <h3 style="margin-bottom:4px;">Customer</h3>
      <p style="margin:0;">${escapeHtml(order.customerName)} · ${escapeHtml(order.phone)}</p>

      <h3 style="margin-bottom:4px;margin-top:16px;">Delivery Address</h3>
      <p style="margin:0;">${escapeHtml(order.address)}, ${escapeHtml(order.city)}, ${escapeHtml(order.state)} - ${escapeHtml(order.pincode)}</p>

      <h3 style="margin-bottom:4px;margin-top:16px;">Items</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #333;">Product</th>
            <th style="text-align:center;padding:8px 12px;border-bottom:2px solid #333;">Qty</th>
            <th style="text-align:right;padding:8px 12px;border-bottom:2px solid #333;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>

      <p style="margin-top:16px;font-size:16px;">
        <strong>Total: ₹${order.totalAmount.toLocaleString("en-IN")}</strong>
        &nbsp;(${escapeHtml(order.paymentMethod)})
      </p>
    </div>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!RESEND_API_KEY || !OWNER_EMAIL) {
    console.error("Missing RESEND_API_KEY or OWNER_EMAIL secret.");
    // Still 200 — a missing secret shouldn't surface as a hard failure to
    // the caller. It's logged server-side for the admin to fix.
    return Response.json(
      { ok: false, reason: "Notification not configured." },
      { status: 200 }
    );
  }

  let order: OrderNotificationPayload;
  try {
    order = await req.json();
  } catch {
    return Response.json({ ok: false, reason: "Invalid payload." }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [OWNER_EMAIL],
        subject: `New Order — ${order.customerName} (₹${order.totalAmount.toLocaleString("en-IN")})`,
        html: buildEmailHtml(order),
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("Resend API error:", res.status, errorBody);
      return Response.json({ ok: false, reason: "Resend API error." }, { status: 200 });
    }

    const data = await res.json();
    return Response.json({ ok: true, data });
  } catch (err) {
    console.error("Failed to send order notification email:", err);
    // Never a 5xx here either — the order itself already succeeded; the
    // caller treats this endpoint as best-effort.
    return Response.json({ ok: false, reason: "Unexpected error." }, { status: 200 });
  }
});
