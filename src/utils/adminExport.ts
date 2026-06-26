import moment from "moment";

const escapeCell = (value: unknown) => {
  const text = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return `"${text.replace(/"/g, '""')}"`;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const getRole = (user: any) => (user?.role === "user" ? "buyer" : user?.role || "buyer");
const getPlan = (user: any) =>
  String(user?.subscription_plan || user?.subscription?.plan || user?.plan || "free").toLowerCase();
const getStatus = (user: any) => {
  const plan = getPlan(user);
  const status = String(user?.subscription_status || user?.subscription?.status || "").toLowerCase();
  if (plan === "free" || plan === "individual") return "active";
  return status || "missing";
};

const formatDateTime = (value: unknown) =>
  value ? moment(String(value)).format("YYYY-MM-DD HH:mm") : "";

const normalizeUsers = (users: any[] = []) =>
  users.map((user) => ({
    id: user.id,
    name: user.full_name || "",
    email: user.email || "",
    phone: user.phone || "",
    role: getRole(user),
    plan: getPlan(user),
    billing_status: getStatus(user),
    joined_at: formatDateTime(user.created_at),
    renewal_at: formatDateTime(user.current_period_end || user.subscription?.current_period_end),
    banned: user.is_banned ? "yes" : "no",
    dealer_status: user.dealer_status || "",
    business_name: user.business_name || "",
    city: user.city || "",
    province: user.province || "",
    license_number: user.license_number || user.dealer_license_number || "",
    free_listings_used: user.free_listings_used ?? "",
    paid_listing_credits: user.paid_listing_credits ?? "",
    stripe_customer_id: user.subscription?.stripe_customer_id || "",
    stripe_subscription_id: user.subscription?.stripe_subscription_id || "",
  }));

const columns = [
  ["name", "Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["role", "Role"],
  ["plan", "Plan"],
  ["billing_status", "Billing Status"],
  ["joined_at", "Joined At"],
  ["renewal_at", "Renewal At"],
  ["banned", "Banned"],
  ["dealer_status", "Dealer Status"],
  ["business_name", "Business"],
  ["city", "City"],
  ["province", "Province"],
  ["license_number", "License"],
  ["free_listings_used", "Free Listings Used"],
  ["paid_listing_credits", "Paid Listing Credits"],
  ["stripe_customer_id", "Stripe Customer"],
  ["stripe_subscription_id", "Stripe Subscription"],
  ["id", "User ID"],
] as const;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "users";

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadUsersExcel = (title: string, users: any[] = []) => {
  const rows = normalizeUsers(users);
  const header = columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map(([key]) => `<td>${escapeHtml((row as any)[key])}</td>`)
          .join("")}</tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  downloadBlob(
    new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }),
    `1ntel-${slugify(title)}-${moment().format("YYYY-MM-DD")}.xls`
  );
};

export const downloadUsersCsv = (title: string, users: any[] = []) => {
  const rows = normalizeUsers(users);
  const header = columns.map(([, label]) => escapeCell(label)).join(",");
  const body = rows
    .map((row) => columns.map(([key]) => escapeCell((row as any)[key])).join(","))
    .join("\n");

  downloadBlob(
    new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" }),
    `1ntel-${slugify(title)}-${moment().format("YYYY-MM-DD")}.csv`
  );
};

const pageWidth = 595;
const pageHeight = 842;
const margin = 36;
const lineHeight = 14;

const pdfText = (
  value: unknown,
  x: number,
  y: number,
  size = 9,
  font = "F1",
  color = "0 0 0"
) =>
  `BT /${font} ${size} Tf ${color} rg ${x} ${y} Td (${String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ")}) Tj ET\n`;

const pdfLine = (x1: number, y1: number, x2: number, y2: number) =>
  `0.86 0.88 0.91 RG 0.7 w ${x1} ${y1} m ${x2} ${y2} l S\n`;

const truncate = (value: unknown, max: number) => {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const createPdf = (streams: string[]) => {
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  streams.forEach((stream) => {
    const contentObjectId = objects.length + 1;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    const pageObjectId = objects.length + 1;
    pageObjectIds.push(pageObjectId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    );
  });

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
};

export const downloadUsersPdf = (title: string, users: any[] = []) => {
  const rows = normalizeUsers(users);
  const streams: string[] = [];
  let page = 1;
  let y = pageHeight - 44;
  let stream = "";

  const startPage = () => {
    stream += pdfText("1ntel Admin Export", margin, pageHeight - 28, 14, "F2", "0.02 0.03 0.06");
    stream += pdfText(title, margin, pageHeight - 48, 11, "F2", "0.12 0.15 0.2");
    stream += pdfText(`Generated ${moment().format("YYYY-MM-DD HH:mm")} - ${rows.length} users`, margin, pageHeight - 64, 8, "F1", "0.38 0.43 0.5");
    stream += pdfLine(margin, pageHeight - 76, pageWidth - margin, pageHeight - 76);
    y = pageHeight - 94;
  };

  const finishPage = () => {
    stream += pdfLine(margin, 34, pageWidth - margin, 34);
    stream += pdfText(`Page ${page}`, pageWidth - 74, 18, 8, "F1", "0.38 0.43 0.5");
    streams.push(stream);
    stream = "";
    page += 1;
  };

  startPage();
  const exportRows = rows.length ? rows : normalizeUsers([]);

  exportRows.forEach((row) => {
    if (y < 74) {
      finishPage();
      startPage();
    }

    stream += pdfText(truncate(row.name || "No name", 24), margin, y, 9, "F2", "0.02 0.03 0.06");
    stream += pdfText(truncate(row.email, 31), margin + 130, y, 8, "F1", "0.25 0.29 0.35");
    stream += pdfText(truncate(row.phone, 18), margin + 306, y, 8, "F1", "0.25 0.29 0.35");
    stream += pdfText(`${row.role} / ${row.plan} / ${row.billing_status}`, margin + 410, y, 8, "F1", "0.25 0.29 0.35");
    y -= lineHeight;
    stream += pdfText(`Joined: ${row.joined_at || "-"}  Renewal: ${row.renewal_at || "-"}  Banned: ${row.banned}`, margin, y, 7.5, "F1", "0.42 0.47 0.55");
    y -= lineHeight + 4;
  });

  if (!rows.length) {
    stream += pdfText("No users in this section.", margin, y, 10, "F1", "0.38 0.43 0.5");
  }

  finishPage();

  downloadBlob(
    new Blob([createPdf(streams)], { type: "application/pdf" }),
    `1ntel-${slugify(title)}-${moment().format("YYYY-MM-DD")}.pdf`
  );
};
