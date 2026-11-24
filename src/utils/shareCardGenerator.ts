export interface ShareCardPayload {
  kind: 'TROPHY' | 'SEASON' | 'BALLON_DOR';
  clubName: string;
  clubInitials: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  managerName: string;
  specialtyLabel?: string;
  headline: string;
  subtitle: string;
  yearLabel: string;
  stats: Array<{ label: string; value: string }>;
  highlightLine?: string;
  footerNote?: string;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateAndShareAchievementCard(
  payload: ShareCardPayload
): Promise<'shared' | 'downloaded' | 'error'> {
  try {
    const W = 1080;
    const H = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'error';

    // 1. Deep stadium dark canvas + club-tinted radial glow
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#050a14');
    bgGrad.addColorStop(0.55, '#0b1426');
    bgGrad.addColorStop(1, '#040812');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W * 0.5, 340, 40, W * 0.5, 340, 620);
    glow.addColorStop(0, `${payload.primaryColor}55`);
    glow.addColorStop(0.5, `${payload.primaryColor}18`);
    glow.addColorStop(1, 'rgba(5,10,20,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Subtle pitch-line geometric motif
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 48, W - 96, H - 96);
    ctx.beginPath();
    ctx.arc(W / 2, 340, 210, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Top Brand Header
    ctx.fillStyle = '#38bdf8';
    ctx.font = '800 28px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PATOFOOT 2026', W / 2, 118);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      payload.kind === 'BALLON_DOR'
        ? 'GALA FIFA · BOLA DE OURO'
        : payload.kind === 'SEASON'
        ? `RESUMO OFICIAL DA TEMPORADA · ${payload.yearLabel}`
        : `CONQUISTA OFICIAL · ${payload.yearLabel}`,
      W / 2,
      154
    );

    // 3. Club Shield Emblem
    const shieldSize = 188;
    const shieldX = (W - shieldSize) / 2;
    const shieldY = 210;

    drawRoundedRect(ctx, shieldX - 6, shieldY - 6, shieldSize + 12, shieldSize + 12, 42);
    const goldBorder = ctx.createLinearGradient(
      shieldX,
      shieldY,
      shieldX + shieldSize,
      shieldY + shieldSize
    );
    goldBorder.addColorStop(0, '#fde047');
    goldBorder.addColorStop(0.5, '#f59e0b');
    goldBorder.addColorStop(1, '#38bdf8');
    ctx.fillStyle = goldBorder;
    ctx.fill();

    drawRoundedRect(ctx, shieldX, shieldY, shieldSize, shieldSize, 36);
    ctx.fillStyle = payload.primaryColor || '#0ea5e9';
    ctx.fill();

    ctx.fillStyle = payload.textColor || '#ffffff';
    ctx.font = '900 64px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(payload.clubInitials.slice(0, 4).toUpperCase(), W / 2, shieldY + shieldSize / 2 + 4);
    ctx.textBaseline = 'alphabetic';

    // 4. Main Headline & Subtitle
    ctx.fillStyle = '#facc15';
    ctx.font = '900 56px system-ui, -apple-system, sans-serif';
    const headlineLines = wrapText(ctx, payload.headline.toUpperCase(), W - 160);
    let cursorY = 485;
    for (const line of headlineLines.slice(0, 2)) {
      ctx.fillText(line, W / 2, cursorY);
      cursorY += 66;
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 34px system-ui, -apple-system, sans-serif';
    const subLines = wrapText(ctx, payload.subtitle, W - 160);
    for (const line of subLines.slice(0, 2)) {
      ctx.fillText(line, W / 2, cursorY + 8);
      cursorY += 44;
    }

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(payload.clubName, W / 2, cursorY + 18);

    // 5. Stats Grid (2x2 or 3-col)
    const stats = payload.stats.slice(0, 4);
    const cols = stats.length <= 3 ? Math.max(1, stats.length) : 2;
    const gridW = W - 160;
    const gap = 24;
    const cardW = (gridW - gap * (cols - 1)) / cols;
    const cardH = 148;
    const startY = Math.max(700, cursorY + 70);

    stats.forEach((st, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = 80 + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      drawRoundedRect(ctx, x, y, cardW, cardH, 24);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 20px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.label.toUpperCase(), x + cardW / 2, y + 52);

      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 40px ui-monospace, SFMono-Regular, monospace';
      ctx.fillText(st.value, x + cardW / 2, y + 108);
    });

    const rowsCount = Math.ceil(stats.length / cols);
    let bottomY = startY + rowsCount * (cardH + gap) + 26;

    // 6. Highlight line (e.g. Top Scorer / Final Score / Manager Specialty)
    if (payload.highlightLine) {
      drawRoundedRect(ctx, 80, bottomY, W - 160, 88, 20);
      ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#e0f2fe';
      ctx.font = '700 24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(payload.highlightLine, W / 2, bottomY + 53);
      bottomY += 116;
    }

    // 7. Manager Signature Footer
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, H - 185);
    ctx.lineTo(W - 100, H - 185);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COMANDANTE DA CAMPANHA', W / 2, H - 142);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 32px system-ui, -apple-system, sans-serif';
    const mgrLine = payload.specialtyLabel
      ? `${payload.managerName} · ${payload.specialtyLabel}`
      : payload.managerName;
    ctx.fillText(mgrLine, W / 2, H - 98);

    ctx.fillStyle = '#64748b';
    ctx.font = '600 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(
      payload.footerNote || 'Gerado no PATOFOOT 2026 · Futebol Manager',
      W / 2,
      H - 62
    );

    // Export as PNG Blob
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
    if (!blob) return 'error';

    const safeSlug = `${payload.clubInitials}_${payload.yearLabel}`
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_');
    const filename = `patofoot_${safeSlug}_card.png`;

    // Try native mobile share sheet first when supported
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const file = new File([blob], filename, { type: 'image/png' });
        if (
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            title: `${payload.headline} — ${payload.clubName}`,
            text: `${payload.subtitle} (${payload.yearLabel}) no PATOFOOT 2026!`,
            files: [file],
          });
          return 'shared';
        }
      } catch {
        // User cancelled or browser rejected file share — fall through to clean PNG download
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'downloaded';
  } catch {
    return 'error';
  }
}
