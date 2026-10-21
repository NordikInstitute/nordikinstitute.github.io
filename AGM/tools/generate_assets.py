#!/usr/bin/env python3
"""Generate real-poster thumbnails & high-resolution previews; retain originals intact."""
import json, shutil, re
from pathlib import Path
import fitz
from PIL import Image
from io import BytesIO

ROOT=Path(__file__).resolve().parents[1]
UPLOAD=ROOT.parent
OUT=ROOT/'site'/'assets'
(OUT/'posters').mkdir(parents=True,exist_ok=True)
(OUT/'previews').mkdir(parents=True,exist_ok=True)
(OUT/'thumbs').mkdir(parents=True,exist_ok=True)
rows=json.loads((ROOT/'content'/'projects.json').read_text())
for i,p in enumerate(rows,1):
    original=UPLOAD/p['pdfSource']
    assert original.is_file(), original
    shutil.copy2(original,OUT/'posters'/f"{p['slug']}.pdf")
    d=fitz.open(original)
    page=d[0]
    width=float(page.rect.width)
    matrix=fitz.Matrix(min(1.7,2100/width),min(1.7,2100/width))
    pix=page.get_pixmap(matrix=matrix,alpha=False,colorspace=fitz.csRGB)
    im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
    if im.width>2100:
        im.thumbnail((2100,3000),Image.Resampling.LANCZOS)
    im.save(OUT/'previews'/f"{p['slug']}.webp",'WEBP',quality=82,method=5)
    thumb=im.copy();thumb.thumbnail((640,900),Image.Resampling.LANCZOS)
    thumb.save(OUT/'thumbs'/f"{p['slug']}.webp",'WEBP',quality=77,method=5)
    print(i,p['slug'], f'{im.width}x{im.height}', f"{(OUT/'previews'/f'{p['slug']}.webp').stat().st_size/1024:.0f}kb")
    d.close()
# The executive summary preview comes from page 11 of the published annual report.
src=OUT/'reports'/'annual-report-2025-2026.pdf'
d=fitz.open(src)
pix=d[10].get_pixmap(matrix=fitz.Matrix(1.6,1.6),alpha=False,colorspace=fitz.csRGB)
im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples);im.save(OUT/'previews'/'annual-summary.webp','WEBP',quality=82)
print('done')
