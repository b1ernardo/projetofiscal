$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$workbook = $excel.Workbooks.Open("C:\Users\Bernardo\Desktop\NaturezasOperacao.xls")
$worksheet = $workbook.Sheets.Item(1)
$csvPath = "C:\xampp\htdocs\projetofiscal\naturezas.csv"
$workbook.SaveAs($csvPath, 6) # 6 is the enum for CSV
$workbook.Close()
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
Write-Output "Excel convertido com sucesso para CSV"
