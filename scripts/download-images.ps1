$images = @{
    "frontend/assets/images/hero-bus.jpg" = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1920&q=80"
    "frontend/assets/images/route-madurai-chennai.jpg" = "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80"
    "frontend/assets/images/route-chennai-madurai.jpg" = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80"
    "frontend/assets/images/route-coimbatore-madurai.jpg" = "https://images.unsplash.com/photo-1509749837427-ac94a2553d0e?auto=format&fit=crop&w=800&q=80"
}

foreach ($key in $images.Keys) {
    try {
        Write-Host "Downloading $key..."
        Invoke-WebRequest -Uri $images[$key] -OutFile $key -UserAgent 'Mozilla/5.0' -TimeoutSec 20
        $size = (Get-Item $key).Length
        Write-Host "  Success: $size bytes"
    } catch {
        Write-Warning "Failed $($key) : $($_.Exception.Message)"
    }
}
