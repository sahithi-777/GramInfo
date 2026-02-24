import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

function normalizeHouseCode(code) {
  return (code || "").trim().toUpperCase();
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const householdPublic = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const rawCode = url.searchParams.get("code") || url.searchParams.get("houseCode") || "";
  const code = normalizeHouseCode(rawCode);

  if (!code) {
    return new Response("Missing code", { status: 400 });
  }

  const household = await ctx.runQuery(internal.households.getByCodePublic, { houseCode: code });

  if (!household) {
    return new Response(`<html><body><h2>Household not found</h2><p>Code: ${htmlEscape(code)}</p></body></html>`, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const members = household.members || [];
  const schemes = household.schemes || [];

  const memberRows =
    members.length === 0
      ? `<tr><td colspan="6">No members</td></tr>`
      : members
          .map(
            (m, i) =>
              `<tr><td>${i + 1}</td><td>${htmlEscape(m.name)}</td><td>${htmlEscape(m.relation || "-")}</td><td>${htmlEscape(m.age || "-")}</td><td>${htmlEscape(m.gender || "-")}</td><td>${htmlEscape(m.occupation || "-")}</td></tr>`
          )
          .join("");

  const schemeRows =
    schemes.length === 0
      ? `<tr><td colspan="5">No schemes</td></tr>`
      : schemes
          .map(
            (s, i) =>
              `<tr><td>${i + 1}</td><td>${htmlEscape(s.schemeName)}</td><td>${htmlEscape(s.status)}</td><td>${htmlEscape(s.benefitAmount || "-")}</td><td>${htmlEscape(s.remarks || "-")}</td></tr>`
          )
          .join("");

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>Household ${htmlEscape(household.houseCode)}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #0f172a; }
        h1, h2 { margin: 0 0 8px; }
        .meta p { margin: 4px 0; }
        table { border-collapse: collapse; width: 100%; margin-top: 8px; }
        th, td { border: 1px solid #999; padding: 8px; text-align: left; vertical-align: top; }
        th { background: #f3f4f6; }
        .actions { margin: 14px 0; }
        .btn { background: #0f766e; color: white; border: 0; padding: 10px 14px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <h1>GramInfo Household Profile</h1>
      <h2>${htmlEscape(household.headName)}</h2>
      <div class="meta">
        <p><b>House Code:</b> ${htmlEscape(household.houseCode)}</p>
        <p><b>Address:</b> ${htmlEscape(household.address)}</p>
        <p><b>Primary Mobile:</b> ${htmlEscape(household.phone || "-")}</p>
        <p><b>Aadhaar:</b> ${htmlEscape(household.aadhaarNumber || "-")}</p>
        <p><b>Secondary Mobile:</b> ${htmlEscape(household.secondaryMobile || "-")}</p>
        <p><b>Ration Card:</b> ${htmlEscape(household.rationCardNumber || "-")}</p>
        <p><b>Voter ID:</b> ${htmlEscape(household.voterIdNumber || "-")}</p>
      </div>
      <div class="actions">
        <button class="btn" onclick="window.print()">Download as PDF</button>
      </div>
      <h3>Family Members</h3>
      <table>
        <tr><th>#</th><th>Name</th><th>Relation</th><th>Age</th><th>Gender</th><th>Occupation</th></tr>
        ${memberRows}
      </table>
      <h3 style="margin-top:16px;">Government Schemes</h3>
      <table>
        <tr><th>#</th><th>Scheme</th><th>Status</th><th>Benefit</th><th>Remarks</th></tr>
        ${schemeRows}
      </table>
    </body>
  </html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
