[CmdletBinding()]
param(
  [switch]$KeepBuildFiles
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $repoRoot 'art\generated-sources\character-sprites'
$buildRoot = Join-Path $repoRoot 'art\generated-sources\character-sprites\.runtime-build'
$characterRoot = Join-Path $repoRoot 'public\assets\characters'
$npcRoot = Join-Path $characterRoot 'npcs'
$creatureRoot = Join-Path $repoRoot 'public\assets\creatures'
$propRoot = Join-Path $repoRoot 'public\assets\props'
$vehicleRoot = Join-Path $repoRoot 'public\assets\vehicles'
$script:DimensionCache = @{}
$script:ComponentGridCache = @{}

function Invoke-Magick {
  param([Parameter(Mandatory)][string[]]$MagickArguments)

  & magick @MagickArguments
  if ($LASTEXITCODE -ne 0) {
    throw "ImageMagick failed with exit code ${LASTEXITCODE}: magick $($MagickArguments -join ' ')"
  }
}

function Get-ImageDimensions {
  param([Parameter(Mandatory)][string]$Path)

  if ($script:DimensionCache.ContainsKey($Path)) {
    return $script:DimensionCache[$Path]
  }

  $raw = (& magick identify -format '%w %h' $Path).Trim()
  if ($LASTEXITCODE -ne 0 -or $raw -notmatch '^(\d+)\s+(\d+)$') {
    throw "Could not read image dimensions for $Path"
  }

  $dimensions = @([int]$Matches[1], [int]$Matches[2])
  $script:DimensionCache[$Path] = $dimensions
  return $dimensions
}

function Get-ComponentGrid {
  param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][int[]]$RowComponentCounts
  )

  $cacheKey = "${Source}|$($RowComponentCounts -join ',')"
  if ($script:ComponentGridCache.ContainsKey($cacheKey)) {
    return $script:ComponentGridCache[$cacheKey]
  }

  $dimensions = Get-ImageDimensions $Source
  $sourceWidth = $dimensions[0]
  $sourceHeight = $dimensions[1]
  $rowCount = $RowComponentCounts.Count
  $componentOutput = @(
    & magick $Source `
      -alpha extract `
      -threshold '30%' `
      -define 'connected-components:area-threshold=80' `
      -define 'connected-components:verbose=true' `
      -connected-components 8 null: 2>&1
  )
  if ($LASTEXITCODE -ne 0) {
    throw "Connected-component analysis failed for $Source"
  }

  $components = @()
  foreach ($lineObject in $componentOutput) {
    $line = $lineObject.ToString()
    if ($line -match '^\s+\d+:\s+(\d+)x(\d+)\+(-?\d+)\+(-?\d+)\s+([\d.]+),([\d.]+)\s+([\d.eE+\-]+)\s+(?:srgb\(255,255,255\)|gray\(255\))\s*$') {
      $components += [pscustomobject]@{
        Width = [int]$Matches[1]
        Height = [int]$Matches[2]
        X = [int]$Matches[3]
        Y = [int]$Matches[4]
        CenterX = [double]$Matches[5]
        CenterY = [double]$Matches[6]
        Area = [double]$Matches[7]
      }
    }
  }

  $grid = @{}
  for ($row = 0; $row -lt $rowCount; $row++) {
    $expectedCount = $RowComponentCounts[$row]
    $rowComponents = @($components | Where-Object {
      $componentRow = [math]::Floor(($_.CenterY * $rowCount) / $sourceHeight)
      $componentRow = [math]::Max(0, [math]::Min($rowCount - 1, $componentRow))
      $componentRow -eq $row
    })
    if ($rowComponents.Count -lt $expectedCount) {
      throw "Expected at least $expectedCount foreground subjects in row $row of $Source, found $($rowComponents.Count)."
    }

    # The generated grids can contain a detached hand, prop, or wheel. The N
    # largest components are the authored subjects; smaller nearby components are
    # then folded into the nearest subject bounding box.
    $mainComponents = @($rowComponents | Sort-Object Area -Descending | Select-Object -First $expectedCount | Sort-Object CenterX)
    $secondaryComponents = @($rowComponents | Where-Object { $_ -notin $mainComponents })
    for ($column = 0; $column -lt $mainComponents.Count; $column++) {
      $main = $mainComponents[$column]
      $left = $main.X
      $top = $main.Y
      $right = $main.X + $main.Width
      $bottom = $main.Y + $main.Height

      foreach ($secondary in $secondaryComponents) {
        $nearest = $mainComponents | Sort-Object {
          $dx = $_.CenterX - $secondary.CenterX
          $dy = $_.CenterY - $secondary.CenterY
          ($dx * $dx) + ($dy * $dy)
        } | Select-Object -First 1
        if ($nearest -ne $main) {
          continue
        }

        $horizontalGap = [math]::Max(0, [math]::Max($main.X - ($secondary.X + $secondary.Width), $secondary.X - ($main.X + $main.Width)))
        $verticalGap = [math]::Max(0, [math]::Max($main.Y - ($secondary.Y + $secondary.Height), $secondary.Y - ($main.Y + $main.Height)))
        $maxGap = [math]::Max(18, ($sourceWidth / $expectedCount) * .14)
        if ([math]::Sqrt(($horizontalGap * $horizontalGap) + ($verticalGap * $verticalGap)) -le $maxGap) {
          $left = [math]::Min($left, $secondary.X)
          $top = [math]::Min($top, $secondary.Y)
          $right = [math]::Max($right, $secondary.X + $secondary.Width)
          $bottom = [math]::Max($bottom, $secondary.Y + $secondary.Height)
        }
      }

      $edgePadding = 6
      $left = [math]::Max(0, $left - $edgePadding)
      $top = [math]::Max(0, $top - $edgePadding)
      $right = [math]::Min($sourceWidth, $right + $edgePadding)
      $bottom = [math]::Min($sourceHeight, $bottom + $edgePadding)
      $grid["${row}:${column}"] = [pscustomobject]@{
        X = [int]$left
        Y = [int]$top
        Width = [int]($right - $left)
        Height = [int]($bottom - $top)
      }
    }
  }

  $script:ComponentGridCache[$cacheKey] = $grid
  return $grid
}

function Initialize-BuildDirectory {
  if (Test-Path -LiteralPath $buildRoot) {
    $resolvedBuild = (Resolve-Path -LiteralPath $buildRoot).Path
    $resolvedSource = (Resolve-Path -LiteralPath $sourceRoot).Path
    if (-not $resolvedBuild.StartsWith($resolvedSource, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to clean build directory outside the generated source tree: $resolvedBuild"
    }
    Remove-Item -LiteralPath $resolvedBuild -Recurse -Force
  }

  @($buildRoot, $characterRoot, $npcRoot, $creatureRoot, $propRoot, $vehicleRoot) | ForEach-Object {
    New-Item -ItemType Directory -Force -Path $_ | Out-Null
  }
}

function New-ChromaMatte {
  param(
    [Parameter(Mandatory)][string]$SourceName,
    [Parameter(Mandatory)][string]$BuildName
  )

  $inputPath = Join-Path $sourceRoot $SourceName
  $outputPath = Join-Path $buildRoot $BuildName
  if (-not (Test-Path -LiteralPath $inputPath)) {
    throw "Missing generated master: $inputPath"
  }

  # The generated masters use a softly varying near-magenta field rather than one
  # exact key colour. This matte rewards green and penalises red/blue, retaining
  # dark windows, purple paint, highlights, fur, and antialiased subject edges.
  $alphaExpression = 'max(0,min(1,(g+(1-r)+(1-b)-0.45)/0.55))'
  # Suppress only the magenta excess in partial-alpha edge pixels. Fully opaque
  # purples remain untouched; fully transparent RGB is zeroed to avoid mip bleed.
  $despillExpression = 'a<0.02?0:(a<0.995?max(0,u-(max(0,min(r,b)-g)*max(0,min(1,(0.995-a)/0.35))*1.15)):u)'
  Invoke-Magick @(
    $inputPath,
    '-alpha', 'set',
    '-channel', 'A',
    '-fx', $alphaExpression,
    '+channel',
    '-channel', 'RB',
    '-fx', $despillExpression,
    '+channel',
    '-channel', 'RGB',
    '-fx', 'a<0.02?0:u',
    '+channel',
    '-define', 'png:color-type=6',
    $outputPath
  )

  return $outputPath
}

function New-NormalizedFrame {
  param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][int]$SourceColumns,
    [Parameter(Mandatory)][int]$SourceRows,
    [Parameter(Mandatory)][int]$Column,
    [Parameter(Mandatory)][int]$Row,
    [Parameter(Mandatory)][int]$FrameWidth,
    [Parameter(Mandatory)][int]$FrameHeight,
    [Parameter(Mandatory)][string]$Output,
    [int[]]$RowComponentCounts = @(),
    [int]$HorizontalPadding = 6,
    [int]$VerticalPadding = 6,
    [ValidateSet('North', 'South', 'Center')][string]$Gravity = 'South',
    [switch]$FlipHorizontal
  )

  if ($Column -lt 0 -or $Column -ge $SourceColumns -or $Row -lt 0 -or $Row -ge $SourceRows) {
    throw "Grid coordinate ($Column,$Row) is outside ${SourceColumns}x${SourceRows} for $Source"
  }

  if ($RowComponentCounts.Count -eq 0) {
    $RowComponentCounts = @(for ($index = 0; $index -lt $SourceRows; $index++) { $SourceColumns })
  }
  if ($RowComponentCounts.Count -ne $SourceRows) {
    throw "RowComponentCounts must provide one subject count for each of the $SourceRows rows in $Source"
  }
  if ($Column -ge $RowComponentCounts[$Row]) {
    throw "Component ordinal $Column is outside the $($RowComponentCounts[$Row]) subjects in row $Row of $Source"
  }
  $componentGrid = Get-ComponentGrid -Source $Source -RowComponentCounts $RowComponentCounts
  $crop = $componentGrid["${Row}:${Column}"]
  $x0 = $crop.X
  $y0 = $crop.Y
  $cropWidth = $crop.Width
  $cropHeight = $crop.Height
  $fitWidth = $FrameWidth - ($HorizontalPadding * 2)
  $fitHeight = $FrameHeight - ($VerticalPadding * 2)

  $arguments = @(
    $Source,
    '-crop', "${cropWidth}x${cropHeight}+${x0}+${y0}",
    '+repage',
    '-trim',
    '+repage',
    '-filter', 'Lanczos',
    '-resize', "${fitWidth}x${fitHeight}>",
    '-gravity', $Gravity,
    '-background', 'none',
    '-extent', "${FrameWidth}x${FrameHeight}"
  )
  if ($FlipHorizontal) {
    $arguments += '-flop'
  }
  $arguments += @('-define', 'png:color-type=6', $Output)
  Invoke-Magick $arguments
}

function New-AnimationVariant {
  param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][string]$Output,
    [Parameter(Mandatory)][int]$FrameWidth,
    [Parameter(Mandatory)][int]$FrameHeight,
    [double]$ScaleX = 1,
    [double]$ScaleY = 1,
    [int]$OffsetX = 0,
    [double]$ShearX = 0
  )

  # The NPC masters provide a clean front, rear, side stride and authored action
  # for every identity, but not repeated walk-cycle cells. Derive restrained
  # in-betweens from those approved silhouettes instead of duplicating a still.
  # The feet stay south-anchored while alternate width/height/offset phases create
  # readable weight transfer and a subtle breathing beat at game scale.
  $scaledWidth = [math]::Max(1, [math]::Round($FrameWidth * $ScaleX))
  $scaledHeight = [math]::Max(1, [math]::Round($FrameHeight * $ScaleY))
  $roll = if ($OffsetX -ge 0) { "+${OffsetX}+0" } else { "${OffsetX}+0" }
  Invoke-Magick @(
    $Source,
    '-filter', 'Lanczos',
    '-resize', "${scaledWidth}x${scaledHeight}!",
    '-background', 'none',
    '-shear', "${ShearX}x0",
    '-gravity', 'South',
    '-extent', "${FrameWidth}x${FrameHeight}",
    '-roll', $roll,
    '-define', 'png:color-type=6',
    $Output
  )
}

function Join-FramesHorizontal {
  param(
    [Parameter(Mandatory)][string[]]$Frames,
    [Parameter(Mandatory)][string]$Output
  )

  Invoke-Magick @($Frames + @('+append', '-define', 'png:color-type=6', $Output))
}

function Join-RowsVerticalWebP {
  param(
    [Parameter(Mandatory)][string[]]$Rows,
    [Parameter(Mandatory)][string]$Output,
    [ValidateRange(0, 6)][int]$Method = 6,
    [ValidateRange(1, 100)][int]$Quality = 92
  )

  Invoke-Magick @($Rows + @(
    '-append',
    '-strip',
    '-quality', $Quality.ToString(),
    '-define', "webp:method=${Method}",
    '-define', 'webp:thread-level=1',
    '-define', 'webp:alpha-quality=100',
    '-define', 'webp:exact=true',
    $Output
  ))
}

function Convert-RowToWebP {
  param(
    [Parameter(Mandatory)][string[]]$Frames,
    [Parameter(Mandatory)][string]$Output
  )

  Invoke-Magick @($Frames + @(
    '+append',
    '-strip',
    '-quality', '92',
    '-define', 'webp:method=6',
    '-define', 'webp:alpha-quality=100',
    '-define', 'webp:exact=true',
    $Output
  ))
}

function Build-PlayerSheet {
  param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][string]$Id,
    [Parameter(Mandatory)][int]$SourceColumnOffset
  )

  $rows = @()
  # Per direction: two idle frames, four walk frames, and two interaction frames.
  # Action A is the final stride/ready pose and action B is the authored reach.
  # Keeping the two distinct source cells avoids a frozen interaction toggle.
  $poseMap = @(0, 1, 1, 2, 3, 4, 4, 5)
  for ($direction = 0; $direction -lt 4; $direction++) {
    $frames = @()
    for ($frameIndex = 0; $frameIndex -lt $poseMap.Count; $frameIndex++) {
      $framePath = Join-Path $buildRoot ("player-{0}-d{1}-f{2}.png" -f $Id, $direction, $frameIndex)
      New-NormalizedFrame -Source $Source -SourceColumns 12 -SourceRows 4 `
        -Column ($SourceColumnOffset + $poseMap[$frameIndex]) -Row $direction `
        -FrameWidth 128 -FrameHeight 256 -HorizontalPadding 5 -VerticalPadding 5 `
        -Gravity South -Output $framePath
      $frames += $framePath
    }
    $rowPath = Join-Path $buildRoot ("player-{0}-row-{1}.png" -f $Id, $direction)
    Join-FramesHorizontal -Frames $frames -Output $rowPath
    $rows += $rowPath
  }

  Join-RowsVerticalWebP -Rows $rows -Output (Join-Path $characterRoot ("{0}-sheet.webp" -f $Id))
}

function Build-NpcSheet {
  param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][int]$SourceColumns,
    [Parameter(Mandatory)][string]$Id,
    [Parameter(Mandatory)][int]$SourceColumn
  )

  $rows = @()
  # Runtime row order matches the leads: toward, away, right, left. The generated
  # masters contain toward, away, right-stride and toward-action source rows; left
  # is a deliberate mirror of right. Every runtime row is idle A/B, walk 1-4,
  # action A/B. The action source stays authored while its second cell is a mild
  # anticipation/recovery phase derived from that same approved silhouette.
  for ($direction = 0; $direction -lt 4; $direction++) {
    $sourceDirection = if ($direction -eq 3) { 2 } else { $direction }
    $flipDirection = $direction -eq 3
    $basePath = Join-Path $buildRoot ("npc-{0}-d{1}-base.png" -f $Id, $direction)
    New-NormalizedFrame -Source $Source -SourceColumns $SourceColumns -SourceRows 4 `
      -Column $SourceColumn -Row $sourceDirection -FrameWidth 128 -FrameHeight 192 `
      -HorizontalPadding 7 -VerticalPadding 5 -Gravity South -FlipHorizontal:$flipDirection -Output $basePath

    $actionPath = Join-Path $buildRoot ("npc-{0}-d{1}-action.png" -f $Id, $direction)
    # Only the toward row uses the authored front-facing gesture. Other action
    # rows preserve their angle and derive a lean/recovery from that direction,
    # preventing a visible front-facing snap when an NPC reacts in profile/rear.
    $actionSourceRow = if ($direction -eq 0) { 3 } else { $sourceDirection }
    New-NormalizedFrame -Source $Source -SourceColumns $SourceColumns -SourceRows 4 `
      -Column $SourceColumn -Row $actionSourceRow -FrameWidth 128 -FrameHeight 192 `
      -HorizontalPadding 7 -VerticalPadding 5 -Gravity South -FlipHorizontal:$flipDirection -Output $actionPath

    $actionDirection = if ($direction -eq 3) { -1 } elseif ($direction -eq 2) { 1 } else { 1 }
    $actionScaleA = if ($direction -eq 0) { 1.000 } else { 1.030 }
    $actionScaleB = if ($direction -eq 0) { 1.018 } else { 0.986 }
    $actionShearA = if ($direction -eq 0) { 0.0 } else { 1.8 * $actionDirection }
    $actionShearB = if ($direction -eq 0) { 0.7 } else { -0.8 * $actionDirection }

    $variantSpecs = @(
      @{ source = $basePath; scaleX = 1.000; scaleY = 1.000; offsetX = 0; shearX = 0.0 },
      @{ source = $basePath; scaleX = 0.992; scaleY = 0.984; offsetX = 1; shearX = 0.25 },
      @{ source = $basePath; scaleX = 0.978; scaleY = 0.995; offsetX = -2; shearX = -0.7 },
      @{ source = $basePath; scaleX = 1.012; scaleY = 0.963; offsetX = 1; shearX = 0.55 },
      @{ source = $basePath; scaleX = 0.978; scaleY = 0.995; offsetX = 2; shearX = 0.7 },
      @{ source = $basePath; scaleX = 1.012; scaleY = 0.963; offsetX = -1; shearX = -0.55 },
      @{ source = $actionPath; scaleX = $actionScaleA; scaleY = $(if ($direction -eq 0) { 1.000 } else { 0.972 }); offsetX = 2 * $actionDirection; shearX = $actionShearA },
      @{ source = $actionPath; scaleX = $actionScaleB; scaleY = 0.992; offsetX = -1 * $actionDirection; shearX = $actionShearB }
    )

    $frames = @()
    for ($frameIndex = 0; $frameIndex -lt $variantSpecs.Count; $frameIndex++) {
      $spec = $variantSpecs[$frameIndex]
      $framePath = Join-Path $buildRoot ("npc-{0}-d{1}-f{2}.png" -f $Id, $direction, $frameIndex)
      New-AnimationVariant -Source $spec.source -Output $framePath -FrameWidth 128 -FrameHeight 192 `
        -ScaleX $spec.scaleX -ScaleY $spec.scaleY -OffsetX $spec.offsetX -ShearX $spec.shearX
      $frames += $framePath
    }
    $rowPath = Join-Path $buildRoot ("npc-{0}-row-{1}.png" -f $Id, $direction)
    Join-FramesHorizontal -Frames $frames -Output $rowPath
    $rows += $rowPath
  }

  # These sheets are displayed at roughly half their stored size. Method 4/q88
  # preserves the generated detail while keeping a full 23-character rebuild and
  # browser payload practical; alpha remains full quality and exact.
  Join-RowsVerticalWebP -Rows $rows -Output (Join-Path $npcRoot ("{0}-sheet.webp" -f $Id)) -Method 4 -Quality 88
}

function Build-AnimalAtlas {
  param([Parameter(Mandatory)][string]$Source)

  $rows = @()
  for ($species = 0; $species -lt 3; $species++) {
    $frames = @()
    for ($action = 0; $action -lt 4; $action++) {
      $framePath = Join-Path $buildRoot ("animal-{0}-{1}.png" -f $species, $action)
      New-NormalizedFrame -Source $Source -SourceColumns 4 -SourceRows 3 `
        -Column $action -Row $species -FrameWidth 160 -FrameHeight 128 `
        -HorizontalPadding 5 -VerticalPadding 5 -Gravity South -Output $framePath
      $frames += $framePath
    }
    $rowPath = Join-Path $buildRoot ("animal-row-{0}.png" -f $species)
    Join-FramesHorizontal -Frames $frames -Output $rowPath
    $rows += $rowPath
  }

  Join-RowsVerticalWebP -Rows $rows -Output (Join-Path $creatureRoot 'animals-atlas.webp')
}

function Build-TrolleyAtlas {
  param([Parameter(Mandatory)][string]$Source)

  $rows = @()
  # Source columns are props; source rows are parked, rolling, and turning.
  for ($prop = 0; $prop -lt 4; $prop++) {
    $frames = @()
    for ($action = 0; $action -lt 3; $action++) {
      $framePath = Join-Path $buildRoot ("trolley-{0}-{1}.png" -f $prop, $action)
      New-NormalizedFrame -Source $Source -SourceColumns 4 -SourceRows 3 `
        -Column $prop -Row $action -FrameWidth 240 -FrameHeight 180 `
        -HorizontalPadding 7 -VerticalPadding 7 -Gravity Center -Output $framePath
      $frames += $framePath
    }
    $rowPath = Join-Path $buildRoot ("trolley-row-{0}.png" -f $prop)
    Join-FramesHorizontal -Frames $frames -Output $rowPath
    $rows += $rowPath
  }

  Join-RowsVerticalWebP -Rows $rows -Output (Join-Path $propRoot 'trolleys-atlas.webp')
}

function Build-VehicleAtlas {
  param(
    [Parameter(Mandatory)][string]$StaticSource,
    [Parameter(Mandatory)][string]$DriveSource
  )

  $vehicles = @(
    @{ id = 'sally'; staticColumn = 0; staticRow = 0; driveColumn = 0 },
    @{ id = 'alan'; staticColumn = 1; staticRow = 0; driveColumn = 1 },
    @{ id = 'vu'; staticColumn = 2; staticRow = 0; driveColumn = 2 },
    @{ id = 'max'; staticColumn = 3; staticRow = 0; driveColumn = 3 },
    @{ id = 'juan'; staticColumn = 0; staticRow = 1; driveColumn = 4 },
    @{ id = 'wayne'; staticColumn = 1; staticRow = 1; driveColumn = 5 },
    @{ id = 'thanh'; staticColumn = 2; staticRow = 1; driveColumn = 6 }
  )

  $rows = @()
  foreach ($vehicle in $vehicles) {
    $frames = @()
    $parkedPath = Join-Path $buildRoot ("vehicle-{0}-parked.png" -f $vehicle.id)
    New-NormalizedFrame -Source $StaticSource -SourceColumns 4 -SourceRows 2 `
      -Column $vehicle.staticColumn -Row $vehicle.staticRow -FrameWidth 256 -FrameHeight 160 `
      -RowComponentCounts @(4, 3) `
      -HorizontalPadding 7 -VerticalPadding 7 -Gravity Center -Output $parkedPath
    $frames += $parkedPath

    # Wayne's middle generated drive cell was intentionally empty; his authored
    # third-row angle supplies both rolling frames instead of introducing a blank.
    $rollingRow = if ($vehicle.id -eq 'wayne') { 2 } else { 1 }
    foreach ($driveRow in @($rollingRow, 2)) {
      $framePath = Join-Path $buildRoot ("vehicle-{0}-drive-{1}.png" -f $vehicle.id, $driveRow)
      $driveOrdinal = if ($driveRow -lt 2 -and $vehicle.driveColumn -eq 6) { 5 } else { $vehicle.driveColumn }
      New-NormalizedFrame -Source $DriveSource -SourceColumns 7 -SourceRows 3 `
        -Column $driveOrdinal -Row $driveRow -FrameWidth 256 -FrameHeight 160 `
        -RowComponentCounts @(6, 6, 7) `
        -HorizontalPadding 7 -VerticalPadding 7 -Gravity Center -Output $framePath
      $frames += $framePath
    }

    $rowPath = Join-Path $buildRoot ("vehicle-row-{0}.png" -f $vehicle.id)
    Join-FramesHorizontal -Frames $frames -Output $rowPath
    $rows += $rowPath
  }

  Join-RowsVerticalWebP -Rows $rows -Output (Join-Path $vehicleRoot 'vehicles-atlas.webp')
}

function Build-FacilityPropAtlas {
  param([Parameter(Mandatory)][string]$Source)

  $rows = @()
  for ($row = 0; $row -lt 4; $row++) {
    $frames = @()
    for ($column = 0; $column -lt 5; $column++) {
      $framePath = Join-Path $buildRoot ("facility-prop-{0}-{1}.png" -f $row, $column)
      New-NormalizedFrame -Source $Source -SourceColumns 5 -SourceRows 4 `
        -Column $column -Row $row -FrameWidth 192 -FrameHeight 160 `
        -HorizontalPadding 6 -VerticalPadding 6 -Gravity Center -Output $framePath
      $frames += $framePath
    }
    $rowPath = Join-Path $buildRoot ("facility-prop-row-{0}.png" -f $row)
    Join-FramesHorizontal -Frames $frames -Output $rowPath
    $rows += $rowPath
  }

  Join-RowsVerticalWebP -Rows $rows -Output (Join-Path $propRoot 'facility-props-atlas.webp')
}

Initialize-BuildDirectory

if (-not (Get-Command magick -ErrorAction SilentlyContinue)) {
  throw 'ImageMagick 7 (magick) is required to build the generated runtime art.'
}

Write-Host 'Preparing chroma mattes...'
$melJosh = New-ChromaMatte 'mel_josh_chroma_master.png' 'mel-josh-alpha.png'
$principal = New-ChromaMatte 'principal_npcs_directional_chroma_master.png' 'principal-alpha.png'
$supportA = New-ChromaMatte 'supporting_group_a_directional_chroma_master.png' 'support-a-alpha.png'
$supportB = New-ChromaMatte 'supporting_group_b_directional_chroma_master.png' 'support-b-alpha.png'
$supportC = New-ChromaMatte 'supporting_group_c_directional_chroma_master.png' 'support-c-alpha.png'
$animals = New-ChromaMatte 'animals_chroma_master.png' 'animals-alpha.png'
$trolleys = New-ChromaMatte 'carts_trolleys_animated_chroma_master.png' 'trolleys-alpha.png'
$vehiclesStatic = New-ChromaMatte 'vehicles_chroma_master.png' 'vehicles-static-alpha.png'
$vehiclesDrive = New-ChromaMatte 'vehicles_driveaway_chroma_master.png' 'vehicles-drive-alpha.png'
$facilityProps = New-ChromaMatte 'facility_props_chroma_master.png' 'facility-props-alpha.png'

Write-Host 'Building Mel and Josh sheets...'
Build-PlayerSheet -Source $melJosh -Id 'mel' -SourceColumnOffset 0
Build-PlayerSheet -Source $melJosh -Id 'josh' -SourceColumnOffset 6

Write-Host 'Building principal NPC sheets...'
# The generated principal grid's actual left-to-right order is recorded here,
# rather than assuming the order from the original prompt.
$principalIds = @('sally', 'juan', 'wayne', 'thanh', 'alan', 'ross', 'dhanya', 'vu')
for ($column = 0; $column -lt $principalIds.Count; $column++) {
  Build-NpcSheet -Source $principal -SourceColumns 8 -Id $principalIds[$column] -SourceColumn $column
}

Write-Host 'Building supporting NPC sheets...'
$supportGroups = @(
  @{ source = $supportA; ids = @('xing', 'anugra', 'luther', 'tony', 'urja') },
  @{ source = $supportB; ids = @('poonam', 'max', 'leila', 'erin', 'sam') },
  @{ source = $supportC; ids = @('mitch', 'james', 'eddy', 'pierre', 'shinya') }
)
foreach ($group in $supportGroups) {
  for ($column = 0; $column -lt $group.ids.Count; $column++) {
    Build-NpcSheet -Source $group.source -SourceColumns 5 -Id $group.ids[$column] -SourceColumn $column
  }
}

Write-Host 'Building animals, trolleys, vehicles, and facility props...'
Build-AnimalAtlas -Source $animals
Build-TrolleyAtlas -Source $trolleys
Build-VehicleAtlas -StaticSource $vehiclesStatic -DriveSource $vehiclesDrive
Build-FacilityPropAtlas -Source $facilityProps
$facilityAtlas = Join-Path $propRoot 'facility-props-atlas.webp'
& node (Join-Path $repoRoot 'scripts/build_facility_animation_atlas.mjs') $facilityAtlas $facilityAtlas
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to add authored facility-console animation states.'
}

$experimentalSheet = Join-Path $characterRoot 'mel_josh_sheet_raw.png'
if (Test-Path -LiteralPath $experimentalSheet) {
  Remove-Item -LiteralPath $experimentalSheet -Force
}

$outputs = @(
  (Join-Path $characterRoot 'mel-sheet.webp'),
  (Join-Path $characterRoot 'josh-sheet.webp'),
  (Join-Path $creatureRoot 'animals-atlas.webp'),
  (Join-Path $propRoot 'trolleys-atlas.webp'),
  (Join-Path $propRoot 'facility-props-atlas.webp'),
  (Join-Path $vehicleRoot 'vehicles-atlas.webp')
) + (Get-ChildItem -LiteralPath $npcRoot -Filter '*-sheet.webp' | Sort-Object Name | Select-Object -ExpandProperty FullName)

Write-Host ''
Write-Host 'Runtime art outputs:'
foreach ($output in $outputs) {
  $dimensions = Get-ImageDimensions $output
  $size = (Get-Item -LiteralPath $output).Length
  Write-Host ("  {0}  {1}x{2}  {3:N0} bytes" -f ($output.Substring($repoRoot.Length + 1)), $dimensions[0], $dimensions[1], $size)
}

if (-not $KeepBuildFiles) {
  $removed = $false
  for ($attempt = 1; $attempt -le 6; $attempt++) {
    try {
      Remove-Item -LiteralPath $buildRoot -Recurse -Force -ErrorAction Stop
      $removed = $true
      break
    }
    catch {
      if ($attempt -lt 6) {
        Start-Sleep -Milliseconds (150 * $attempt)
      }
    }
  }
  if (-not $removed) {
    Write-Warning "Runtime art is valid, but Windows kept a temporary build file locked: $buildRoot"
  }
}

Write-Host 'Runtime art build complete.'
