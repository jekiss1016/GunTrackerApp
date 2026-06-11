# migrate_excel.ps1 - Data Migration Script for ArmoryVault Pro
# Parses C:\Users\e1027\Downloads\Guns List.xlsx and generates a compatible JSON import file.

$ExcelPath = "C:\Users\e1027\Downloads\Guns List.xlsx"
$OutputPath = Join-Path $PSScriptRoot "excel_import.json"

Write-Output "Starting Excel migration from: $ExcelPath"

# Check if Excel file exists
if (-not (Test-Path $ExcelPath)) {
    Write-Error "Excel file not found at: $ExcelPath"
    exit
}

# Helpers to process Excel cell values safely
function Get-SafeValue($val, $default = "N/A") {
    if ($val -eq $null -or $val -eq [System.DBNull]::Value -or $val.ToString().Trim() -eq "") {
        return $default
    }
    return $val.ToString().Trim()
}

function Get-SafeNumeric($val) {
    if ($val -eq $null -or $val -eq [System.DBNull]::Value) {
        return 0
    }
    $strVal = $val.ToString().Replace("$", "").Replace(",", "").Trim()
    [double]$num = 0
    if ([double]::TryParse($strVal, [ref]$num)) {
        return $num
    }
    return 0
}

function Get-MappedType($cat) {
    $catStr = Get-SafeValue $cat "Rifle"
    if ($catStr -like "*Pistol*" -or $catStr -like "*Handgun*" -or $catStr -like "*Revolver*") {
        return "Handgun"
    }
    return "Rifle"
}

# Connect to Excel using OLEDB
$connString = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source='$ExcelPath';Extended Properties='Excel 12.0 Xml;HDR=YES';"
$conn = New-Object System.Data.OleDb.OleDbConnection($connString)

try {
    $conn.Open()
    $firearms = @()

    # --- 1. PROCESS EKISS SHEET ---
    Write-Output "Processing sheet: Ekiss..."
    $cmdEkiss = New-Object System.Data.OleDb.OleDbCommand("SELECT * FROM [Ekiss$]", $conn)
    $daEkiss = New-Object System.Data.OleDb.OleDbDataAdapter($cmdEkiss)
    $dtEkiss = New-Object System.Data.DataTable
    $daEkiss.Fill($dtEkiss) | Out-Null

    $ekissCount = 0
    foreach ($row in $dtEkiss.Rows) {
        $mfg = Get-SafeValue $row["Gun Manufacturer"] ""
        $modelStr = Get-SafeValue $row["Gun Model #"] ""
        
        # Skip empty rows (Excel buffer rows)
        if ($mfg -eq "" -and $modelStr -eq "") { continue }

        $model = if ($modelStr -eq "") { "N/A" } else { $modelStr }

        $originalCategory = Get-SafeValue $row["Gun Category"] "Rifle"
        $notes = Get-SafeValue $row["Gun Note"] ""
        if ($originalCategory -eq "Shotgun" -or $originalCategory -eq "Muzzle Loader") {
            $notes = "Original Category: $originalCategory. " + $notes
        }

        $item = [PSCustomObject]@{
            type         = Get-MappedType $row["Gun Category"]
            manufacturer = $mfg
            model        = $model
            caliber      = Get-SafeValue $row["Gun Caliber"] "N/A"
            serialNumber = Get-SafeValue $row["Gun Serial #"] "N/A"
            actionType   = Get-SafeValue $row["Action  Type"] "N/A"
            sightType    = Get-SafeValue $row["Sight Type"] "N/A"
            value        = Get-SafeNumeric $row["Estimated Value"]
            condition    = "Good"
            dateAcquired = "N/A"
            image        = "" # Let the web application use the default SVG placeholder
            notes        = $notes.Trim()
        }
        $firearms += $item
        $ekissCount++
    }
    Write-Output "Successfully parsed $ekissCount items from Ekiss."

    # --- 2. PROCESS ROBS SHEET ---
    # Skipped as per user request to remove Rob's entries from the migration
    Write-Output "Skipping sheet: Robs (as requested)..."

    # --- 3. EXPORT TO JSON ---
    $json = ConvertTo-Json $firearms -Depth 5 -Compress:($false)
    $json | Out-File -FilePath $OutputPath -Encoding utf8
    Write-Output "Migration complete! Exported $($firearms.Count) total firearms to: $OutputPath"

} catch {
    Write-Error "An error occurred during database migration: $_"
} finally {
    $conn.Close()
}
