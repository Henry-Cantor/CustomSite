# -*- mode: python ; coding: utf-8 -*-

import platform

system = platform.system().lower()
if system == "windows":
    distpath = "backend/dist/testWin"
elif system == "linux":
    distpath = "backend/dist/testLinux"
else:  # macOS
    distpath = "backend/dist/test"

a = Analysis(
    ['test.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='test',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    runtime_tmpdir=None,  
    codesign_identity="Developer ID Application: Monica Cantor (JV8S34SZNT)",
    entitlements_file="entitlements.mac.plist",
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='test',
    distpath=distpath,
)
