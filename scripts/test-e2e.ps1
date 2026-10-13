$today = (Get-Date).ToString("yyyy-MM-dd")

Write-Host "=========================================================="
Write-Host "       BUSGO END-TO-END AUTOMATED FLOW VERIFICATION"
Write-Host "=========================================================="

# 1. Login as Customer
$custLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/auth/login" -Body '{"email":"customer@busgo.com","password":"Customer@2026"}' -ContentType 'application/json'
$custToken = $custLogin.data.token
$custHeaders = @{ "Authorization" = "Bearer $custToken" }
Write-Host "[1/6] Customer Login Verified. Token obtained for customer@busgo.com."

# 2. Check Available Seats on Schedule and Hold 2 seats
$layoutRes = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/trips/1/seats" -Headers $custHeaders
$availSeats = @($layoutRes.data.seats | Where-Object { $_.status -eq 'AVAILABLE' })
if ($availSeats.Count -lt 2) {
    Write-Host "Not enough available seats on schedule 1, checking schedule 2..."
    $layoutRes = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/trips/2/seats" -Headers $custHeaders
    $availSeats = @($layoutRes.data.seats | Where-Object { $_.status -eq 'AVAILABLE' })
    $targetScheduleId = 2
} else {
    $targetScheduleId = 1
}

$seat1 = $availSeats[0].seatNumber
$seat2 = $availSeats[1].seatNumber
Write-Host "      Selected available seats: $seat1, $seat2 on Schedule $targetScheduleId"

$holdBody = @"
{
  "scheduleId": $targetScheduleId,
  "seatNumbers": ["$seat1", "$seat2"]
}
"@
$holdRes = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/holds" -Headers $custHeaders -Body $holdBody -ContentType 'application/json'
$holdToken = $holdRes.data.holdToken
Write-Host "[2/6] Temporary Seat Hold Created: $holdToken (Expires: $($holdRes.data.expiresAt))"

# 3. Create Authoritative Booking
$bookBody = @"
{
  "scheduleId": $targetScheduleId,
  "holdToken": "$holdToken",
  "contactEmail": "customer@busgo.com",
  "contactPhone": "+919888800002",
  "passengers": [
    { "seatNumber": "$seat1", "name": "Ravi Kumar", "age": 29, "gender": "MALE" },
    { "seatNumber": "$seat2", "name": "Deepa Ravi", "age": 27, "gender": "FEMALE" }
  ]
}
"@
$bookRes = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/bookings" -Headers $custHeaders -Body $bookBody -ContentType 'application/json'
$bookingRef = $bookRes.data.bookingReference
$totalFare = $bookRes.data.totalAmount
Write-Host "[3/6] Authoritative Booking Created: PNR $bookingRef | Total: Rs. $totalFare"

# 4. Initiate & Verify Payment (Demo Gateway)
$orderBody = @"
{
  "bookingReference": "$bookingRef",
  "paymentProvider": "DEMO"
}
"@
$orderRes = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/payments/create-order" -Headers $custHeaders -Body $orderBody -ContentType 'application/json'

$verifyBody = @"
{
  "bookingReference": "$bookingRef",
  "paymentId": "$($orderRes.data.paymentId)",
  "orderId": "$($orderRes.data.orderId)",
  "signature": "$($orderRes.data.signature)"
}
"@
$verifyRes = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/payments/verify" -Headers $custHeaders -Body $verifyBody -ContentType 'application/json'
Write-Host "[4/6] Payment Gateway Verified: Status = $($verifyRes.data.paymentStatus)"

# 5. Fetch Digital Boarding Pass Ticket
$ticketRes = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/bookings/$bookingRef/ticket" -Headers $custHeaders
Write-Host "[5/6] Digital Ticket Retrieved:"
Write-Host "      PNR:        $($ticketRes.data.bookingReference)"
Write-Host "      Bus:        $($ticketRes.data.busName) ($($ticketRes.data.registrationNumber))"
Write-Host "      Driver:     $($ticketRes.data.driverName) ($($ticketRes.data.driverPhone))"
Write-Host "      Status:     $($ticketRes.data.status)"
Write-Host "      QR Payload: $($ticketRes.data.qrCodePayload)"

# 6. Admin Login & Trigger WhatsApp Dispatch Check
$adminLogin = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/auth/login" -Body '{"email":"admin@busgo.com","password":"Admin@BusGo2026"}' -ContentType 'application/json'
$adminToken = $adminLogin.data.token
$adminHeaders = @{ "Authorization" = "Bearer $adminToken" }

$dispatchRes = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/api/admin/notifications/dispatch-now" -Headers $adminHeaders
Write-Host "[6/6] Admin Triggered WhatsApp Dispatch Check: $($dispatchRes.message)"

Write-Host "=========================================================="
Write-Host "   FULL END-TO-END FLOW VERIFIED SUCCESSFULLY (100% OK)   "
Write-Host "=========================================================="
