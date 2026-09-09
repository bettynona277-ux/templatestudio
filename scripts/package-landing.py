"""Build a static landing upload bundle, preserving relative asset paths."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
public = root / 'public'
files = [public / name for name in (
    'mi-landing.html', 'tienda.html', 'css/landing-editor.css',
    'css/landing-public.css', 'css/landing-formats.css')]
for directory in ('js/landing', 'icons/landing', 'logos'):
    files.extend(p for p in (public / directory).rglob('*') if p.is_file())
for file in files:
    if not file.is_file():
        raise SystemExit(f'Missing required file: {file}')

instructions = '''PAQUETE DE LANDING — ARCHIVOS ESTÁTICOS

Extrae el contenido de este ZIP directamente dentro de /dev/ en el hosting.
No subas solo los HTML. Conserva las carpetas css, js, icons y logos.
No debe quedar una carpeta adicional entre /dev/ y mi-landing.html.

Estructura resultante:
/dev/mi-landing.html
/dev/tienda.html
/dev/css/landing-editor.css
/dev/css/landing-public.css
/dev/css/landing-formats.css
/dev/js/landing/*.js
/dev/icons/landing/*
/dev/logos/*

Prueba visual sin backend:
https://disenosstreaming.com/dev/mi-landing.html?demo=1

Comprueba que /dev/css/landing-editor.css devuelve CSS, no una página HTML.
Comprueba que /dev/js/landing/core.js devuelve JavaScript, no una página HTML.
Después recarga con Ctrl+F5.

Este paquete soluciona los archivos faltantes del diseño y permite probar la demo.
La autenticación, guardar y publicar con usuarios reales requieren desplegar y
configurar el backend descrito en docs/landing-deployment.md del proyecto.
La configuración incluida usa /api/landing. Si ya configuraste otra URL en
js/landing/config.js del servidor, conserva esa configuración al actualizar.
Los enlaces relativos al gestor/login requieren que esas páginas estén también
en /dev/, o ajustarlos al alojamiento donde se encuentren.

Este ZIP no incluye credenciales, funciones del servidor, reglas ni cambios
globales de hosting. No habilites acceso público a colecciones privadas.
'''
output = root / 'artifacts' / 'landing-dev.zip'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for file in sorted(files):
        archive.write(file, file.relative_to(public).as_posix())
    archive.writestr('LEEME-LANDING.txt', instructions.encode('utf-8'))
with ZipFile(output) as archive:
    assert archive.testzip() is None
    print(f'{output}\n{len(archive.namelist())} files; {output.stat().st_size:,} bytes')
