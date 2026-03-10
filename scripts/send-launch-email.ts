// scripts/send-launch-email.ts
// Run once: npx tsx scripts/send-launch-email.ts
//
// Prerequisites:
//   1. npm install resend
//   2. RESEND_API_KEY in your .env
//   3. DATABASE_URL in your .env (your Railway Postgres URL)

import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const TEST_MODE = true
const TEST_EMAIL = 'sondeepdulla@gmail.com'

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)

// ─── Config ───────────────────────────────────────────────────────────────────
const FROM    = 'Campus Arena <hello@campusarena.co>'
const SUBJECT = '🎉 Campus Arena is live — come check it out'
const SIGNUP_URL = 'https://www.campusarena.co/auth'
// ──────────────────────────────────────────────────────────────────────────────

function buildEmailHtml(name?: string | null): string {
  const greeting = name ? `Hey ${name.split(' ')[0]},` : 'Hey there,'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Campus Arena is Live</title>
</head>
<body style="margin:0;padding:0;background:#f5f7ff;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:white;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(99,102,241,0.10);">

          <!-- Header gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:40px 40px 32px;text-align:center;">
              <!-- Logo mark -->
              <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:16px;margin-bottom:18px;">
                <span style="color:white;font-weight:900;font-size:20px;letter-spacing:-0.03em;">CA</span>
              </div>
              <div style="color:rgba(255,255,255,0.85);font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px;">Campus Arena</div>
              <h1 style="margin:0;color:white;font-size:28px;font-weight:800;letter-spacing:-0.03em;line-height:1.2;">We're officially live. 🎉</h1>
              <p style="margin:12px 0 0;color:rgba(255,255,255,0.8);font-size:15px;line-height:1.6;">
                The campus social platform you signed up for is ready.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 32px;">

              <p style="margin:0 0 24px;font-size:16px;color:#111827;font-weight:600;">${greeting}</p>

              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
                You signed up for the Campus Arena waitlist a while back — and we've been heads-down building something we're genuinely excited about. Today, it's live.
              </p>

              <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
                Campus Arena is your university's social space — connect with classmates, join the conversation, and challenge friends to games. All in one place.
              </p>

              <!-- Feature pills -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="padding:4px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#eef2ff;border-radius:12px;padding:12px 16px;width:140px;">
                          <div style="font-size:20px;margin-bottom:4px;">💬</div>
                          <div style="font-size:13px;font-weight:700;color:#4f46e5;">Campus Chat</div>
                          <div style="font-size:12px;color:#6b7280;margin-top:2px;">DM your classmates</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding:4px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#f5f3ff;border-radius:12px;padding:12px 16px;width:140px;">
                          <div style="font-size:20px;margin-bottom:4px;">📣</div>
                          <div style="font-size:13px;font-weight:700;color:#7c3aed;">Campus Talks</div>
                          <div style="font-size:12px;color:#6b7280;margin-top:2px;">Share &amp; discuss</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding:4px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#fdf4ff;border-radius:12px;padding:12px 16px;width:140px;">
                          <div style="font-size:20px;margin-bottom:4px;">🎮</div>
                          <div style="font-size:13px;font-weight:700;color:#9333ea;">Campus Games</div>
                          <div style="font-size:12px;color:#6b7280;margin-top:2px;">Compete &amp; climb</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${SIGNUP_URL}"
                      style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:white;text-decoration:none;font-size:15px;font-weight:700;padding:16px 48px;border-radius:14px;letter-spacing:-0.01em;box-shadow:0 4px 16px rgba(99,102,241,0.35);">
                      Create your account →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;line-height:1.6;">
                If you already signed up, just head to
                <a href="${SIGNUP_URL}" style="color:#6366f1;text-decoration:none;">campusarena.co</a>
                and log in.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">
                You're receiving this because you joined the Campus Arena waitlist.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © 2026 Campus Arena · <a href="https://www.campusarena.co" style="color:#6366f1;text-decoration:none;">campusarena.co</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📋 Fetching waitlist...')
  const waitlist = await prisma.waitlist.findMany({
    select: { email: true, name: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`📬 Found ${waitlist.length} people on the waitlist.\n`)

  let sent = 0
  let failed = 0

  for (const person of waitlist) {
    try {
      await resend.emails.send({
        from: FROM,
        to: TEST_MODE ? TEST_EMAIL : person.email,
        subject: SUBJECT,
        html: buildEmailHtml(person.name),
      })
      console.log(`  ✅ Sent → ${person.email}`)
      sent++

      // Small delay to be kind to Resend's API
      await new Promise(r => setTimeout(r, 200))
    } catch (err) {
      console.error(`  ❌ Failed → ${person.email}:`, err)
      failed++
    }
  }

  console.log(`\n🎉 Done! Sent: ${sent} | Failed: ${failed}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())