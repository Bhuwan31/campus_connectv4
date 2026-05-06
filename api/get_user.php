<?php
require_once '../includes/config.php';
requireAuth();

try {
    $db = getDB();
    $userId = getCurrentUserId();

    $stmt = $db->prepare("
        SELECT u.id, u.name, u.email, u.bio, u.department, u.profile_image, 
               u.student_id, u.is_admin, u.location_city, u.location_lat, u.location_lng,
               u.feeling, u.feeling_emoji, u.created_at,
               (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count
        FROM users u 
        WHERE u.id = ?
    ");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(false, [], 'User not found');
    }

    jsonResponse(true, ['user' => $user]);

} catch (PDOException $e) {
    jsonResponse(false, [], 'Failed to fetch user');
}
?>
