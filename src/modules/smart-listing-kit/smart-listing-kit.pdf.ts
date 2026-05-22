import type { Locale } from "../../lib/i18n.ts";

import type {
  PdfGenerationRequest,
  PublicMarketingListingPayload,
} from "./smart-listing-kit.types.ts";

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");
}

function wrapText(value: string, maxLength = 78) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (`${current} ${word}`.trim().length > maxLength) {
      if (current) {
        lines.push(current);
      }
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function addTextLine(lines: string[], text: string, size = 11) {
  lines.push(`/${size >= 16 ? "F2" : "F1"} ${size} Tf (${escapePdfText(text)}) Tj T*`);
}

export function getSafePdfFileName(listingId: string, date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  const safeId = listingId.replace(/[^a-zA-Z0-9-]+/g, "-").slice(0, 80);

  return `prona-x-listing-${safeId}-${stamp}.pdf`;
}

export function buildListingPdfTextLines(
  listing: PublicMarketingListingPayload,
  options: PdfGenerationRequest,
  locale: Locale = "sq",
) {
  const lines: string[] = [];
  const location = [listing.location.neighborhood, listing.location.city]
    .filter(Boolean)
    .join(", ");

  lines.push("PRONA X CRM");
  lines.push(listing.title);
  lines.push(options.includePrice ? listing.price_label : locale === "sq" ? "Çmimi nuk shfaqet" : "Price hidden");
  if (location) lines.push(location);
  lines.push(`${listing.property_type} · ${listing.listing_status}`);

  const facts = [
    listing.area_m2 ? `${listing.area_m2} m2` : null,
    listing.bedrooms != null ? `${listing.bedrooms} ${locale === "sq" ? "dhoma" : "bedrooms"}` : null,
    listing.bathrooms != null ? `${listing.bathrooms} ${locale === "sq" ? "banjo" : "bathrooms"}` : null,
    listing.year_built ? `${locale === "sq" ? "Viti" : "Year"} ${listing.year_built}` : null,
  ].filter(Boolean);

  if (facts.length) {
    lines.push(facts.join(" · "));
  }

  if (listing.features.length) {
    lines.push(locale === "sq" ? "Veçori:" : "Highlights:");
    for (const feature of listing.features.slice(0, 8)) {
      lines.push(`- ${feature}`);
    }
  }

  if (listing.description) {
    lines.push(locale === "sq" ? "Përshkrimi:" : "Description:");
    lines.push(...wrapText(listing.description, 92).slice(0, 14));
  }

  if (listing.photos.length) {
    lines.push(locale === "sq" ? "Foto të listimit:" : "Listing photos:");
    for (const photo of listing.photos.slice(0, 6)) {
      lines.push(`- ${photo}`);
    }
  }

  if (options.includeAgentContact && listing.agent) {
    lines.push(locale === "sq" ? "Kontakt agjenti:" : "Agent contact:");
    lines.push(
      [listing.agent.name, listing.agent.phone, listing.agent.email]
        .filter(Boolean)
        .join(" · "),
    );
  }

  if (listing.public_url) {
    lines.push(`${locale === "sq" ? "Link publik" : "Public link"}: ${listing.public_url}`);
    if (options.includeQrCode) {
      lines.push(locale === "sq" ? "QR: përdor linkun publik për shpërndarje." : "QR: use the public link for sharing.");
    }
  }

  lines.push(
    locale === "sq"
      ? "Material informues. Detajet duhet të verifikohen përpara vendimit final."
      : "Informational material. Details should be verified before a final decision.",
  );

  return lines.filter(Boolean);
}

export function generateListingPdfBytes(
  listing: PublicMarketingListingPayload,
  options: PdfGenerationRequest,
  locale: Locale = "sq",
) {
  const textLines = buildListingPdfTextLines(listing, options, locale);
  const contentLines = ["BT", "50 790 Td", "14 TL"];

  textLines.forEach((line, index) => {
    addTextLine(contentLines, line.slice(0, 120), index < 2 ? 18 : 10);
  });
  contentLines.push("ET");

  const stream = contentLines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
