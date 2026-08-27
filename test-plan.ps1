$body = @{
    planName = 'pr-basic'
    planType = 'Monthly'
    planPosition = 'Basic'
    planCurrency = 'EUR'
    planCurrencyFree = 'EUR'
    discountType = 'Percentage'
    discount = '30'
    limitationsInvoices = '1234'
    maxCustomers = '2345'
    product = 'package'
    supplier = 'abhi'
    planModules = @{
        Contacts = $true
        Projects = $true
        Proposals = $true
        Reports = $true
    }
    accessTrial = $false
    trialDays = '7'
    status = 'Inactive'
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri 'http://localhost:5000/api/plans' -Method POST -ContentType 'application/json' -Body $body

$response | ConvertTo-Json
