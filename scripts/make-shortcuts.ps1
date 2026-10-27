# Creates the "Order Gamma" and "Order Gamma - Setup" icons on the Desktop and inside this folder.
# Safe to run again: it moves the icons to wherever this folder is now.
$root = Split-Path -Parent $PSScriptRoot
$shell = New-Object -ComObject WScript.Shell
$targets = @(
  @{ Name = "Order Gamma";         Bat = "Start-Order-Gamma.bat"; Icon = "order-gamma.ico"; Tip = "Start Order Gamma" },
  @{ Name = "Order Gamma - Setup"; Bat = "Setup.bat";             Icon = "setup.ico";       Tip = "Install and check everything Order Gamma needs" }
)
$folders = @([Environment]::GetFolderPath("Desktop"), $root) | Where-Object { $_ -and (Test-Path $_) }
foreach ($folder in $folders) {
  foreach ($t in $targets) {
    $lnk = $shell.CreateShortcut((Join-Path $folder ($t.Name + ".lnk")))
    $lnk.TargetPath = Join-Path $root $t.Bat
    $lnk.WorkingDirectory = $root
    $lnk.IconLocation = (Join-Path $root ("assets\" + $t.Icon)) + ",0"
    $lnk.Description = $t.Tip
    $lnk.Save()
    Write-Host ("  icon created: " + (Join-Path $folder ($t.Name + ".lnk")))
  }
}
