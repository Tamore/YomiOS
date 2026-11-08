$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$url = 'http://127.0.0.1:5173'
$mutex = New-Object Threading.Mutex($false, 'Local\YomiDesktopLauncher')
function Find-YomiWindow {
    foreach ($browser in Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'") {
        if ($browser.CommandLine -notmatch '\\YomiOS\\(Chrome|Edge)Profile' -or $browser.CommandLine -match '--type=') { continue }
        $process = Get-Process -Id $browser.ProcessId -ErrorAction SilentlyContinue
        if ($process.MainWindowHandle -and $process.MainWindowTitle -like 'Yomi*') { return $process }
    }
}
function Ready($address) {
    try { return (Invoke-WebRequest -UseBasicParsing $address -TimeoutSec 1).StatusCode -eq 200 } catch { return $false }
}
function Ensure-Service($address, $program, $arguments, $directory) {
    if (Ready $address) { return }
    $service = Start-Process $program -ArgumentList $arguments -WorkingDirectory $directory -WindowStyle Hidden -PassThru
    for ($attempt = 0; $attempt -lt 50; $attempt++) {
        if (Ready $address) { return }
        if ($service.HasExited) { break }
        Start-Sleep -Milliseconds 250
    }
    throw "Yomi service did not start at $address"
}
try {
    try { $locked = $mutex.WaitOne(60000) } catch [Threading.AbandonedMutexException] { $locked = $true }
    if (!$locked) { throw 'Another Yomi launch is still starting.' }
    Ensure-Service 'http://127.0.0.1:8765/health' 'python' '-m uvicorn backend.main:app --host 127.0.0.1 --port 8765' $root
    Ensure-Service $url 'npm.cmd' 'run dev -- --host 127.0.0.1 --port 5173 --strictPort' "$root\frontend"
    $window = Find-YomiWindow
    if (!$window) {
        $paths = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe")
        $exe = $paths | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        if (!$exe) { throw 'Chrome or Edge is required to open Yomi.' }
        $profile = if ($exe -like '*msedge.exe') { 'EdgeProfile' } else { 'ChromeProfile' }
        Start-Process $exe -ArgumentList "--app=$url --window-size=1600,1000 --user-data-dir=`"$env:LOCALAPPDATA\YomiOS\$profile`""
        for ($attempt = 0; $attempt -lt 30 -and !$window; $attempt++) {
            Start-Sleep -Milliseconds 250
            $window = Find-YomiWindow
        }
        if (!$window) { throw 'Yomi opened but its window could not be identified.' }
    }
    Add-Type -Namespace Yomi -Name Window -MemberDefinition @"
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool IsIconic(System.IntPtr hwnd);
[System.Runtime.InteropServices.DllImport("user32.dll")] public static extern bool ShowWindowAsync(System.IntPtr hwnd, int command);
"@
    if ([Yomi.Window]::IsIconic($window.MainWindowHandle)) { [void][Yomi.Window]::ShowWindowAsync($window.MainWindowHandle, 9) }
    (New-Object -ComObject WScript.Shell).AppActivate($window.Id)
} finally {
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
