import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { nomineeId, email, quantity } = body;

    const nominee = await prisma.nominee.findUnique({
      where: {
        id: nomineeId,
      },
      include: {
        campaign: true,
      },
    });

    if (!nominee) {
      return NextResponse.json(
        { error: "Nominee not found" },
        { status: 404 }
      );
    }

    const amount =
      nominee.campaign.pricePerVoteKobo * Number(quantity);

    const reference = `VOTE_${crypto.randomUUID()}`;

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount,
          reference,
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/vote/success`,
          metadata: {
            nomineeId,
            quantity,
          },
        }),
      }
    );

    const data = await response.json();

    return NextResponse.json(data.data);
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}