# Enregistre le webhook Telegram une fois le backend déployé
param(
    [Parameter(Mandatory=$true)][string]$BotToken,
    [Parameter(Mandatory=$true)][string]$BackendUrl
)

$url = "https://api.telegram.org/bot$BotToken/setWebhook"
$body = @{ url = "$BackendUrl/webhook/telegram" } | ConvertTo-Json

$response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
Write-Host "Résultat : $($response | ConvertTo-Json)" -ForegroundColor Green

# Usage:
# .\setup-telegram-webhook.ps1 -BotToken "1234567890:AAx..." -BackendUrl "https://votre-app.onrender.com"
