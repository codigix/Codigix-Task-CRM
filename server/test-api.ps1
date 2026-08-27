try {
  $response = Invoke-WebRequest -Uri 'http://localhost:5000/api/users/1' -UseBasicParsing
  Write-Host "Status: $($response.StatusCode)"
  Write-Host "Content:"
  $content = $response.Content | ConvertFrom-Json
  $content | ConvertTo-Json
} catch {
  Write-Host "Error: $_"
}
