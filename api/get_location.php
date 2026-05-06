<?php
require_once '../includes/config.php';
requireAuth();

// Get user's IP-based location using free ipwho.is API (server-side, no CORS issues)
$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';

// For localhost testing, use a public IP or return demo data
if ($ip === '::1' || $ip === '127.0.0.1' || empty($ip)) {
    // Return demo data for local testing
    jsonResponse(true, [
        'city' => 'Localhost',
        'region' => 'Development',
        'country' => 'Local',
        'lat' => 0,
        'lng' => 0,
        'note' => 'Running on localhost. Location detection works on live server.'
    ]);
}

try {
    $url = "https://ipwho.is/" . urlencode($ip);
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        if ($data && isset($data['success']) && $data['success']) {
            jsonResponse(true, [
                'city' => $data['city'] ?? 'Unknown',
                'region' => $data['region'] ?? '',
                'country' => $data['country'] ?? '',
                'country_code' => $data['country_code'] ?? '',
                'lat' => $data['latitude'] ?? 0,
                'lng' => $data['longitude'] ?? 0,
                'timezone' => $data['timezone']['id'] ?? '',
                'isp' => $data['connection']['isp'] ?? '',
                'flag' => $data['flag']['emoji'] ?? ''
            ]);
        }
    }

    jsonResponse(false, [], 'Could not detect location');

} catch (Exception $e) {
    jsonResponse(false, [], 'Location detection failed');
}
?>
