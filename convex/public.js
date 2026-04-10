import { httpAction } from "./_generated/server";

export const householdPublic = httpAction(async () => {
  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>GramInfo - Protected QR</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 28px; color: #0f172a; }
        .card { max-width: 560px; border: 1px solid #d1d5db; border-radius: 12px; padding: 18px; background: #f8fafc; }
        h1 { margin: 0 0 8px; }
        p { margin: 8px 0; color: #334155; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Unauthorized Access</h1>
        <p>This QR is protected. Household data is available only inside the authenticated GramInfo app.</p>
        <p>Please open GramInfo and scan this QR using a registered account.</p>
      </div>
    </body>
  </html>`;

  return new Response(html, {
    status: 403,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
