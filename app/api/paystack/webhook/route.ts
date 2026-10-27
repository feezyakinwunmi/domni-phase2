import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { verifyTicketPurchase } from "@/lib/actions/tickets";
import { verifyProUpgrade } from "@/lib/actions/plan";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "")
    .update(body)
    .digest("hex");

  if (!signature || hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === "charge.success") {
    const reference = event.data.reference;

    const transaction = await prisma.transaction.findUnique({
      where: { reference },
      select: { type: true },
    });

    if (transaction?.type === "PLAN_UPGRADE") {
      await verifyProUpgrade(reference);
    } else {
      await verifyTicketPurchase(reference);
    }
  }

  return NextResponse.json({ received: true });
}
