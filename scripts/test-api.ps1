$loginBody = '{"email":"admin@busgo.com","password":"Admin@BusGo2026"}'
$res = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/auth/login' -Body $loginBody -ContentType 'application/json'
Write-Host "Admin Login Response:"
$res | ConvertTo-Json -Depth 4

$custBody = '{"email":"customer@busgo.com","password":"Customer@2026"}'
$custRes = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/auth/login' -Body $custBody -ContentType 'application/json'
Write-Host "Customer Login Response:"
$custRes | ConvertTo-Json -Depth 4

$today = (Get-Date).ToString("yyyy-MM-dd")
$searchRes = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/trips/search?origin=Madurai&destination=Chennai&journeyDate=$today"
Write-Host "Trip Search Response:"
$searchRes | ConvertTo-Json -Depth 4
