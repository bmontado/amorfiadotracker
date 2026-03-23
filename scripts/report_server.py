#!/usr/bin/env python3
"""
report_server.py — Local HTTP server for the Amor Fiado report generator.
Receives config from the dashboard UI, writes report-config.json,
runs generate_report.py, and returns the PDF as a download.

Usage:
  python3 scripts/report_server.py          # default port 8888
  python3 scripts/report_server.py --port 9000
"""

import argparse
import json
import os
import subprocess
import sys
import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

BASE   = Path(__file__).parent.parent
CONFIG = BASE / 'report-config.json'
SCRIPT = BASE / 'scripts' / 'generate_report.py'
OUTDIR = BASE / 'reports'

class ReportHandler(BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {fmt % args}")

    def send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors()
        self.end_headers()

    def do_POST(self):
        if self.path != '/generate':
            self.send_response(404)
            self.end_headers()
            return

        # Read request body
        length = int(self.headers.get('Content-Length', 0))
        body   = self.rfile.read(length)
        try:
            payload = json.loads(body)
        except json.JSONDecodeError as e:
            self._error(400, f'JSON inválido: {e}')
            return

        # Merge payload into existing config
        try:
            existing = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
        except Exception:
            existing = {}

        existing['sections']     = payload.get('sections',     existing.get('sections', {}))
        existing['note']         = payload.get('note',         '')
        existing['sectionNotes'] = payload.get('sectionNotes', {})

        CONFIG.write_text(json.dumps(existing, indent=2, ensure_ascii=False))
        print(f"  Config escrito → {CONFIG}")

        # Run generator
        today    = datetime.date.today().strftime('%Y-%m-%d')
        out_path = OUTDIR / f'{today}_amor-fiado-report.pdf'
        OUTDIR.mkdir(exist_ok=True)

        result = subprocess.run(
            [sys.executable, str(SCRIPT), '--out', str(out_path)],
            cwd=str(BASE),
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            err = result.stderr or result.stdout or 'Error desconocido'
            print(f"  ❌ Script falló:\n{err}")
            self._error(500, err)
            return

        print(f"  ✅ PDF generado → {out_path}")

        # Return PDF
        pdf_bytes = out_path.read_bytes()
        filename  = out_path.name
        self.send_response(200)
        self.send_cors()
        self.send_header('Content-Type',        'application/pdf')
        self.send_header('Content-Length',      str(len(pdf_bytes)))
        self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
        self.end_headers()
        self.wfile.write(pdf_bytes)

    def _error(self, code, message):
        msg = message.encode()
        self.send_response(code)
        self.send_cors()
        self.send_header('Content-Type',   'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(msg)))
        self.end_headers()
        self.wfile.write(msg)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8888)
    args = parser.parse_args()

    # Install deps if needed
    try:
        import reportlab  # noqa
        import matplotlib  # noqa
    except ImportError:
        print('Instalando dependencias...')
        subprocess.run([sys.executable, '-m', 'pip', 'install',
                        'reportlab', 'matplotlib', '--break-system-packages', '-q'])

    server = HTTPServer(('localhost', args.port), ReportHandler)
    print(f'🟢  Report server en http://localhost:{args.port}')
    print(f'    Repo: {BASE}')
    print('    Ctrl+C para detener\n')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n🔴  Servidor detenido.')


if __name__ == '__main__':
    main()
