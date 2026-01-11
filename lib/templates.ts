export function reminderEmailTemplate(params: { title: string; occurAt: string }) {
  return `
  <div style="font-family:Arial,sans-serif;line-height:1.4">
    <h2>${params.title}</h2>
    <p>Scadenta: <strong>${params.occurAt}</strong></p>
    <p style="color:#666">Notificare generata automat.</p>
  </div>
  `;
}
