// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
// @ts-ignore
import * as cheerio from "npm:cheerio@1.0.0";
// @ts-ignore
import { XMLParser } from "npm:fast-xml-parser@4.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Vehicle = {
  externalId: string;
  stockNumber: string | null;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  location: string;
  bodyType: string;
  transmission: string;
  fuelType: string;
  drivetrain: string;
  exteriorColor: string;
  interiorColor: string;
  vin: string | null;
  condition: string;
  description: string;
  sellerPhone: string;
  status: "active" | "sold" | "removed";
  images: string[];
  listingUrl: string | null;
  sourceUpdatedAt: string | null;
};

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const asText = (value: unknown) => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return asText(object.value ?? object.name ?? object.text ?? object["#text"] ?? "");
  }
  return "";
};

const valuesByKey = (input: unknown) => {
  const output = new Map<string, unknown[]>();
  const visit = (value: unknown, depth = 0) => {
    if (depth > 8 || value == null || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      const normalized = normalizeKey(key.replace(/^@_/, ""));
      output.set(normalized, [...(output.get(normalized) || []), child]);
      visit(child, depth + 1);
    });
  };
  visit(input);
  return output;
};

const pick = (map: Map<string, unknown[]>, aliases: string[]) => {
  for (const alias of aliases) {
    for (const value of map.get(normalizeKey(alias)) || []) {
      const text = asText(value);
      if (text) return text;
    }
  }
  return "";
};

const toNumber = (value: unknown) => {
  const normalized = asText(value).replace(/[^0-9.-]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};

const htmlToPlainText = (value: string) => {
  if (!value) return "";
  const $ = cheerio.load(`<body>${value}</body>`);
  $("script, style, noscript").remove();
  $("br").replaceWith("\n");
  $("li").each((_: number, element: any) => {
    $(element).prepend("• ").append("\n");
  });
  $("p, h1, h2, h3, h4, h5, h6, div").each((_: number, element: any) => {
    $(element).append("\n");
  });
  return $("body")
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
};

const absoluteUrl = (value: string, baseUrl: string) => {
  try {
    const url = new URL(value, baseUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
};

const collectImages = (input: unknown, baseUrl: string) => {
  const found: string[] = [];
  const imageKeys = new Set([
    "image", "images", "imageurl", "imageurls", "photo", "photos", "photourl",
    "picture", "pictures", "media", "mainimage", "primaryimage", "coverimage", "midvdsmedia",
  ]);
  const visit = (value: unknown, key = "", depth = 0) => {
    if (depth > 8 || value == null) return;
    if (typeof value === "string") {
      if (!imageKeys.has(normalizeKey(key))) return;
      value.split(/[|,\n]/).forEach((part) => {
        const rawUrl = part.trim();
        const hillzMedia = rawUrl.startsWith("/") && ["coverimage", "midvdsmedia"].includes(normalizeKey(key));
        const url = absoluteUrl(rawUrl, hillzMedia ? "https://hillzcdn.ca" : baseUrl);
        if (url && /\.(jpe?g|png|webp|avif)(\?|$)/i.test(url)) found.push(url);
      });
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key, depth + 1));
      return;
    }
    if (typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([childKey, child]) =>
        visit(child, imageKeys.has(normalizeKey(childKey)) ? childKey : key, depth + 1)
      );
    }
  };
  visit(input);
  const uniqueUrls = [...new Set(found)];
  const fullResolution = uniqueUrls.filter((url) => !/\/(thumb|thumbnail)[-_]/i.test(new URL(url).pathname));
  // Providers commonly include the same photo twice as media_src + thumbnail_src.
  // Prefer the full-resolution set and use thumbnails only when no originals exist.
  return (fullResolution.length ? fullResolution : uniqueUrls).slice(0, 30);
};

const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const normalizeVehicle = async (
  raw: Record<string, unknown>,
  baseUrl: string,
  defaults: { location: string; phone: string },
): Promise<Vehicle | null> => {
  const fields = valuesByKey(raw);
  const vin = pick(fields, ["vin", "vinNumber", "vehicleIdentificationNumber"]).replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const stockNumber = pick(fields, ["stockNumber", "stock", "stockNo", "stockId"]);
  const make = pick(fields, ["make", "vehicleMake", "brand", "manufacturer"]);
  const model = pick(fields, ["model", "vehicleModel", "modelName"]);
  const titleFromSource = pick(fields, ["title", "name", "vehicleName"]);
  const yearCandidate = pick(fields, ["year", "modelYear", "vehicleModelDate"])
    || titleFromSource.match(/\b(19|20)\d{2}\b/)?.[0]
    || "";
  const year = Math.trunc(toNumber(yearCandidate));
  const price = toNumber(pick(fields, ["price", "sellPrice", "salePrice", "internetPrice", "askingPrice", "retailPrice"]));
  const mileage = Math.max(0, Math.trunc(toNumber(pick(fields, ["mileage", "odometer", "kilometers", "kilometres", "mileageFromOdometer"]))));
  const listingUrlRaw = pick(fields, ["url", "listingUrl", "vehicleUrl", "vdpUrl", "link"]);
  const listingUrl = listingUrlRaw ? absoluteUrl(listingUrlRaw, baseUrl) : baseUrl;
  const explicitId = pick(fields, ["externalId", "vehicleId", "listingId", "id", "guid"]);
  const externalId = vin || stockNumber || explicitId || (listingUrl ? await sha256(listingUrl) : "");
  if (!externalId || !year || year < 1900 || year > new Date().getFullYear() + 2 || !make || !model || price <= 0) {
    return null;
  }

  const rawStatus = pick(fields, ["status", "availability", "inventoryStatus", "vehicleStatus"]).toLowerCase();
  const status = /sold|unavailable|removed|deleted/.test(rawStatus)
    ? "sold"
    : "active";
  const descriptiveTitle = titleFromSource.toLowerCase().includes(make.toLowerCase())
    || titleFromSource.toLowerCase().includes(model.toLowerCase())
    || titleFromSource.includes(String(year));
  const title = descriptiveTitle ? titleFromSource : `${year} ${make} ${model}`;
  const sourceUpdatedAt = pick(fields, ["updatedAt", "lastModified", "modifiedAt", "dateModified"]);

  return {
    externalId,
    stockNumber: stockNumber || null,
    title,
    make,
    model,
    year,
    price,
    mileage,
    location: pick(fields, ["location", "dealerLocation", "address", "city"]) || defaults.location,
    bodyType: pick(fields, ["bodyType", "bodyStyle", "vehicleConfiguration"]) || "Other",
    transmission: pick(fields, ["transmission", "vehicleTransmission"]) || "Automatic",
    fuelType: pick(fields, ["fuelType", "fuel"]) || "Gasoline",
    drivetrain: pick(fields, ["drivetrain", "driveTrain", "driveType"]) || "Other",
    exteriorColor: pick(fields, ["exteriorColor", "colour", "color"]) || "",
    interiorColor: pick(fields, ["interiorColor"]) || "",
    vin: vin || null,
    condition: pick(fields, ["condition", "itemCondition"]) || "Used",
    description: htmlToPlainText(pick(fields, ["description", "comment", "comments", "vehicleDescription"])),
    sellerPhone: pick(fields, ["sellerPhone", "dealerPhone", "telephone", "phone"]) || defaults.phone,
    status,
    images: collectImages(raw, baseUrl),
    listingUrl: listingUrl || null,
    sourceUpdatedAt: sourceUpdatedAt && !Number.isNaN(Date.parse(sourceUpdatedAt))
      ? new Date(sourceUpdatedAt).toISOString()
      : null,
  };
};

const findVehicleObjects = (input: unknown) => {
  const found: Record<string, unknown>[] = [];
  const seen = new Set<object>();
  const visit = (value: unknown, depth = 0) => {
    if (depth > 10 || value == null || typeof value !== "object" || seen.has(value as object)) return;
    seen.add(value as object);
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    const object = value as Record<string, unknown>;
    const fields = valuesByKey(object);
    const type = pick(fields, ["@type", "type"]).toLowerCase();
    const vehicleLike = /vehicle|car|product/.test(type)
      || Boolean(pick(fields, ["vin", "vehicleIdentificationNumber"]))
      || (Boolean(pick(fields, ["year", "modelYear", "vehicleModelDate"]))
        && Boolean(pick(fields, ["make", "brand", "manufacturer"]))
        && Boolean(pick(fields, ["model", "vehicleModel"])));
    if (vehicleLike) found.push(object);
    Object.values(object).forEach((child) => visit(child, depth + 1));
  };
  visit(input);
  return found;
};

const findArraysByKey = (input: unknown, targetKey: string) => {
  const found: Record<string, unknown>[] = [];
  const seen = new Set<object>();
  const visit = (value: unknown, depth = 0) => {
    if (depth > 12 || value == null || typeof value !== "object" || seen.has(value as object)) return;
    seen.add(value as object);
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      if (normalizeKey(key) === normalizeKey(targetKey) && Array.isArray(child)) {
        child.forEach((item) => {
          if (item && typeof item === "object" && !Array.isArray(item)) found.push(item as Record<string, unknown>);
        });
      } else {
        visit(child, depth + 1);
      }
    });
  };
  visit(input);
  return found;
};

const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value.trim()); value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim()); value = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      value += char;
    }
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift() || [];
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
};

const blockedHostname = (hostname: string) => {
  const lower = hostname.toLowerCase();
  if (["localhost", "localhost.localdomain", "0.0.0.0", "::1"].includes(lower) || lower.endsWith(".local")) return true;
  if (/^(10|127)\./.test(lower) || /^192\.168\./.test(lower)) return true;
  const private172 = lower.match(/^172\.(\d+)\./);
  return Boolean(private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31);
};

const validateSourceUrl = (value: string) => {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || blockedHostname(url.hostname)) {
    throw new Error("Enter a public HTTP or HTTPS inventory URL.");
  }
  return url.toString();
};

const fetchDocument = async (url: string) => {
  validateSourceUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "1ntelInventorySync/1.0 (+https://www.1ntel.ca)" },
    });
    if (!response.ok) throw new Error(`Inventory source returned HTTP ${response.status}.`);
    validateSourceUrl(response.url);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 12_000_000) throw new Error("Inventory source is larger than 12 MB.");
    return {
      url: response.url,
      type: response.headers.get("content-type") || "",
      text: await response.text(),
    };
  } finally {
    clearTimeout(timer);
  }
};

const parseHtml = (html: string, pageUrl: string) => {
  const $ = cheerio.load(html);
  const objects: Record<string, unknown>[] = [];
  const addStructuredPayload = (parsed: unknown) => {
    const namedInventory = ["vehiclesData", "inventory", "vehicles", "listings", "cars"]
      .flatMap((key) => findArraysByKey(parsed, key));
    objects.push(...(namedInventory.length ? namedInventory : findVehicleObjects(parsed)));
  };
  $("script#__NEXT_DATA__").each((_: number, element: any) => {
    try {
      addStructuredPayload(JSON.parse($(element).text()));
    } catch { /* Ignore invalid framework data. */ }
  });
  $('script[type="application/json"]').not("#__NEXT_DATA__").each((_: number, element: any) => {
    try {
      addStructuredPayload(JSON.parse($(element).text()));
    } catch { /* Ignore unrelated or invalid embedded JSON. */ }
  });
  $('script[type="application/ld+json"]').each((_: number, element: any) => {
    try {
      objects.push(...findVehicleObjects(JSON.parse($(element).text())));
    } catch { /* Ignore invalid third-party JSON-LD. */ }
  });
  $('[itemtype*="Vehicle"], [itemtype*="Product"]').each((_: number, element: any) => {
    const item: Record<string, unknown> = {};
    $(element).find("[itemprop]").each((__: number, property: any) => {
      const key = String($(property).attr("itemprop") || "").trim();
      if (!key) return;
      const value = $(property).attr("content") || $(property).attr("href") || $(property).attr("src") || $(property).text().trim();
      if (!value) return;
      if (key === "image") {
        const previousImages = Array.isArray(item[key]) ? item[key] as unknown[] : [];
        item[key] = [...previousImages, value];
      } else {
        item[key] = value;
      }
    });
    if (Object.keys(item).length) objects.push(item);
  });
  const links: string[] = [];
  $("a[href]").each((_: number, element: any) => {
    const href = absoluteUrl(String($(element).attr("href") || ""), pageUrl);
    if (!href) return;
    try {
      const current = new URL(pageUrl);
      const target = new URL(href);
      if (target.hostname !== current.hostname) return;
      const hint = `${target.pathname} ${$(element).text()}`.toLowerCase();
      if (/inventory|vehicle|used|pre-owned|preowned|\bvdp\b|\/cars?\//.test(hint)) links.push(href);
    } catch { /* Ignore malformed links. */ }
  });
  return { objects, links: [...new Set(links)] };
};

const parseInventorySource = async (
  sourceUrl: string,
  defaults: { location: string; phone: string },
) => {
  const root = await fetchDocument(sourceUrl);
  const trimmed = root.text.trim();
  let rawVehicles: Record<string, unknown>[] = [];

  if (/json/i.test(root.type) || /^[\[{]/.test(trimmed)) {
    rawVehicles = findVehicleObjects(JSON.parse(trimmed));
  } else if (/xml/i.test(root.type) || trimmed.startsWith("<?xml") || /^<feed[\s>]/i.test(trimmed)) {
    const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" }).parse(trimmed);
    rawVehicles = findVehicleObjects(parsed);
  } else if (/csv/i.test(root.type) || /(^|\n)(vin|stock|year|make),/i.test(trimmed.slice(0, 1000))) {
    rawVehicles = parseCsv(trimmed);
  } else {
    const rootPage = parseHtml(root.text, root.url);
    rawVehicles.push(...rootPage.objects);
    let detailLinks = rootPage.links;

    if (rawVehicles.length === 0) {
      const indexPages = rootPage.links.slice(0, 8);
      const indexResults = await Promise.allSettled(indexPages.map(fetchDocument));
      detailLinks = [];
      indexResults.forEach((result) => {
        if (result.status !== "fulfilled") return;
        const parsed = parseHtml(result.value.text, result.value.url);
        rawVehicles.push(...parsed.objects);
        detailLinks.push(...parsed.links);
      });
    }

    if (rawVehicles.length < 5) {
      const uniqueDetails = [...new Set(detailLinks)].filter((url) => url !== root.url).slice(0, 50);
      for (let start = 0; start < uniqueDetails.length; start += 8) {
        const batch = await Promise.allSettled(uniqueDetails.slice(start, start + 8).map(fetchDocument));
        batch.forEach((result) => {
          if (result.status !== "fulfilled") return;
          rawVehicles.push(...parseHtml(result.value.text, result.value.url).objects);
        });
      }
    }
  }

  const normalized = await Promise.all(rawVehicles.map((raw) => normalizeVehicle(raw, root.url, defaults)));
  const unique = new Map<string, Vehicle>();
  normalized.filter((vehicle): vehicle is Vehicle => Boolean(vehicle)).forEach((vehicle) => unique.set(vehicle.externalId, vehicle));
  return [...unique.values()];
};

const syncIntegration = async (admin: any, integration: any, triggerType: string) => {
  const now = new Date();
  const { data: run, error: runError } = await admin.from("inventory_sync_runs").insert({
    integration_id: integration.id,
    dealer_id: integration.dealer_id,
    trigger_type: triggerType,
    status: "running",
  }).select("id").single();
  if (runError) throw runError;

  await admin.from("inventory_integrations").update({
    last_sync_started_at: now.toISOString(),
    last_sync_status: "running",
    last_error: null,
  }).eq("id", integration.id);

  try {
    const { data: profile } = await admin.from("profiles")
      .select("city, province, location, phone")
      .eq("id", integration.dealer_id)
      .limit(1)
      .maybeSingle();
    const defaults = {
      location: [profile?.location || profile?.city, profile?.province].filter(Boolean).join(", ") || "Canada",
      phone: profile?.phone || "",
    };
    const detectedVehicles = await parseInventorySource(integration.source_url, defaults);
    if (detectedVehicles.length === 0) {
      throw new Error("No valid vehicles were detected. Use a dealership inventory page or a JSON, XML, or CSV feed URL.");
    }

    // Syndicated inventory is separate from the dealer's manual listing quota.
    // Import every valid active vehicle supplied by the connected source.
    const vehicles = [...detectedVehicles]
      .sort((left, right) => left.externalId.localeCompare(right.externalId));

    const { data: existingRows, error: existingError } = await admin.from("cars")
      .select("id, external_vehicle_id, sync_hash, status")
      .eq("inventory_integration_id", integration.id);
    if (existingError) throw existingError;
    const existing = new Map((existingRows || []).map((row: any) => [String(row.external_vehicle_id), row]));
    const seen = new Set<string>();
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const vehicle of vehicles) {
      seen.add(vehicle.externalId);
      const syncHash = await sha256(JSON.stringify(vehicle));
      const previous = existing.get(vehicle.externalId);
      const carPayload = {
        seller_id: integration.dealer_id,
        title: vehicle.title,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        price: vehicle.price,
        mileage: vehicle.mileage,
        location: vehicle.location,
        body_type: vehicle.bodyType,
        transmission: vehicle.transmission,
        fuel_type: vehicle.fuelType,
        drivetrain: vehicle.drivetrain,
        exterior_color: vehicle.exteriorColor,
        interior_color: vehicle.interiorColor,
        vin: vehicle.vin,
        condition: vehicle.condition,
        description: vehicle.description,
        seller_phone: vehicle.sellerPhone,
        status: vehicle.status,
        inventory_integration_id: integration.id,
        inventory_source: integration.source_type,
        external_vehicle_id: vehicle.externalId,
        external_stock_number: vehicle.stockNumber,
        source_listing_url: vehicle.listingUrl,
        source_updated_at: vehicle.sourceUpdatedAt,
        last_synced_at: now.toISOString(),
        sync_hash: syncHash,
        is_source_managed: true,
      };

      let carId = previous?.id;
      if (!previous) {
        const { data: inserted, error } = await admin.from("cars").insert(carPayload).select("id").single();
        if (error) throw error;
        carId = inserted.id;
        created += 1;
      } else if (previous.sync_hash !== syncHash || previous.status !== vehicle.status) {
        const { error } = await admin.from("cars").update(carPayload).eq("id", previous.id);
        if (error) throw error;
        updated += 1;
      } else {
        await admin.from("cars").update({ last_synced_at: now.toISOString(), is_source_managed: true }).eq("id", previous.id);
        skipped += 1;
      }

      if (carId && vehicle.images.length && (!previous || previous.sync_hash !== syncHash)) {
        await admin.from("car_images").delete().eq("car_id", carId);
        const { error } = await admin.from("car_images").insert(vehicle.images.map((imageUrl, index) => ({
          car_id: carId,
          image_url: imageUrl,
          angle: index === 0 ? "front" : `source-${index + 1}`,
          sort_order: index,
        })));
        if (error) throw error;
      }
    }

    const missingIds = (existingRows || [])
      .filter((row: any) => row.external_vehicle_id && !seen.has(String(row.external_vehicle_id)) && row.status !== "removed")
      .map((row: any) => row.id);
    if (missingIds.length) {
      const { error } = await admin.from("cars").update({ status: "removed", last_synced_at: now.toISOString() }).in("id", missingIds);
      if (error) throw error;
    }

    const completedAt = new Date();
    const summary = {
      items_found: detectedVehicles.length,
      items_created: created,
      items_updated: updated,
      items_removed: missingIds.length,
    };
    await admin.from("inventory_sync_runs").update({
      status: "completed",
      ...summary,
      items_skipped: skipped,
      completed_at: completedAt.toISOString(),
    }).eq("id", run.id);
    await admin.from("inventory_integrations").update({
      status: "active",
      last_sync_completed_at: completedAt.toISOString(),
      next_sync_at: new Date(completedAt.getTime() + Number(integration.sync_interval_minutes || 60) * 60000).toISOString(),
      last_sync_status: "completed",
      last_error: null,
      last_items_found: detectedVehicles.length,
      last_items_created: created,
      last_items_updated: updated,
      last_items_removed: missingIds.length,
      updated_at: completedAt.toISOString(),
    }).eq("id", integration.id);
    return { found: detectedVehicles.length, created, updated, removed: missingIds.length, skipped };
  } catch (error: any) {
    const message = error?.message || "Inventory sync failed.";
    const failedAt = new Date().toISOString();
    await admin.from("inventory_sync_runs").update({ status: "failed", error_message: message, completed_at: failedAt }).eq("id", run.id);
    await admin.from("inventory_integrations").update({
      status: "error",
      last_sync_status: "failed",
      last_error: message,
      next_sync_at: new Date(Date.now() + 60 * 60000).toISOString(),
      updated_at: failedAt,
    }).eq("id", integration.id);
    throw error;
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) return json({ error: "Inventory sync service is not configured." }, 500);
    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "sync");

    if (action === "scheduled") {
      const { data: tokenRow } = await admin.from("inventory_sync_settings").select("value").eq("key", "scheduler_token").maybeSingle();
      if (!tokenRow?.value || body.scheduler_token !== tokenRow.value) return json({ error: "Invalid scheduler token." }, 401);
      const { data: due, error } = await admin.from("inventory_integrations")
        .select("*")
        .in("status", ["active", "error"])
        .lte("next_sync_at", new Date().toISOString())
        .order("next_sync_at", { ascending: true })
        .limit(5);
      if (error) throw error;
      const results = [];
      for (const integration of due || []) {
        try {
          results.push({ integration_id: integration.id, ...(await syncIntegration(admin, integration, "scheduled")) });
        } catch (error: any) {
          results.push({ integration_id: integration.id, error: error?.message || "Sync failed" });
        }
      }
      return json({ ok: true, processed: results.length, results });
    }

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Dealer login required." }, 401);
    const dealerId = userData.user.id;
    const { data: profile } = await admin.from("profiles").select("role, dealer_status")
      .eq("id", dealerId).limit(1).maybeSingle();
    if (String(profile?.role || "").toLowerCase() !== "dealer" || String(profile?.dealer_status || "").toLowerCase() !== "approved") {
      return json({ error: "Approved dealer access required." }, 403);
    }

    let { data: integration } = await admin.from("inventory_integrations").select("*").eq("dealer_id", dealerId).maybeSingle();
    if (action === "connect") {
      if (body.authorization_confirmed !== true) return json({ error: "Inventory publishing authorization is required." }, 400);
      const sourceUrl = validateSourceUrl(String(body.source_url || "").trim());
      const interval = Math.min(1440, Math.max(30, Number(body.sync_interval_minutes || 60)));
      const { data, error } = await admin.from("inventory_integrations").upsert({
        dealer_id: dealerId,
        source_type: ["auto", "website", "json", "xml", "csv"].includes(body.source_type) ? body.source_type : "auto",
        source_url: sourceUrl,
        status: "active",
        authorization_confirmed: true,
        sync_interval_minutes: interval,
        next_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "dealer_id" }).select("*").single();
      if (error) throw error;
      integration = data;
      const result = await syncIntegration(admin, integration, "connection");
      return json({ ok: true, integration_id: integration.id, result });
    }

    if (!integration) return json({ error: "Connect an inventory source first." }, 404);
    if (action === "pause") {
      await admin.from("inventory_integrations").update({ status: "paused", updated_at: new Date().toISOString() }).eq("id", integration.id);
      return json({ ok: true });
    }
    if (action === "resume") {
      await admin.from("inventory_integrations").update({ status: "active", next_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", integration.id);
      return json({ ok: true });
    }
    if (action === "disconnect") {
      await admin.from("inventory_integrations").update({ status: "disconnected", updated_at: new Date().toISOString() }).eq("id", integration.id);
      await admin.from("cars").update({ is_source_managed: false }).eq("inventory_integration_id", integration.id);
      return json({ ok: true });
    }
    if (action !== "sync") return json({ error: "Invalid action." }, 400);
    if (!["active", "error"].includes(integration.status)) return json({ error: "Resume the inventory connection before syncing." }, 400);
    return json({ ok: true, result: await syncIntegration(admin, integration, "manual") });
  } catch (error: any) {
    console.error("Inventory sync error:", error);
    return json({ error: error?.message || "Inventory sync failed." }, 500);
  }
});
