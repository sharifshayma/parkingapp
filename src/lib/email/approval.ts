import "server-only";
import { Resend } from "resend";

type SendResult =
  | { sent: true }
  | { sent: false; reason: "no_api_key" | "no_from" | "no_recipient" }
  | { sent: false; reason: "send_failed"; error: unknown };

export async function sendApprovalEmail(
  toEmail: string | null | undefined,
  fullName: string | null
): Promise<SendResult> {
  if (!toEmail) return { sent: false, reason: "no_recipient" };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) return { sent: false, reason: "no_api_key" };
  if (!from) return { sent: false, reason: "no_from" };

  const resend = new Resend(apiKey);
  const greeting = fullName ? `שלום ${fullName},` : "שלום,";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://parkingapp.shayma.me";
  const replyTo = process.env.EMAIL_REPLY_TO;

  try {
    const result = await resend.emails.send({
      from,
      to: toEmail,
      ...(replyTo ? { replyTo } : {}),
      subject: "החשבון שלך אושר — שיתוף חניה בגינדי 4",
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1f2937;">
          <p>${greeting}</p>
          <p>החשבון שלך בשיתוף חניה בגינדי 4 אושר. אפשר להתחיל לחפש ולהציע חניות.</p>
          <p><a href="${appUrl}" style="color: #2563eb;">כניסה לאפליקציה</a></p>
          <p style="color: #6b7280; font-size: 13px;">ברוכים הבאים!</p>
        </div>
      `,
      text: `${greeting}\n\nהחשבון שלך בשיתוף חניה בגינדי 4 אושר. אפשר להתחיל לחפש ולהציע חניות.\n\n${appUrl}`,
    });
    if (result.error) return { sent: false, reason: "send_failed", error: result.error };
    return { sent: true };
  } catch (error) {
    return { sent: false, reason: "send_failed", error };
  }
}
