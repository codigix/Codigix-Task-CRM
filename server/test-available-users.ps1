try {
  $response = Invoke-WebRequest -Uri 'http://localhost:5000/api/available-users/1' -UseBasicParsing
  Write-Host "Status: $($response.StatusCode)"
  Write-Host "Content:"
  $content = $response.Content | ConvertFrom-Json
  $content | ConvertTo-Json -Depth 3
} catch {
  Write-Host "Error: $_"
}
