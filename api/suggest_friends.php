<?php
require_once '../includes/config.php';
requireAuth();

try {
    $db = getDB();
    $userId = getCurrentUserId();

    // Get current user data
    $stmt = $db->prepare("SELECT feeling, location_city, location_lat, location_lng, department FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $currentUser = $stmt->fetch();

    if (!$currentUser) {
        jsonResponse(false, [], 'User not found');
    }

    // Get all other users with their data
    $stmt = $db->prepare("
        SELECT u.id, u.name, u.profile_image, u.department, u.bio,
               u.feeling, u.feeling_emoji, u.location_city, u.location_lat, u.location_lng,
               (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count
        FROM users u
        WHERE u.id != ?
        AND u.id NOT IN (
            SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'accepted'
            UNION
            SELECT user_id FROM friendships WHERE friend_id = ? AND status = 'accepted'
        )
        LIMIT 20
    ");
    $stmt->execute([$userId, $userId, $userId]);
    $users = $stmt->fetchAll();

    // Calculate match scores
    foreach ($users as &$user) {
        $score = 0;
        $reasons = [];

        // 1. Same feeling (highest weight: 40 points)
        if ($currentUser['feeling'] && $user['feeling'] && 
            $currentUser['feeling'] === $user['feeling']) {
            $score += 40;
            $reasons[] = "Feeling {$user['feeling_emoji']} {$user['feeling']}";
        }

        // 2. Same department (weight: 30 points)
        if ($currentUser['department'] && $user['department'] && 
            strtolower($currentUser['department']) === strtolower($user['department'])) {
            $score += 30;
            $reasons[] = "Same department: {$user['department']}";
        }

        // 3. Same/nearby location (weight: up to 25 points)
        if ($currentUser['location_city'] && $user['location_city'] && 
            strtolower($currentUser['location_city']) === strtolower($user['location_city'])) {
            $score += 25;
            $reasons[] = "Same city: {$user['location_city']}";
        } elseif ($currentUser['location_lat'] && $currentUser['location_lng'] && 
                  $user['location_lat'] && $user['location_lng']) {
            // Haversine distance calculation
            $lat1 = deg2rad($currentUser['location_lat']);
            $lat2 = deg2rad($user['location_lat']);
            $deltaLat = deg2rad($user['location_lat'] - $currentUser['location_lat']);
            $deltaLng = deg2rad($user['location_lng'] - $currentUser['location_lng']);

            $a = sin($deltaLat/2) * sin($deltaLat/2) +
                 cos($lat1) * cos($lat2) *
                 sin($deltaLng/2) * sin($deltaLng/2);
            $c = 2 * atan2(sqrt($a), sqrt(1-$a));
            $distance = 6371 * $c; // km

            if ($distance < 10) {
                $score += 25;
                $reasons[] = "Nearby ({$distance:.1f} km away)";
            } elseif ($distance < 50) {
                $score += 15;
                $reasons[] = "In your area ({$distance:.0f} km away)";
            } elseif ($distance < 100) {
                $score += 5;
                $reasons[] = "Not too far ({$distance:.0f} km away)";
            }
        }

        // 4. Active poster bonus (weight: 5 points)
        if ($user['post_count'] > 5) {
            $score += 5;
            $reasons[] = "Active poster";
        }

        $user['match_score'] = $score;
        $user['match_reasons'] = $reasons;
    }
    unset($user);

    // Sort by match score descending
    usort($users, function($a, $b) {
        return $b['match_score'] <=> $a['match_score'];
    });

    // Return top 10 suggestions
    $suggestions = array_slice($users, 0, 10);

    jsonResponse(true, ['suggestions' => $suggestions]);

} catch (PDOException $e) {
    jsonResponse(false, [], 'Failed to fetch suggestions');
}
?>
