Param()

Write-Host "GET /api/health"
curl http://127.0.0.1:4000/api/health

Write-Host "GET /api/admin/health (expect Not authenticated or 401 JSON)"
curl http://127.0.0.1:4000/api/admin/health

Write-Host "GET /api/auth/me (expect Not authenticated or 401 JSON)"
curl http://127.0.0.1:4000/api/auth/me
