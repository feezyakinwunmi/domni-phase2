import { PROMO_DURATION_MONTHS } from "@/lib/constants/pricing";

export type PromoStatus = {
  isActive: boolean;
  endsAt: Date;
};

function addCalendarMonths(date: Date, months: number) {
  const result = new Date(date);
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();

  result.setDate(Math.min(originalDay, lastDayOfTargetMonth));

  return result;
}

export function getPromoStatus(
  accountCreatedAt: Date,
  now = new Date()
): PromoStatus {
  const endsAt = addCalendarMonths(accountCreatedAt, PROMO_DURATION_MONTHS);

  return {
    isActive: now < endsAt,
    endsAt,
  };
}
