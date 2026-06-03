$uploadPath = "upload_hostinger"
if (-not (Test-Path $uploadPath)) { New-Item -ItemType Directory -Path $uploadPath }

Write-Host "Limpando pasta de destino (exceto .htaccess)..."
Get-ChildItem -Path $uploadPath -Exclude ".htaccess" | Remove-Item -Recurse -Force

Write-Host "Copiando arquivos do frontend (dist)..."
Copy-Item -Path "dist\*" -Destination $uploadPath -Recurse -Force

Write-Host "Copiando arquivos do backend (api, exceto config.php)..."
$apiDest = Join-Path $uploadPath "api"
if (-not (Test-Path $apiDest)) { New-Item -ItemType Directory -Path $apiDest }
# Copia tudo exceto o config.php para no sobrescrever as senhas da Hostinger
Get-ChildItem -Path "api\*" -Exclude "config.php" | Copy-Item -Destination $apiDest -Recurse -Force

Write-Host "Processo concluído! A pasta 'upload_hostinger' está atualizada."
