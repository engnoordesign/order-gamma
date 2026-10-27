Add-Type -AssemblyName System.Drawing
$out = $args[0]
New-Item -ItemType Directory -Force $out | Out-Null

function New-Ico($path, $bgHex, $glyph, $fontName, $fontSize) {
  $size = 256
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.TextRenderingHint = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::Transparent)
  $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $r = 56; $d = $r * 2
  $gp.AddArc(8, 8, $d, $d, 180, 90); $gp.AddArc($size - 8 - $d, 8, $d, $d, 270, 90)
  $gp.AddArc($size - 8 - $d, $size - 8 - $d, $d, $d, 0, 90); $gp.AddArc(8, $size - 8 - $d, $d, $d, 90, 90)
  $gp.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($bgHex))), $gp)
  $font = New-Object System.Drawing.Font($fontName, $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sf = New-Object System.Drawing.StringFormat; $sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
  $g.DrawString($glyph, $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 6, $size, $size), $sf)
  $g.Dispose()
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $png = $ms.ToArray()
  $fs = [System.IO.File]::Create($path)
  $bw = New-Object System.IO.BinaryWriter $fs
  $bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]1)         # ICONDIR
  $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([byte]0); $bw.Write([byte]0)
  $bw.Write([uint16]1); $bw.Write([uint16]32); $bw.Write([uint32]$png.Length); $bw.Write([uint32]22)
  $bw.Write($png); $bw.Close(); $fs.Close(); $bmp.Dispose()
}

New-Ico (Join-Path $out "order-gamma.ico") "#4f46e5" ([string][char]0x0393) "Segoe UI" 190
New-Ico (Join-Path $out "setup.ico")       "#475569" ([string][char]0x2699) "Segoe UI Symbol" 170
Get-ChildItem $out | Select-Object Name, Length
