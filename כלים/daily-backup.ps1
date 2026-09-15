# Daily off-machine backup - pushes what is already committed to GitHub.
#
# Deliberately does NOT commit anything. Automatic commits would turn a
# readable history into thousands of meaningless entries, and the value of
# this history is the "why", not the snapshots. Committing stays deliberate;
# only the copying out is automated.
#
# Paths are DERIVED, never written down. $PSScriptRoot is the folder this
# script sits in, so the whole thing keeps working if the folder is renamed,
# moved, or cloned onto another machine - and it avoids non-ASCII path
# literals, which Windows PowerShell mis-reads and which broke the first
# version of this script.
#
# Writes one line per run to backup.log beside this file, so a silent
# failure is visible.

$ErrorActionPreference = 'Continue'
$Here    = $PSScriptRoot
$Repo    = Split-Path $Here -Parent
$LogFile = Join-Path $Here 'backup.log'
$Stamp   = Get-Date -Format 'yyyy-MM-dd HH:mm'

function Write-Log($msg) {
    Add-Content -LiteralPath $LogFile -Value "$Stamp  $msg" -Encoding utf8
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

if ($ahead -eq '0') {
    # Only say "up to date" when it is the whole truth. If files are sitting
    # uncommitted, the warning above already said so, and an "ok" line under
    # it would contradict it - which is how people learn to stop reading logs.
    if (-not $dirty) { Write-Log 'ok       already up to date' }
    exit 0
}

# Check git's exit code, NOT $?. git writes its progress to stderr even on a
# clean push, and Windows PowerShell turns any stderr from a native command
# into an error record - so $? reports failure on a push that worked. That
# produced a log line reading "ERROR push failed" directly above git's own
# success message. A false alarm is worse than a silent one: it teaches you
# to ignore the log, and then the real failure goes past unread.
$out = & git -C $Repo push 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Log "ok       pushed $ahead commit(s)"
    exit 0
} else {
    Write-Log "ERROR    push failed (exit $LASTEXITCODE): $($out -join ' ')"
    exit 1
}