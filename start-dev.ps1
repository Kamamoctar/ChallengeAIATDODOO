# Lance le backend FastAPI + le frontend Vite en deux terminaux séparés
Write-Host "Démarrage Backend FastAPI sur http://localhost:8000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; .\.venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

Start-Sleep -Seconds 2

Write-Host "Démarrage Frontend Vite sur http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "Backend : http://localhost:8000/api/health" -ForegroundColor Yellow
Write-Host "Frontend : http://localhost:5173" -ForegroundColor Yellow
Write-Host "Docs API : http://localhost:8000/docs" -ForegroundColor Yellow
