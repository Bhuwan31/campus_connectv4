<?php
require_once '../includes/config.php';
requireAuth();

$userId = filter_var($_GET['user_id'] ?? 0, FILTER_VALIDATE_INT);

if (!$userId) {
    jsonResponse(false, [], 'User ID required');
}

try {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT id, name, bio, department, profile_image, student_id, 
               feeling, feeling_emoji, location_city, created_at, is_admin
        FROM users WHERE id = ?
    ");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(false, [], 'User not found');
    }

    // Get user's posts with feelings and location
    $stmt = $db->prepare("
        SELECT p.*, 
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
               (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count
        FROM posts p WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 20
    ");
    $stmt->execute([$userId]);
    $posts = $stmt->fetchAll();

    jsonResponse(true, ['user' => $user, 'posts' => $posts]);

} catch (PDOException $e) {
    jsonResponse(false, [], 'Failed to fetch profile');
}
?>
