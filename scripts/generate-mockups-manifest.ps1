$mockupDir = "public/mockups"
$manifestPath = "public/mockups/manifest.json"

$extensions = @(".glb", ".gltf", ".png", ".jpg", ".jpeg", ".webp")

$categoryOrder = @("Clothing", "T-Shirts", "Boxes", "Bottles & Cans", "Mugs", "Hats", "Bags", "Phone Cases", "Other")

function Get-CategoryFromName {
    param([string]$name)
    $lower = $name.ToLower()
    $keywords = @(
        @{ patterns = @("shirt", "tshirt", "t_shirt", "hoodie", "longsleeve"); category = "T-Shirts" },
        @{ patterns = @("box");                          category = "Boxes" },
        @{ patterns = @("bottle", "can");                category = "Bottles & Cans" },
        @{ patterns = @("mug", "cup");                   category = "Mugs" },
        @{ patterns = @("cap", "hat");                   category = "Hats" },
        @{ patterns = @("bag", "tote");                  category = "Bags" },
        @{ patterns = @("phone", "case");                category = "Phone Cases" }
    )
    foreach ($entry in $keywords) {
        foreach ($pat in $entry.patterns) {
            if ($lower -match [regex]::Escape($pat)) {
                return $entry.category
            }
        }
    }
    return "Other"
}

$categories = @{}
foreach ($cat in $categoryOrder) {
    $categories[$cat] = @()
}

$mockupRoot = (Get-Item -LiteralPath $mockupDir).FullName

$files = Get-ChildItem -LiteralPath $mockupDir -Recurse -File | Where-Object {
    $extensions -contains $_.Extension.ToLower()
}

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($mockupRoot.Length + 1) -replace '\\', '/'

    if ($file.Directory.FullName -eq $mockupRoot) {
        $relativeDir = ""
    } else {
        $relativeDir = $file.Directory.FullName.Substring($mockupRoot.Length + 1) -replace '\\', '/'
    }

    if ([string]::IsNullOrEmpty($relativeDir)) {
        $category = Get-CategoryFromName $file.BaseName
    } else {
        $category = $relativeDir -replace '[-_]', ' '
    }

    if (-not $categories.ContainsKey($category)) {
        $categories[$category] = @()
    }

    $segments = $relativePath -split '/'
    $encodedSegments = foreach ($seg in $segments) { [System.Uri]::EscapeDataString($seg) }
    $encodedPath = $encodedSegments -join '/'
    $entry = @{
        name = $relativePath
        url  = "/mockups/$encodedPath"
    }
    $categories[$category] += $entry
}

$sorted = @{}
$keys = @($categories.Keys)
foreach ($cat in $keys) {
    $sorted[$cat] = $categories[$cat] | Sort-Object -Property name
}

$manifest = @{
    categories    = $sorted
    categoryOrder = $categoryOrder
}

$json = $manifest | ConvertTo-Json -Depth 10
# Fix empty arrays serialized as {} and unescaped &
$json = [regex]::Replace($json, ':\s*\{\s*?\}', ': []')
$json = $json -replace '\\u0026', '&'
[System.IO.File]::WriteAllText($manifestPath, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host "Manifest generated at $manifestPath"
