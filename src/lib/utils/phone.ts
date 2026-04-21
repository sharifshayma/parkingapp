import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { DEFAULT_COUNTRY_CODE } from "@/lib/constants";

export function parseAndValidatePhone(
  raw: string,
  country: CountryCode = DEFAULT_COUNTRY_CODE
): { valid: boolean; e164: string | null } {
  const phone = parsePhoneNumberFromString(raw, country);
  if (!phone || !phone.isValid()) {
    return { valid: false, e164: null };
  }
  return { valid: true, e164: phone.number };
}

export function formatPhoneDisplay(e164: string): string {
  const phone = parsePhoneNumberFromString(e164);
  return phone ? phone.formatInternational() : e164;
}

export function buildWhatsAppUrl(e164Phone: string, message: string): string {
  const digits = e164Phone.replace("+", "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildThankYouMessage(
  date: string,
  startHour: number,
  endHour: number
): string {
  return `היי! תודה שהשארת לי את החניה ב-${date} בשעות ${String(startHour).padStart(2, "0")}:00-${String(endHour).padStart(2, "0")}:00. מעריך/ה מאוד! 🙏`;
}
