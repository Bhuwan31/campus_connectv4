<?php
require_once '../includes/config.php';
requireAuth();

$query = sanitize($_GET['q'] ?? '');
if (empty($query) || strlen($query) < 2) {
    jsonResponse(true, ['results' => []]);
}

try {
    // Use Nominatim OpenStreetMap - free, no API key needed
    $url = 'https://nominatim.openstreetmap.org/search?' . http_build_query([
        'q' => $query,
        'format' => 'json',
        'limit' => 8,
        'addressdetails' => 1,
        'accept-language' => 'en'
    ]);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_USERAGENT, 'CampusConnect/1.0');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json',
        'Referer: ' . (isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost')
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && $response) {
        $data = json_decode($response, true);
        if (is_array($data)) {
            $results = array_map(function($item) {
                $city = $item['address']['city'] ?? 
                        $item['address']['town'] ?? 
                        $item['address']['village'] ?? 
                        $item['address']['county'] ?? 
                        explode(',', $item['display_name'])[0] ?? 'Unknown';
                $country = $item['address']['country'] ?? '';
                $flag = '';
                if (!empty($item['address']['country_code'])) {
                    $cc = strtoupper($item['address']['country_code']);
                    $flag = implode('', array_map(function($c) { return mb_chr(0x1F1E6 + ord($c) - ord('A')); }, str_split($cc)));
                }
                return [
                    'name' => $city,
                    'full_name' => $item['display_name'],
                    'country' => $country,
                    'flag' => $flag,
                    'lat' => (float)$item['lat'],
                    'lng' => (float)$item['lon'],
                    'type' => $item['type'] ?? 'unknown'
                ];
            }, $data);
            jsonResponse(true, ['results' => $results]);
        }
    }

    jsonResponse(true, ['results' => []]);

} catch (Exception $e) {
    jsonResponse(false, [], 'Location search failed');
}
?>
