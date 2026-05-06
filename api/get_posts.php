<?php
require_once '../includes/config.php';
requireAuth();

try {
    $db = getDB();
    $userId = getCurrentUserId();

    $stmt = $db->prepare("
        SELECT 
            p.id, p.content, p.image, p.feeling, p.feeling_emoji, 
            p.location_city, p.location_lat, p.location_lng, p.created_at,
            u.id as user_id, u.name as user_name, u.profile_image as user_image,
            u.location_city as user_location_city, u.location_lat as user_location_lat, u.location_lng as user_location_lng,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
            EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) as user_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
    ");
    $stmt->execute([$userId]);
    $posts = $stmt->fetchAll();

    jsonResponse(true, ['posts' => $posts]);

} catch (PDOException $e) {
    jsonResponse(false, [], 'Failed to fetch posts');
}
?>
