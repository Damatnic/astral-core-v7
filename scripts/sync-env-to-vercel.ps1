# Vercel Environment Variables Sync Script for Windows
# 
# Prerequisites:
# 1. Install Vercel CLI: npm i -g vercel
# 2. Login to Vercel: vercel login
# 3. Link project: vercel link
# 
# Usage: 
# .\scripts\sync-env-to-vercel.ps1

Write-Host "`n🚀 Vercel Environment Variable Sync Tool" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Cyan

# Check if Vercel CLI is installed
try {
    $null = vercel --version 2>&1
} catch {
    Write-Host "`n❌ Vercel CLI is not installed!" -ForegroundColor Red
    Write-Host "`nPlease install it first:" -ForegroundColor Yellow
    Write-Host "  npm i -g vercel" -ForegroundColor Blue
    Write-Host "`nThen login:" -ForegroundColor Yellow
    Write-Host "  vercel login" -ForegroundColor Blue
    Write-Host "`nThen link your project:" -ForegroundColor Yellow
    Write-Host "  vercel link" -ForegroundColor Blue
    exit 1
}

# Read .env.production file
$envFile = Join-Path $PSScriptRoot ".." ".env.production"
if (-not (Test-Path $envFile)) {
    Write-Host "`n❌ .env.production file not found!" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $envFile
$variables = @()

foreach ($line in $envContent) {
    # Skip comments and empty lines
    if ($line.Trim().StartsWith('#') -or [string]::IsNullOrWhiteSpace($line)) {
        continue
    }
    
    # Parse KEY=VALUE pairs
    if ($line -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"').Trim("'")
        $variables += @{
            Key = $key
            Value = $value
        }
    }
}

Write-Host "`n📦 Found $($variables.Count) environment variables to sync" -ForegroundColor Blue

# Ask for confirmation
Write-Host "`nThis will add the following variables to Vercel:" -ForegroundColor Yellow
foreach ($var in $variables) {
    Write-Host "  - $($var.Key)" -ForegroundColor Gray
}

$confirm = Read-Host "`nDo you want to continue? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Add each variable to Vercel
$success = 0
$failed = 0

foreach ($var in $variables) {
    Write-Host "`nAdding $($var.Key)..." -ForegroundColor Gray
    
    try {
        # Create temp file with value
        $tempFile = [System.IO.Path]::GetTempFileName()
        Set-Content -Path $tempFile -Value $var.Value -NoNewline
        
        # Add to Vercel (production, preview, and development)
        $result = & cmd /c "type `"$tempFile`" | vercel env add $($var.Key) production 2>&1"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Added $($var.Key)" -ForegroundColor Green
            $success++
        } else {
            if ($result -match "already exists") {
                Write-Host "  ⚠️  $($var.Key) already exists (skipping)" -ForegroundColor Yellow
            } else {
                Write-Host "  ❌ Failed to add $($var.Key)" -ForegroundColor Red
                $failed++
            }
        }
        
        # Clean up temp file
        Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "  ❌ Error adding $($var.Key): $_" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Successfully added: $success variables" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "  ❌ Failed: $failed variables" -ForegroundColor Red
}

Write-Host "`n🎉 Environment variables sync complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://vercel.com/dashboard" -ForegroundColor Blue
Write-Host "2. Select your project" -ForegroundColor Blue
Write-Host "3. Go to Settings → Environment Variables" -ForegroundColor Blue
Write-Host "4. Verify all variables are set correctly" -ForegroundColor Blue
Write-Host "5. Redeploy your application" -ForegroundColor Blue