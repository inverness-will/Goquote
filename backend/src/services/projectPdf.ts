/**
 * Generates a professional PDF summary of a project (job estimate).
 */

import PDFDocument from 'pdfkit';

/** Project data as returned by toProjectJson (flights, hotels, costBreakdown, etc.). */
export type ProjectJson = {
  name: string;
  status: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  crew: number | null;
  workdays: number | null;
  transport: string | null;
  jobSiteAddress: string | null;
  originAirport: string | null;
  destinationAirport: string | null;
  costBreakdown: {
    sections: Array<{ id: string; title: string; amountCents: number; lineItems?: Array<{ label: string; detail?: string; amountCents: number }> }>;
    subtotalCents: number;
    contingencyCents: number;
    totalCents: number;
  } | null;
  flights?: Array<{ airline: string; flightNumber: string; departureTime: string; duration: string; numberOfChanges: number; priceCents: number; sortOrder: number; distanceKm?: number | null }>;
  hotels?: Array<{ name: string; address: string; stars: number; priceCents: number; sortOrder: number; distanceKm?: number | null }>;
  staff?: Array<{ title: string; hourlyRateCents: number; perDiemCents: number }>;
};

function formatCurrency(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  if (!start) return end ? formatDate(end) : '—';
  if (!end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatTime(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function formatDuration(iso: string): string {
  const match = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso || '—';
  const h = match[1] ? `${match[1]}h` : '';
  const m = match[2] ? `${match[2]}m` : '';
  return `${h} ${m}`.trim() || '—';
}

export function buildProjectPdfBuffer(project: ProjectJson): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const primary = '#1a1a2e';
    const accent = '#F67A34';
    const muted = '#6B7280';
    const line = '#E5E7EB';

    // ---- Title ----
    doc.fontSize(22).fillColor(primary).font('Helvetica-Bold').text(project.name, { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(muted).font('Helvetica').text(`Status: ${project.status}  •  ${project.location ?? '—'}  •  ${formatDateRange(project.startDate, project.endDate)}`);
    doc.moveDown(1.2);

    // ---- Overview ----
    doc.fontSize(12).fillColor(primary).font('Helvetica-Bold').text('Project overview', { align: 'left' });
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor(primary).font('Helvetica');
    const crew = project.crew ?? '—';
    const workdays = project.workdays ?? '—';
    const transport = project.transport ?? '—';
    doc.text(`Crew: ${crew}  •  Work days: ${workdays}  •  Transport: ${transport}`);
    if (project.jobSiteAddress) doc.text(`Job site: ${project.jobSiteAddress}`);
    if (project.originAirport || project.destinationAirport) {
      doc.text(`Route: ${project.originAirport ?? '—'} → ${project.destinationAirport ?? '—'}`);
    }
    doc.moveDown(1.2);

    // ---- Cost breakdown ----
    const cb = project.costBreakdown;
    if (cb && Array.isArray(cb.sections) && cb.sections.length > 0) {
      doc.fontSize(12).fillColor(primary).font('Helvetica-Bold').text('Cost breakdown', { align: 'left' });
      doc.moveDown(0.5);

      cb.sections.forEach((s: { id: string; title: string; amountCents: number; lineItems?: Array<{ label: string; detail?: string; amountCents: number }> }) => {
        doc.fontSize(10).fillColor(primary).font('Helvetica-Bold').text(s.title, { continued: true });
        doc.font('Helvetica').fillColor(primary).text(`  ${formatCurrency(s.amountCents)}`, { align: 'right' });
        if (s.lineItems && s.lineItems.length > 0) {
          s.lineItems.slice(0, 8).forEach((li: { label: string; detail?: string; amountCents: number }) => {
            doc.fontSize(9).fillColor(muted).font('Helvetica').text(`  ${li.label}  ${formatCurrency(li.amountCents)}`, { indent: 15 });
          });
        }
        doc.moveDown(0.3);
      });

      doc.moveDown(0.3);
      doc.strokeColor(line).lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.4);
      doc.fontSize(10).fillColor(primary).font('Helvetica').text('Subtotal', { continued: true });
      doc.text(formatCurrency(cb.subtotalCents), { align: 'right' });
      doc.font('Helvetica').text('Contingency', { continued: true });
      doc.text(formatCurrency(cb.contingencyCents), { align: 'right' });
      doc.font('Helvetica-Bold').text('Total', { continued: true });
      doc.text(formatCurrency(cb.totalCents), { align: 'right' });
      doc.moveDown(1.2);
    }

    // ---- Flights ----
    const flights = project.flights ?? [];
    if (flights.length > 0) {
      doc.fontSize(12).fillColor(primary).font('Helvetica-Bold').text('Flight options', { align: 'left' });
      doc.moveDown(0.4);
      const sorted = flights.slice().sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder);
      sorted.slice(0, 5).forEach((f: { airline: string; flightNumber: string; departureTime: string; duration: string; numberOfChanges: number; priceCents: number }) => {
        doc.fontSize(10).fillColor(primary).font('Helvetica').text(
          `${f.airline} ${f.flightNumber}  •  Departs ${formatTime(f.departureTime)}  •  ${formatDuration(f.duration)}  •  ${f.numberOfChanges === 0 ? 'Nonstop' : `${f.numberOfChanges} stop(s)`}  •  ${formatCurrency(f.priceCents)}`
        );
        doc.moveDown(0.2);
      });
      doc.moveDown(1);
    }

    // ---- Hotels ----
    const hotels = project.hotels ?? [];
    if (hotels.length > 0) {
      doc.fontSize(12).fillColor(primary).font('Helvetica-Bold').text('Hotel options', { align: 'left' });
      doc.moveDown(0.4);
      const sorted = hotels.slice().sort((a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder);
      sorted.slice(0, 5).forEach((h: { name: string; address: string; stars: number; priceCents: number; distanceKm?: number | null }) => {
        doc.fontSize(10).fillColor(primary).font('Helvetica').text(`${h.name}  ${'★'.repeat(h.stars)}  ${formatCurrency(h.priceCents)}`);
        doc.fontSize(9).fillColor(muted).text(`  ${h.address}${h.distanceKm != null ? `  •  ${h.distanceKm.toFixed(1)} km from job site` : ''}`);
        doc.moveDown(0.3);
      });
      doc.moveDown(1);
    }

    // ---- Staff / roles ----
    const staff = project.staff ?? [];
    if (staff.length > 0) {
      doc.fontSize(12).fillColor(primary).font('Helvetica-Bold').text('Staff & rates', { align: 'left' });
      doc.moveDown(0.4);
      staff.forEach((s: { title: string; hourlyRateCents: number; perDiemCents: number }) => {
        doc.fontSize(10).fillColor(primary).font('Helvetica').text(`${s.title}  •  ${formatCurrency(s.hourlyRateCents)}/hr  •  ${formatCurrency(s.perDiemCents)} per diem`);
        doc.moveDown(0.2);
      });
      doc.moveDown(1);
    }

    // ---- Footer ----
    doc.fontSize(9).fillColor(muted).font('Helvetica')
      .text(`Generated ${formatDate(new Date().toISOString())}  •  GoQuote Job Estimate`, 50, doc.page.height - 40, { align: 'center', width: 495 });

    doc.end();
  });
}
