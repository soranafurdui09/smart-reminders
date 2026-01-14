export function reminderEmailTemplate(params: {
  title: string;
  occurAt: string;
  actionUrls?: { done: string; snooze: string };
}) {
  const actionSection = params.actionUrls
    ? `
    <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
      <a href="${params.actionUrls.done}" style="background:#38bdf8;color:#0f172a;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">
        Marcheaza ca rezolvat
      </a>
      <a href="${params.actionUrls.snooze}" style="background:#e2e8f0;color:#0f172a;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">
        Amana 30 min
      </a>
    </div>
  `
    : '';
  return `
  <div style="font-family:Arial,sans-serif;line-height:1.4">
    <h2>${params.title}</h2>
    <p>Scadenta: <strong>${params.occurAt}</strong></p>
    ${actionSection}
    <p style="color:#666">Notificare generata automat.</p>
  </div>
  `;
}
