#!/usr/bin/env python3
"""
generate_report.py — ZEBALLOS / AMOR FIADO Performance Report Generator
Reads data.json + report-config.json, produces a PDF in reports/

Usage:
  python3 scripts/generate_report.py
  python3 scripts/generate_report.py --sections overview,streams,metrics28d
  python3 scripts/generate_report.py --out reports/custom.pdf
"""

import json, os, sys, argparse, datetime, math, io
from pathlib import Path

# ── paths ──────────────────────────────────────────────────────────────────────
BASE   = Path(__file__).parent.parent
DATA   = BASE / 'public' / 'data.json'
CONFIG = BASE / 'report-config.json'
OUT    = BASE / 'reports'

# ── colors ────────────────────────────────────────────────────────────────────
C_BG       = (0.05, 0.09, 0.16)   # #0d1728
C_CARD     = (0.12, 0.18, 0.28)   # #1e2e47
C_ORANGE   = (0.98, 0.45, 0.09)   # #f97316
C_GREEN    = (0.42, 0.87, 0.50)   # #4ade80 monthly
C_PURPLE   = (0.65, 0.55, 0.98)   # #a78bfa moderate
C_BLUE     = (0.38, 0.65, 0.98)   # #60a5fa light
C_AMBER    = (0.98, 0.75, 0.14)   # #fbbf24 super
C_TEXT     = (0.94, 0.96, 0.98)   # #f1f5f9
C_MUTED    = (0.58, 0.64, 0.73)   # #94a3b8
C_BORDER   = (0.20, 0.25, 0.33)   # #333f54

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, Image as RLImage, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

W, H = A4  # 595 x 842 pts

# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def fmt(n):
    if n is None: return '—'
    if n >= 1_000_000: return f'{n/1_000_000:.2f}M'
    if n >= 1_000:     return f'{n/1_000:.1f}k'
    return str(int(n))

def rgb(r, g, b): return colors.Color(r, g, b)

def mpl_to_image(fig):
    """Convert matplotlib figure to ReportLab Image."""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                facecolor=fig.get_facecolor())
    buf.seek(0)
    plt.close(fig)
    return buf

def section_header(title, styles):
    return [
        Spacer(1, 0.5*cm),
        Paragraph(f'<font color="#f97316"><b>{title.upper()}</b></font>', styles['SectionHead']),
        HRFlowable(width='100%', thickness=1, color=rgb(*C_ORANGE), spaceAfter=6),
    ]

def callout_note(text, styles):
    """Orange-bordered callout box for editorial notes."""
    if not text or not text.strip():
        return []
    t = Table(
        [[Paragraph(f'<font color="#fbbf24">&#9998;</font>  {text}', styles['NoteBody'])]],
        colWidths=[W - 4*cm],
    )
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,-1), rgb(0.12, 0.09, 0.03)),
        ('BOX',           (0,0), (-1,-1), 1.2, rgb(*C_ORANGE)),
        ('LEFTPADDING',   (0,0), (-1,-1), 10),
        ('RIGHTPADDING',  (0,0), (-1,-1), 10),
        ('TOPPADDING',    (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    return [Spacer(1, 0.2*cm), t, Spacer(1, 0.3*cm)]

# ══════════════════════════════════════════════════════════════════════════════
# Styles
# ══════════════════════════════════════════════════════════════════════════════

def build_styles():
    s = getSampleStyleSheet()
    def add(name, **kw):
        s.add(ParagraphStyle(name=name, **kw))

    add('Cover1',      fontSize=32, textColor=rgb(*C_TEXT),   fontName='Helvetica-Bold', alignment=TA_LEFT, leading=38)
    add('Cover2',      fontSize=16, textColor=rgb(*C_ORANGE), fontName='Helvetica-Bold', alignment=TA_LEFT, leading=22)
    add('Cover3',      fontSize=10, textColor=rgb(*C_MUTED),  fontName='Helvetica',      alignment=TA_LEFT)
    add('SectionHead', fontSize=11, textColor=rgb(*C_ORANGE), fontName='Helvetica-Bold', spaceBefore=4, spaceAfter=2)
    add('Body',        fontSize=9,  textColor=rgb(*C_TEXT),   fontName='Helvetica',      leading=13, spaceAfter=4)
    add('BodyMuted',   fontSize=8,  textColor=rgb(*C_MUTED),  fontName='Helvetica',      leading=12)
    add('KPILabel',    fontSize=7,  textColor=rgb(*C_MUTED),  fontName='Helvetica',      alignment=TA_CENTER)
    add('KPIValue',    fontSize=18, textColor=rgb(*C_ORANGE), fontName='Helvetica-Bold', alignment=TA_CENTER, leading=22)
    add('KPISub',      fontSize=7,  textColor=rgb(*C_MUTED),  fontName='Helvetica',      alignment=TA_CENTER)
    add('Insight',     fontSize=8,  textColor=rgb(*C_TEXT),   fontName='Helvetica',      leading=12, spaceAfter=3,
        leftIndent=10, bulletIndent=0)
    add('NoteBody',    fontSize=8.5, textColor=rgb(*C_TEXT),  fontName='Helvetica',      leading=13, spaceAfter=0)
    return s

# ══════════════════════════════════════════════════════════════════════════════
# Dark background canvas callback
# ══════════════════════════════════════════════════════════════════════════════

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColorRGB(*C_BG)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # footer
    canvas.setFillColorRGB(*C_MUTED)
    canvas.setFont('Helvetica', 7)
    canvas.drawString(2*cm, 1.2*cm, 'ZEBALLOS — AMOR FIADO  |  Spotify for Artists data  |  Uso interno')
    canvas.drawRightString(W - 2*cm, 1.2*cm, f'Pág. {doc.page}')
    canvas.restoreState()

def on_cover_page(canvas, doc):
    canvas.saveState()
    # full dark bg
    canvas.setFillColorRGB(*C_BG)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # orange left stripe
    canvas.setFillColorRGB(*C_ORANGE)
    canvas.rect(0, 0, 8, H, fill=1, stroke=0)
    canvas.restoreState()

# ══════════════════════════════════════════════════════════════════════════════
# Section builders
# ══════════════════════════════════════════════════════════════════════════════

_MESES = {1:'enero',2:'febrero',3:'marzo',4:'abril',5:'mayo',6:'junio',
           7:'julio',8:'agosto',9:'septiembre',10:'octubre',11:'noviembre',12:'diciembre'}

def build_cover(data, config, styles, sections_active):
    d = datetime.date.today()
    today = f'{d.day} de {_MESES[d.month]} de {d.year}'
    lh = data.get('liveHistory', [])
    total = lh[-1]['albumTotal'] if lh else data.get('albumLiveTotal', 0)
    day_num = len(data.get('dailyLog', [])) + 1

    story = []
    story.append(Spacer(1, 5*cm))
    story.append(Paragraph('AMOR FIADO', styles['Cover1']))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph('ZEBALLOS', styles['Cover2']))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(f'Performance Report  ·  {today}  ·  Día {day_num}', styles['Cover3']))
    story.append(Spacer(1, 2.5*cm))

    # KPI row
    kpis = [
        (fmt(total),          'streams totales'),
        (f'D{day_num}',       'desde lanzamiento'),
        (fmt(data.get('albumLiveTotal', total)), 'acumulado S4A'),
    ]
    eng = next(iter(data.get('releaseEngagements', {}).values()), {})
    if eng.get('segments', {}).get('monthly'):
        kpis.append((f"{eng['segments']['monthly']['pct']}%", 'conversión MAL'))

    kpi_data = [[
        [Paragraph(v, styles['KPIValue']), Paragraph(l, styles['KPISub'])]
        for v, l in kpis
    ]]
    col_w = (W - 4*cm) / len(kpis)
    t = Table(kpi_data, colWidths=[col_w]*len(kpis))
    t.setStyle(TableStyle([
        ('ALIGN',      (0,0), (-1,-1), 'CENTER'),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,0), (-1,-1), rgb(*C_CARD)),
        ('ROUNDEDCORNERS', [8]),
        ('BOX',        (0,0), (-1,-1), 0.5, rgb(*C_BORDER)),
        ('INNERGRID',  (0,0), (-1,-1), 0.5, rgb(*C_BORDER)),
        ('TOPPADDING',    (0,0),(-1,-1), 14),
        ('BOTTOMPADDING', (0,0),(-1,-1), 14),
    ]))
    story.append(t)

    story.append(Spacer(1, 1.5*cm))
    active_names = {
        'overview':   'Overview',
        'streams':    'Streams globales',
        'metrics28d': 'Métricas 28d',
        'decay':      'Decay / Proyección',
        'engagement': 'Release Engagement',
        'social':     'Social Impact',
    }
    inc = ' · '.join(v for k, v in active_names.items() if sections_active.get(k))
    story.append(Paragraph(f'<font color="#64748b">Secciones: {inc}</font>', styles['Cover3']))

    # Cover editorial note (if set in report-config.json)
    cover_note = config.get('note', '').strip()
    if cover_note:
        story.append(Spacer(1, 1.2*cm))
        story += callout_note(cover_note, styles)

    story.append(PageBreak())
    return story

# ─── Overview ─────────────────────────────────────────────────────────────────

def build_overview(data, styles):
    story = section_header('Overview', styles)

    lh     = data.get('liveHistory', [])
    totals = data.get('liveTotals', {})
    top    = sorted(totals.items(), key=lambda x: -x[1])[:3]
    day_n  = len(data.get('dailyLog', [])) + 1

    rows = [
        [Paragraph('<b>Métrica</b>', styles['BodyMuted']), Paragraph('<b>Valor</b>', styles['BodyMuted'])],
        ['Streams acumulados',   fmt(data.get('albumLiveTotal', 0))],
        ['Día desde lanzamiento', f'D{day_n}'],
        ['Tracks en el álbum',    '12'],
        ['Track líder',           top[0][0] if top else '—'],
        ['#2', top[1][0] if len(top) > 1 else '—'],
        ['#3', top[2][0] if len(top) > 2 else '—'],
    ]
    t = Table(rows, colWidths=[9*cm, 8*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0),  rgb(*C_CARD)),
        ('TEXTCOLOR',     (0,0), (-1,-1), rgb(*C_TEXT)),
        ('FONTNAME',      (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE',      (0,0), (-1,-1), 9),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [rgb(*C_BG), rgb(*C_CARD)]),
        ('GRID',          (0,0), (-1,-1), 0.4, rgb(*C_BORDER)),
        ('TOPPADDING',    (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
    ]))
    story.append(t)

    # Growth note
    if len(lh) >= 2:
        delta = lh[-1]['albumTotal'] - lh[-2]['albumTotal']
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph(
            f'<font color="#4ade80">+{fmt(delta)}</font> streams desde el último snapshot '
            f'({lh[-2]["label"]} → {lh[-1]["label"]})',
            styles['Body']
        ))
    return story

# ─── Streams globales ─────────────────────────────────────────────────────────

def build_streams(data, styles):
    story = section_header('Streams globales', styles)
    lh = data.get('liveHistory', [])

    # Chart: cumulative total over time
    if lh:
        dates  = [e['date'] for e in lh]
        totals = [e['albumTotal'] for e in lh]
        labels = [e['label'] for e in lh]

        fig, ax = plt.subplots(figsize=(7.2, 3.2), facecolor=tuple(C_CARD))
        ax.set_facecolor(tuple(C_CARD))
        ax.plot(range(len(totals)), totals, color=C_ORANGE, linewidth=2.5, marker='o', markersize=5)
        ax.fill_between(range(len(totals)), totals, alpha=0.15, color=C_ORANGE)
        ax.set_xticks(range(len(labels)))
        ax.set_xticklabels(labels, color=C_MUTED, fontsize=8)
        ax.yaxis.set_tick_params(labelcolor=C_MUTED, labelsize=8)
        for spine in ax.spines.values(): spine.set_edgecolor(tuple(C_BORDER))
        ax.grid(axis='y', color=tuple(C_BORDER), linewidth=0.5, alpha=0.6)
        ax.set_title('Streams acumulados por snapshot', color=C_TEXT, fontsize=9, pad=8)
        for i, (x, y) in enumerate(zip(range(len(totals)), totals)):
            ax.annotate(fmt(y), (x, y), textcoords='offset points', xytext=(0,8),
                        ha='center', fontsize=7, color=C_TEXT)
        buf = mpl_to_image(fig)
        story.append(RLImage(buf, width=15*cm, height=6.5*cm))

    # Per-track table (sorted by total)
    story.append(Spacer(1, 0.3*cm))
    totals_dict = data.get('liveTotals', {})
    sorted_tracks = sorted(totals_dict.items(), key=lambda x: -x[1])
    rows = [[
        Paragraph('<b>Track</b>', styles['BodyMuted']),
        Paragraph('<b>Acumulado</b>', styles['BodyMuted']),
        Paragraph('<b>% del álbum</b>', styles['BodyMuted']),
    ]]
    album_total = data.get('albumLiveTotal', 1)
    for name, val in sorted_tracks:
        pct = f"{val/album_total*100:.1f}%"
        rows.append([name, fmt(val), pct])

    t = Table(rows, colWidths=[10*cm, 4.5*cm, 3.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND',     (0,0), (-1,0),  rgb(*C_CARD)),
        ('TEXTCOLOR',      (0,0), (-1,-1), rgb(*C_TEXT)),
        ('FONTNAME',       (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE',       (0,0), (-1,-1), 8.5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [rgb(*C_BG), rgb(*C_CARD)]),
        ('GRID',           (0,0), (-1,-1), 0.4, rgb(*C_BORDER)),
        ('TOPPADDING',     (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',  (0,0), (-1,-1), 5),
        ('LEFTPADDING',    (0,0), (-1,-1), 8),
        ('ALIGN',          (1,0), (-1,-1), 'RIGHT'),
    ]))
    story.append(t)
    return story

# ─── Métricas 28d ─────────────────────────────────────────────────────────────

def build_metrics28d(data, styles):
    story = section_header('Métricas 28 días por track', styles)
    tm    = data.get('trackMetrics', {})
    meta  = data.get('trackMetricsMeta', {})

    period = meta.get('periodLabel', '—')
    story.append(Paragraph(f'Período: {period}  ·  Fuente: Spotify for Artists', styles['BodyMuted']))
    story.append(Spacer(1, 0.3*cm))

    if not tm:
        story.append(Paragraph('Sin datos disponibles.', styles['BodyMuted']))
        return story

    sorted_tracks = sorted(tm.items(), key=lambda x: -x[1].get('streams28d', 0))
    rows = [[
        Paragraph('<b>Track</b>',          styles['BodyMuted']),
        Paragraph('<b>Streams 28d</b>',    styles['BodyMuted']),
        Paragraph('<b>Oyentes</b>',        styles['BodyMuted']),
        Paragraph('<b>Str/Oyente</b>',     styles['BodyMuted']),
        Paragraph('<b>Saves</b>',          styles['BodyMuted']),
        Paragraph('<b>PL Adds</b>',        styles['BodyMuted']),
    ]]
    for name, m in sorted_tracks:
        rows.append([
            name[:28],
            fmt(m.get('streams28d')),
            fmt(m.get('listeners')),
            f"{m.get('streamsPerListener', 0):.2f}" if m.get('streamsPerListener') else '—',
            fmt(m.get('saves')),
            fmt(m.get('playlistAdds')),
        ])

    col_widths = [7.5*cm, 2.7*cm, 2.7*cm, 2.5*cm, 2.0*cm, 2.0*cm]
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND',     (0,0), (-1,0),  rgb(*C_CARD)),
        ('TEXTCOLOR',      (0,0), (-1,-1), rgb(*C_TEXT)),
        ('FONTNAME',       (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE',       (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [rgb(*C_BG), rgb(*C_CARD)]),
        ('GRID',           (0,0), (-1,-1), 0.4, rgb(*C_BORDER)),
        ('TOPPADDING',     (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',  (0,0), (-1,-1), 5),
        ('LEFTPADDING',    (0,0), (-1,-1), 6),
        ('ALIGN',          (1,0), (-1,-1), 'RIGHT'),
    ]))
    story.append(t)

    # Total row highlights
    total_s = sum(m.get('streams28d', 0) for m in tm.values())
    total_sv= sum(m.get('saves', 0) for m in tm.values())
    save_rt  = total_sv / total_s * 100 if total_s else 0
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        f'Total streams 28d: <font color="#f97316"><b>{fmt(total_s)}</b></font>  ·  '
        f'Save rate global: <font color="#4ade80"><b>{save_rt:.2f}%</b></font>',
        styles['Body']
    ))
    return story

# ─── Reference curve (avg CEA + ATBLM pre-album decay, D1-D28) ────────────────
# Computed from streamData in App.jsx; hardcoded here since source is static.
_REF_CURVE = [
    1.0000, 0.5437, 0.3861, 0.4584, 0.4523, 0.4535, 0.4372, 0.4562,
    0.3843, 0.2908, 0.3776, 0.4242, 0.3848, 0.3728, 0.3923, 0.3423,
    0.2973, 0.3703, 0.3419, 0.3613, 0.3049, 0.3428, 0.2534, 0.1802,
    0.2580, 0.2999, 0.2861, 0.2463,
]
_TOTAL_DAYS = 28

# ─── Decay / Proyección ───────────────────────────────────────────────────────

def build_decay(data, styles):
    story = section_header('Decay / Proyección D28', styles)
    dl    = data.get('dailyLog', [])

    if len(dl) < 2:
        story.append(Paragraph('Se necesitan al menos 2 días de datos para mostrar decay.', styles['BodyMuted']))
        return story

    d20_idx = next((i for i, e in enumerate(dl) if e['date'] == '2026-03-20'), None)
    if d20_idx is None:
        story.append(Paragraph('No se encontró el día de lanzamiento (D20) en dailyLog.', styles['BodyMuted']))
        return story

    real_days   = len(dl) - d20_idx
    track_names = list(dl[d20_idx]['tracks'].keys())
    palette     = [
        C_GREEN, C_BLUE, C_PURPLE, C_AMBER,
        (0.98, 0.47, 0.56), (0.40, 0.91, 0.95), (0.87, 0.29, 0.93),
        (0.99, 0.73, 0.45), (0.53, 0.94, 0.53), (0.58, 0.64, 0.73),
        (1.0, 0.5, 0.5), (0.5, 0.8, 1.0),
    ]
    colors_map = {n: c for n, c in zip(track_names, palette)}

    # Per-track factor (calibrated from real days)
    def compute_factor(name, d20_val):
        samples = []
        for day in range(1, real_days):
            actual   = dl[d20_idx + day]['tracks'].get(name, 0) if d20_idx + day < len(dl) else 0
            expected = d20_val * _REF_CURVE[day] if day < len(_REF_CURVE) else 0
            if expected > 0 and actual > 0:
                samples.append(actual / expected)
        return sum(samples) / len(samples) if samples else 1.0

    # Normalized decay chart (% of D1) — real solid, projected dashed
    fig, ax = plt.subplots(figsize=(7.2, 3.8), facecolor=tuple(C_CARD))
    ax.set_facecolor(tuple(C_CARD))

    for name in track_names:
        d20_val = dl[d20_idx]['tracks'].get(name, 0)
        if d20_val == 0: continue
        c      = colors_map.get(name, C_MUTED)
        label  = name[:18] + ('…' if len(name) > 18 else '')
        factor = compute_factor(name, d20_val)

        # Real portion
        real_vals = [dl[d20_idx + i]['tracks'].get(name, 0) / d20_val * 100
                     for i in range(real_days) if d20_idx + i < len(dl)]
        real_xs   = list(range(1, len(real_vals) + 1))
        ax.plot(real_xs, real_vals, marker='o', markersize=3.5, linewidth=1.8,
                color=c, label=label)

        # Projected portion (dashed)
        proj_xs   = list(range(real_days, _TOTAL_DAYS + 1))
        proj_vals = []
        # bridge: last real point
        proj_vals.append(real_vals[-1] if real_vals else 100)
        for i in range(real_days, _TOTAL_DAYS):
            ref = _REF_CURVE[i] if i < len(_REF_CURVE) else _REF_CURVE[-1] * (0.97 ** (i - len(_REF_CURVE) + 1))
            proj_vals.append(d20_val * ref * factor / d20_val * 100)
        ax.plot(proj_xs, proj_vals, linestyle='--', linewidth=1.2,
                color=c, alpha=0.55)

    # Real/projected separator
    ax.axvline(real_days, color=tuple(C_MUTED), linewidth=0.8, linestyle=':', alpha=0.6)
    ax.text(real_days + 0.3, ax.get_ylim()[1] * 0.95 if ax.get_ylim()[1] > 0 else 95,
            'proyectado →', color=C_MUTED, fontsize=6.5, va='top')

    ax.axhline(100, color=tuple(C_MUTED), linewidth=0.7, linestyle='--', alpha=0.4)
    ax.set_xlabel('Día desde lanzamiento', color=C_MUTED, fontsize=8)
    ax.set_ylabel('% vs D1', color=C_MUTED, fontsize=8)
    ax.set_xticks(range(1, _TOTAL_DAYS + 1, 3))  # every 3 days: 1,4,7,10…28
    ax.xaxis.set_tick_params(labelcolor=C_MUTED, labelsize=7)
    ax.yaxis.set_tick_params(labelcolor=C_MUTED, labelsize=7)
    for spine in ax.spines.values(): spine.set_edgecolor(tuple(C_BORDER))
    ax.grid(color=tuple(C_BORDER), linewidth=0.4, alpha=0.5)
    ax.set_title('Retención de streams (% del Día 1) — real + proyección D28',
                 color=C_TEXT, fontsize=9, pad=8)
    ax.legend(fontsize=6, ncol=3, facecolor=tuple(C_CARD), labelcolor=C_TEXT,
              framealpha=0.8, edgecolor=tuple(C_BORDER))
    buf = mpl_to_image(fig)
    story.append(RLImage(buf, width=15*cm, height=8*cm))

    # Day-over-day decay table
    story.append(Spacer(1, 0.3*cm))
    header = [Paragraph('<b>Track</b>', styles['BodyMuted'])]
    for i in range(real_days):
        header.append(Paragraph(f'<b>D{i+1}</b>', styles['BodyMuted']))
    rows = [header]
    for name in sorted(track_names, key=lambda n: -(dl[d20_idx]['tracks'].get(n, 0))):
        row = [name[:22]]
        for i in range(real_days):
            v = dl[d20_idx + i]['tracks'].get(name, 0) if d20_idx + i < len(dl) else None
            row.append(fmt(v) if v else '—')
        rows.append(row)

    n_cols = real_days + 1
    col_w  = [8.5*cm] + [((W - 4*cm - 8.5*cm) / real_days)] * real_days
    t = Table(rows, colWidths=col_w)
    t.setStyle(TableStyle([
        ('BACKGROUND',     (0,0), (-1,0),  rgb(*C_CARD)),
        ('TEXTCOLOR',      (0,0), (-1,-1), rgb(*C_TEXT)),
        ('FONTNAME',       (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE',       (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [rgb(*C_BG), rgb(*C_CARD)]),
        ('GRID',           (0,0), (-1,-1), 0.4, rgb(*C_BORDER)),
        ('TOPPADDING',     (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',  (0,0), (-1,-1), 5),
        ('LEFTPADDING',    (0,0), (-1,-1), 6),
        ('ALIGN',          (1,0), (-1,-1), 'RIGHT'),
    ]))
    story.append(t)
    return story

# ─── Release Engagement ───────────────────────────────────────────────────────

def build_engagement(data, styles):
    story = section_header('Release Engagement', styles)
    engagements = data.get('releaseEngagements', {})
    if not engagements:
        story.append(Paragraph('Sin datos de engagement disponibles.', styles['BodyMuted']))
        return story

    seg_colors = {
        'monthly':  C_GREEN,
        'super':    C_AMBER,
        'moderate': C_PURPLE,
        'light':    C_BLUE,
    }
    seg_labels = {
        'monthly':  'Monthly Active',
        'super':    'Super Listeners',
        'moderate': 'Moderate',
        'light':    'Light',
    }

    for rel_id, eng in engagements.items():
        if eng.get('noLongerUpdating'):
            status_tag = '  <font color="#f97316">(sin actualizaciones)</font>'
        else:
            status_tag = ''
        story.append(Paragraph(
            f'<b>{eng.get("name","—")}</b>  ·  {eng.get("type","").capitalize()}'
            f'  ·  Día {eng.get("dayNum","—")} desde lanzamiento{status_tag}',
            styles['Body']
        ))
        segs = eng.get('segments', {})

        # Segment KPI row
        kpi_items = [(k, segs.get(k, {})) for k in ['monthly', 'super', 'moderate', 'light']]
        kpi_rows = [[
            [Paragraph(f'<font color="#{hex(int(c[0]*255))[2:].zfill(2)}{hex(int(c[1]*255))[2:].zfill(2)}{hex(int(c[2]*255))[2:].zfill(2)}"><b>{v.get("pct","—")}%</b></font>',
                       styles['KPIValue']),
             Paragraph(seg_labels[k], styles['KPISub']),
             Paragraph(f'{fmt(v.get("listeners"))} de {fmt(v.get("total"))}', styles['KPISub'])]
            for k, v in kpi_items
            for c in [seg_colors[k]]
        ]]
        col_w = (W - 4*cm) / 4
        t = Table(kpi_rows, colWidths=[col_w]*4)
        t.setStyle(TableStyle([
            ('ALIGN',         (0,0),(-1,-1), 'CENTER'),
            ('VALIGN',        (0,0),(-1,-1), 'MIDDLE'),
            ('BACKGROUND',    (0,0),(-1,-1), rgb(*C_CARD)),
            ('BOX',           (0,0),(-1,-1), 0.5, rgb(*C_BORDER)),
            ('INNERGRID',     (0,0),(-1,-1), 0.5, rgb(*C_BORDER)),
            ('TOPPADDING',    (0,0),(-1,-1), 8),
            ('BOTTOMPADDING', (0,0),(-1,-1), 8),
        ]))
        story.append(t)

        # Composition bar
        super_l    = segs.get('super',    {}).get('listeners', 0)
        moderate_l = segs.get('moderate', {}).get('listeners', 0)
        light_l    = segs.get('light',    {}).get('listeners', 0)
        total_seg  = super_l + moderate_l + light_l
        if total_seg > 0:
            bar_data = [
                (super_l    / total_seg, C_AMBER,  'Super'),
                (moderate_l / total_seg, C_PURPLE, 'Moderate'),
                (light_l    / total_seg, C_BLUE,   'Light'),
            ]
            fig, ax = plt.subplots(figsize=(7.2, 0.6), facecolor=tuple(C_CARD))
            ax.set_facecolor(tuple(C_CARD))
            left = 0
            for pct, c, lbl in bar_data:
                ax.barh(0, pct, left=left, color=c, height=0.6)
                if pct > 0.08:
                    ax.text(left + pct/2, 0, f'{lbl}\n{pct*100:.0f}%',
                            ha='center', va='center', fontsize=7, color='white', fontweight='bold')
                left += pct
            ax.set_xlim(0, 1); ax.axis('off')
            buf = mpl_to_image(fig)
            story.append(RLImage(buf, width=15*cm, height=1.2*cm))

        story.append(Spacer(1, 0.5*cm))

    return story

# ─── Social Impact ─────────────────────────────────────────────────────────────

def build_social(data, styles):
    story = section_header('Social Impact', styles)

    # Social data is hardcoded in App.jsx, not in data.json yet.
    # Show a placeholder with the methodology note.
    story.append(Paragraph(
        'Los datos de Social Impact (Instagram @zeballos17 + TikTok @zeballos1717) se '
        'encuentran en App.jsx. Una vez migrados a data.json, este módulo los incluirá '
        'automáticamente.',
        styles['BodyMuted']
    ))
    story.append(Spacer(1, 0.3*cm))

    # If social data gets added to data.json in the future, it will appear here.
    social = data.get('socialPosts', [])
    if social:
        rows = [[
            Paragraph('<b>Fecha</b>',     styles['BodyMuted']),
            Paragraph('<b>Plataforma</b>', styles['BodyMuted']),
            Paragraph('<b>Track</b>',     styles['BodyMuted']),
            Paragraph('<b>Views</b>',     styles['BodyMuted']),
            Paragraph('<b>Likes</b>',     styles['BodyMuted']),
            Paragraph('<b>Δ Streams</b>', styles['BodyMuted']),
        ]]
        for p in sorted(social, key=lambda x: x.get('date',''))[-15:]:
            rows.append([
                p.get('date','')[-5:],
                p.get('platform','')[:2].upper(),
                p.get('track','')[:22],
                fmt(p.get('views')),
                fmt(p.get('likes')),
                f"+{fmt(p.get('streamDelta'))}" if p.get('streamDelta', 0) > 0 else (fmt(p.get('streamDelta')) if p.get('streamDelta') else '—'),
            ])
        t = Table(rows, colWidths=[2*cm, 2.5*cm, 6*cm, 2*cm, 2*cm, 3*cm])
        t.setStyle(TableStyle([
            ('BACKGROUND',     (0,0),(-1,0),  rgb(*C_CARD)),
            ('TEXTCOLOR',      (0,0),(-1,-1), rgb(*C_TEXT)),
            ('FONTNAME',       (0,0),(-1,-1), 'Helvetica'),
            ('FONTSIZE',       (0,0),(-1,-1), 7.5),
            ('ROWBACKGROUNDS', (0,1),(-1,-1), [rgb(*C_BG), rgb(*C_CARD)]),
            ('GRID',           (0,0),(-1,-1), 0.4, rgb(*C_BORDER)),
            ('TOPPADDING',     (0,0),(-1,-1), 4),
            ('BOTTOMPADDING',  (0,0),(-1,-1), 4),
            ('LEFTPADDING',    (0,0),(-1,-1), 6),
            ('ALIGN',          (3,0),(-1,-1), 'RIGHT'),
        ]))
        story.append(t)
    return story

# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description='Generate Amor Fiado performance report')
    parser.add_argument('--sections', help='Comma-separated sections to include, e.g. overview,streams,engagement')
    parser.add_argument('--out',      help='Output PDF path (default: reports/YYYY-MM-DD_report.pdf)')
    args = parser.parse_args()

    # Load data
    with open(DATA) as f: data = json.load(f)
    with open(CONFIG) as f: cfg = json.load(f)

    sections = cfg.get('sections', {})
    if args.sections:
        keys = [s.strip() for s in args.sections.split(',')]
        sections = {k: k in keys for k in sections}

    # Output path
    OUT.mkdir(exist_ok=True)
    today_str = datetime.date.today().strftime('%Y-%m-%d')
    out_path  = args.out or str(OUT / f'{today_str}_amor-fiado-report.pdf')

    styles = build_styles()

    # Build story
    story = []
    story += build_cover(data, cfg, styles, sections)

    builders = {
        'overview':   build_overview,
        'streams':    build_streams,
        'metrics28d': build_metrics28d,
        'decay':      build_decay,
        'engagement': build_engagement,
        'social':     build_social,
    }
    section_notes = cfg.get('sectionNotes', {})
    first = True
    for key, builder in builders.items():
        if not sections.get(key): continue
        if not first: story.append(Spacer(1, 0.4*cm))
        sec_story = builder(data, styles)
        note = section_notes.get(key, '').strip()
        if note:
            # Insert note right after the 3-element section header (Spacer + Paragraph + HRFlowable)
            note_elems = callout_note(note, styles)
            sec_story = sec_story[:3] + note_elems + sec_story[3:]
        story += sec_story
        first = False

    # Build PDF
    doc = SimpleDocTemplate(
        out_path,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm,  bottomMargin=2.2*cm,
        title=cfg.get('title', 'Amor Fiado Report'),
        author=cfg.get('artist', 'ZEBALLOS'),
    )

    # Cover uses special callback, rest use on_page
    def page_template(canvas, doc):
        if doc.page == 1: on_cover_page(canvas, doc)
        else:             on_page(canvas, doc)

    doc.build(story, onFirstPage=page_template, onLaterPages=page_template)
    print(f'✅  Report saved → {out_path}')
    return out_path

if __name__ == '__main__':
    main()
