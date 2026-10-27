import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const templates = await prisma.ticketTemplate.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}