export interface SendQrCodeEmailOpts {
  to:               string;
  participantName:  string;
  eventName:        string;
  eventDate:        string;
  eventLocation?:   string;
  qrToken:          string;
  badgeRole:        string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'noreply@crachasys.com.br';
const APP_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

interface SendBadgeEmailOpts {
  to: string;
  participantName: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  qrToken: string;
  badgeRole: string;
  loginPassword?: string;
  loginUrl?: string;
}

export async function sendBadgeEmail(opts: SendBadgeEmailOpts): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[emailService] RESEND_API_KEY not set — skipping email');
    return false;
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f5f7fa;margin:0;padding:32px 0">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">Seu Credencial está Pronto! 🎫</h1>
      <p style="color:#c7d2fe;margin:8px 0 0">${opts.eventName}</p>
    </div>
    <div style="padding:32px">
      <p style="color:#374151;margin:0 0 16px">Olá, <strong>${opts.participantName}</strong>!</p>
      <p style="color:#6b7280;margin:0 0 24px">Você está credenciado(a) como <strong>${opts.badgeRole}</strong> no evento abaixo. Apresente o QR Code abaixo na entrada.</p>
      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af">Evento</p>
        <p style="margin:0 0 12px;font-weight:600;color:#111827">${opts.eventName}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af">Data</p>
        <p style="margin:0 0 12px;font-weight:600;color:#111827">${opts.eventDate}</p>
        ${opts.eventLocation ? `<p style="margin:0 0 4px;font-size:13px;color:#9ca3af">Local</p><p style="margin:0;font-weight:600;color:#111827">${opts.eventLocation}</p>` : ''}
      </div>
      <div style="text-align:center;padding:20px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:13px;color:#6b7280">QR Code de Acesso</p>
        <img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(opts.qrToken)}&size=180x180&margin=8" width="180" height="180" alt="QR Code" style="border-radius:8px" />
        <p style="margin:12px 0 0;font-family:monospace;font-size:11px;color:#9ca3af;word-break:break-all">${opts.qrToken.slice(0, 40)}…</p>
      </div>
      ${opts.loginPassword ? `
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-weight:700;color:#15803d;font-size:14px">🔐 Sua conta de acesso ao portal foi criada!</p>
        <p style="margin:0 0 8px;font-size:13px;color:#374151">Acesse o portal em: <a href="${opts.loginUrl ?? 'http://localhost:3000'}/login" style="color:#4f46e5">${opts.loginUrl ?? 'http://localhost:3000'}/login</a></p>
        <p style="margin:0 0 4px;font-size:13px;color:#374151">Email: <strong>${opts.to}</strong></p>
        <p style="margin:0 0 12px;font-size:13px;color:#374151">Senha temporária: <strong style="font-family:monospace;background:#dcfce7;padding:2px 8px;border-radius:4px">${opts.loginPassword}</strong></p>
        <p style="margin:0;font-size:11px;color:#6b7280">Recomendamos trocar sua senha após o primeiro acesso.</p>
      </div>` : ''}
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">Este email foi enviado automaticamente pelo CrachaSys.<br>Em caso de dúvidas, entre em contato com o organizador do evento.</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: opts.to, subject: `Seu credencial — ${opts.eventName}`, html }),
    });
    return res.ok;
  } catch (e) {
    console.error('[emailService] Failed to send email:', e);
    return false;
  }
}

export async function sendQrCodeEmail(opts: SendQrCodeEmailOpts): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[emailService] RESEND_API_KEY not set — skipping QR email');
    return false;
  }

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(opts.qrToken)}&size=200x200&margin=8`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;background:#f5f7fa;margin:0;padding:32px 0">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">QR Code de Acesso 🎫</h1>
      <p style="color:#c7d2fe;margin:8px 0 0">${opts.eventName}</p>
    </div>

    <div style="padding:32px">
      <p style="color:#374151;margin:0 0 16px">Olá, <strong>${opts.participantName}</strong>!</p>
      <p style="color:#6b7280;margin:0 0 24px">
        Você está credenciado(a) como <strong>${opts.badgeRole}</strong>. Apresente o QR Code abaixo na entrada do evento.
      </p>

      <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af">Evento</p>
        <p style="margin:0 0 12px;font-weight:600;color:#111827">${opts.eventName}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af">Data</p>
        <p style="margin:0 0 12px;font-weight:600;color:#111827">${opts.eventDate}</p>
        ${opts.eventLocation ? `<p style="margin:0 0 4px;font-size:13px;color:#9ca3af">Local</p><p style="margin:0;font-weight:600;color:#111827">${opts.eventLocation}</p>` : ''}
      </div>

      <div style="text-align:center;padding:24px;background:#fff;border:2px solid #e5e7eb;border-radius:12px;margin-bottom:24px">
        <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#374151">Seu QR Code de Check-in</p>
        <img src="${qrImageUrl}" width="200" height="200" alt="QR Code" style="border-radius:8px;display:block;margin:0 auto" />
        <p style="margin:16px 0 0;font-size:13px;color:#6b7280">
          Mostre este código ao staff na entrada para confirmar sua presença.
        </p>
      </div>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px">
        <p style="margin:0;font-size:13px;color:#1e40af">
          💡 <strong>Dica:</strong> Salve este e-mail ou faça uma captura de tela do QR Code para ter acesso offline no dia do evento.
        </p>
      </div>

      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">
        Este email foi enviado automaticamente pelo CrachaSys.<br>
        Em caso de dúvidas, entre em contato com o organizador do evento.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        from:    FROM_EMAIL,
        to:      opts.to,
        subject: `Seu QR Code — ${opts.eventName}`,
        html,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error('[emailService] Failed to send QR code email:', e);
    return false;
  }
}
