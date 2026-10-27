import { getPromoStatus } from "@/lib/billing/promo";

const DOMNI_PLATFORM_FEE_BASIS_POINTS = 300;
const DOMNI_MINIMUM_FEE_KOBO = 5_000;
const PAYSTACK_LOCAL_FEE_BASIS_POINTS = 150;
const PAYSTACK_FLAT_FEE_KOBO = 10_000;
const PAYSTACK_FLAT_FEE_WAIVER_THRESHOLD_KOBO = 250_000;
const PAYSTACK_LOCAL_FEE_CAP_KOBO = 200_000;

export type SaleFees = {
  subtotalKobo: number;
  domniFeeKobo: number;
  estimatedPaystackFeeKobo: number;
  estimatedOrganizerNetKobo: number;
  promoApplied: boolean;
  promoEndsAt: string;
};

function calculatePercentageFeeKobo(amountKobo: number, basisPoints: number) {
  return Math.ceil((amountKobo * basisPoints) / 10_000);
}

export function calculateSaleFees({
  subtotalKobo,
  organizerCreatedAt,
}: {
  subtotalKobo: number;
  organizerCreatedAt: Date;
}): SaleFees {
  const promo = getPromoStatus(organizerCreatedAt);
  const estimatedPaystackFeeKobo = Math.min(
    calculatePercentageFeeKobo(
      subtotalKobo,
      PAYSTACK_LOCAL_FEE_BASIS_POINTS
    ) +
      (subtotalKobo >= PAYSTACK_FLAT_FEE_WAIVER_THRESHOLD_KOBO
        ? PAYSTACK_FLAT_FEE_KOBO
        : 0),
    PAYSTACK_LOCAL_FEE_CAP_KOBO
  );

  const domniFeeKobo = promo.isActive
    ? 0
    : Math.max(
        calculatePercentageFeeKobo(
          subtotalKobo,
          DOMNI_PLATFORM_FEE_BASIS_POINTS
        ),
        DOMNI_MINIMUM_FEE_KOBO
      );

  return {
    subtotalKobo,
    domniFeeKobo,
    estimatedPaystackFeeKobo,
    estimatedOrganizerNetKobo: Math.max(
      0,
      subtotalKobo - domniFeeKobo - estimatedPaystackFeeKobo
    ),
    promoApplied: promo.isActive,
    promoEndsAt: promo.endsAt.toISOString(),
  };
}
