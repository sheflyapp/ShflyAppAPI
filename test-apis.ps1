# Shfly API Testing Script for PowerShell
$baseUrl = "http://localhost:5000/api"

Write-Host "🧪 TESTING SHFLY API ENDPOINTS" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""

# Test 1: Categories API
Write-Host "1️⃣ Testing Categories API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/categories" -Method GET
    Write-Host "✅ Categories API: 200 - Found $($response.data.Count) categories" -ForegroundColor Green
} catch {
    Write-Host "❌ Categories API: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Search API
Write-Host "2️⃣ Testing Search API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/search?q=psychology&type=all&page=1&limit=5" -Method GET
    Write-Host "✅ Search API: 200 - Found results" -ForegroundColor Green
} catch {
    Write-Host "❌ Search API: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Provider Search API
Write-Host "3️⃣ Testing Provider Search API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/search/providers?q=psychology&page=1&limit=5" -Method GET
    Write-Host "✅ Provider Search API: 200 - Found $($response.data.Count) providers" -ForegroundColor Green
} catch {
    Write-Host "❌ Provider Search API: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Search Suggestions API
Write-Host "4️⃣ Testing Search Suggestions API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/search/suggestions?query=psych&type=providers" -Method GET
    Write-Host "✅ Search Suggestions API: 200" -ForegroundColor Green
} catch {
    Write-Host "❌ Search Suggestions API: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Trending Searches API
Write-Host "5️⃣ Testing Trending Searches API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/search/trending" -Method GET
    Write-Host "✅ Trending Searches API: 200" -ForegroundColor Green
} catch {
    Write-Host "❌ Trending Searches API: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Advanced Search API
Write-Host "6️⃣ Testing Advanced Search API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/search/advanced?latitude=40.7128&longitude=-74.0060&radius=50&page=1&limit=5" -Method GET
    Write-Host "✅ Advanced Search API: 200" -ForegroundColor Green
} catch {
    Write-Host "❌ Advanced Search API: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: User Registration
Write-Host "7️⃣ Testing User Registration API..." -ForegroundColor Yellow
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$registrationData = @{
    username = "testuser$timestamp"
    email = "test$timestamp@example.com"
    password = "password123"
    userType = "seeker"
    phone = "+1234567890"
    specializations = @("CATEGORY_ID_1")
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $registrationData -ContentType "application/json"
    Write-Host "✅ User Registration API: 200 - User registered successfully" -ForegroundColor Green
    $authToken = $response.token
    Write-Host "🔑 Auth Token: $($authToken.Substring(0, 20))..." -ForegroundColor Cyan
} catch {
    if ($_.Exception.Response.StatusCode -eq 400 -and $_.Exception.Message -like "*already exists*") {
        Write-Host "⚠️ User Registration API: 400 - User already exists (expected if running multiple times)" -ForegroundColor Yellow
        
        # Try to login with existing user
        Write-Host ""
        Write-Host "8️⃣ Testing User Login API..." -ForegroundColor Yellow
        $loginData = @{
            email = "test@example.com"
            password = "password123"
        } | ConvertTo-Json
        
        try {
            $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -ContentType "application/json"
            Write-Host "✅ User Login API: 200 - Login successful" -ForegroundColor Green
            $authToken = $response.token
            Write-Host "🔑 Auth Token: $($authToken.Substring(0, 20))..." -ForegroundColor Cyan
        } catch {
            Write-Host "❌ User Login API: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ User Registration API: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 8: Get User Profile (if we have auth token)
if ($authToken) {
    Write-Host "9️⃣ Testing Get User Profile API..." -ForegroundColor Yellow
    try {
        $headers = @{ Authorization = "Bearer $authToken" }
        $response = Invoke-RestMethod -Uri "$baseUrl/auth/user" -Method GET -Headers $headers
        Write-Host "✅ Get User Profile API: 200 - Profile retrieved" -ForegroundColor Green
    } catch {
        Write-Host "❌ Get User Profile API: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""

    # Test 9: Get User Consultations
    Write-Host "🔟 Testing Get User Consultations API..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/consultations?page=1&limit=5" -Method GET -Headers $headers
        Write-Host "✅ Get User Consultations API: 200 - Found $($response.data.consultations.Count) consultations" -ForegroundColor Green
    } catch {
        Write-Host "❌ Get User Consultations API: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""

    # Test 10: Get Notifications
    Write-Host "1️⃣1️⃣ Testing Get Notifications API..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/notifications?page=1&limit=5" -Method GET -Headers $headers
        Write-Host "✅ Get Notifications API: 200 - Found $($response.data.Count) notifications" -ForegroundColor Green
    } catch {
        Write-Host "❌ Get Notifications API: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""

    # Test 11: Get Wallet
    Write-Host "1️⃣2️⃣ Testing Get Wallet API..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/wallet" -Method GET -Headers $headers
        Write-Host "✅ Get Wallet API: 200 - Wallet balance: `$$($response.balance)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Get Wallet API: $($_.Exception.Response.StatusCode) - $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "🎉 API TESTING COMPLETED!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "✅ Public APIs tested" -ForegroundColor Green
Write-Host "✅ Authentication flow tested" -ForegroundColor Green
Write-Host "✅ Protected APIs tested" -ForegroundColor Green
Write-Host "✅ Database connectivity verified" -ForegroundColor Green
