# Daily off-machine backup — pushes what is already committed to GitHub.
#
# Deliberately does NOT commit anything. Automatic commits would turn a
# readable history into thousands of meaningless entries, and the value of
# this history is the "why", not the snapshots. Committing stays deliberate;
# only the copying out is automated.
#
# Register it once (run as the normal user, no admin needed):
#   see כלים/README-גיבוי.md
#
# Writes a line per run to כלים/backup.log so a silent failure is visible.

$ErrorActionPreference = 'Continue'
$Repo    = 'C:\Users\user\claude'
$LogFile = Join-Path $Repo 'כלים\backup.log'
$Stamp   = Get-Date -Format 'yyyy-MM-dd HH:mm'

function Write-Log($msg) {
    Add-Content -Path $LogFile -Value "$Stamp  $msg" -Encoding utf8
}

# Anything uncommitted cannot be backed up. Say so rather than reporting
# success while work sits in a single copy.
$dirty = & git -C $Repo status --porcelain
if ($dirty) {
    $n = ($dirty | Measure-Object -Line).Lines
    Write-Log "WARNING  $n file(s) not committed - these are NOT backed up"
}

$ahead = & git -C $Repo rev-list --count '@{u}..HEAD' 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Log 'ERROR    no upstream configured - nothing was pushed'
    exit 1
}

if ($ahead -eq '0' -and -not $dirty) {
    Write-Log 'ok       already up to date'
    exit 0
}

$out = & git -C $Repo push 2>&1
if ($?) {
    Write-Log "ok       pushed $ahead commit(s)"
    exit 0
} else {
    Write-Log "ERROR    push failed: $($out -join ' ')"
    exit 1
}
