$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = "v:\aura tunes" # Root directory
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Exclude node_modules, .git and dist
$excludeFolders = @(".git", "node_modules", "dist")

$action = {
    $path = $Event.SourceEventArgs.FullPath
    $name = $Event.SourceEventArgs.Name
    $changeType = $Event.SourceEventArgs.ChangeType
    
    # Skip excluded folders
    foreach ($ef in $excludeFolders) {
        if ($path -like "*\$ef\*") { return }
    }

    Write-Host "`nChange detected: $name ($changeType)" -ForegroundColor Cyan
    
    # Debounce: Wait for 5 seconds of inactivity before committing
    Start-Sleep -Seconds 5
    
    try {
        Write-Host "Syncing to Git..." -ForegroundColor Yellow
        git add .
        $msg = "Auto-update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        git commit -m $msg
        git push
        Write-Host "Success: Sync complete." -ForegroundColor Green
    } catch {
        Write-Host "Error: Git sync failed." -ForegroundColor Red
    }
}

Register-ObjectEvent $watcher "Changed" -Action $action
Register-ObjectEvent $watcher "Created" -Action $action
Register-ObjectEvent $watcher "Deleted" -Action $action
Register-ObjectEvent $watcher "Renamed" -Action $action

Write-Host "--- Auto-Git Sync Active ---" -ForegroundColor Green
Write-Host "Watching: v:\aura tunes"
Write-Host "Press Ctrl+C and close terminal to stop."
while ($true) { Start-Sleep -Seconds 1 }
