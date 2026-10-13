$today = (Get-Date).ToString("yyyy-MM-dd")
$seatLayout = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/trips/1/seats"
Write-Host "Seat Layout for Schedule #1:"
$seatLayout | ConvertTo-Json -Depth 4
