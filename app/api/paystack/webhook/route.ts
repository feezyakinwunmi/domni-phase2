import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyTicketPurchase } from "@/lib/actions/tickets";
import { verifyProUpgrade } from "@/lib/actions/plan";
import { verifyVotePurchase } from "@/lib/actions/voting";

export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("[domni] PAYSTACK_SECRET_KEY is not set — rejecting webhook");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const hash = crypto.createHmac("sha512", secret).update(body).digest("hex");

  const valid =
    signature.length === hash.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  try {
    const event = JSON.parse(body);

    if (event?.event === "charge.success" && typeof event.data?.reference === "string") {
      const reference = event.data.reference;
      const transaction = await prisma.transaction.findUnique({ where: { reference }, select: { type: true } });

      if (transaction?.type === "PLAN_UPGRADE") {
        await verifyProUpgrade(reference);
      } else if (transaction?.type === "TICKET_PURCHASE") {
        const result = await verifyTicketPurchase(reference);
        if (!result.success) console.error("[domni] webhook ticket verify failed", reference, result.error);
      } else if (transaction?.type === "VOTE_PURCHASE") {
        const result = await verifyVotePurchase(reference);
        if (!result.success) console.error("[domni] webhook vote verify failed", reference, result.error);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[domni] webhook error", err);
    // 500 makes Paystack retry later, which is what we want for transient DB errors.
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
