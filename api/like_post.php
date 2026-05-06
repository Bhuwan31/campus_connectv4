<?php
require_once '../includes/config.php';
requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, [], 'Invalid request method');
}

$userId = getCurrentUserId();
$postId = filter_var($_POST['post_id'] ?? 0, FILTER_VALIDATE_INT);

if (!$postId) {
    jsonResponse(false, [], 'Post ID is required');
}

try {
    $db = getDB();

    // Check if already liked
    $stmt = $db->prepare("SELECT id FROM likes WHERE post_id = ? AND user_id = ?");
    $stmt->execute([$postId, $userId]);

    if ($stmt->fetch()) {
        // Unlike
        $stmt = $db->prepare("DELETE FROM likes WHERE post_id = ? AND user_id = ?");
        $stmt->execute([$postId, $userId]);
        $liked = false;
    } else {
        // Like
        $stmt = $db->prepare("INSERT INTO likes (post_id, user_id) VALUES (?, ?)");
        $stmt->execute([$postId, $userId]);
        $liked = true;
    }

    // Get new like count
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM likes WHERE post_id = ?");
    $stmt->execute([$postId]);
    $count = $stmt->fetch()['count'];

    jsonResponse(true, ['liked' => $liked, 'like_count' => $count]);

} catch (PDOException $e) {
    jsonResponse(false, [], 'Failed to process like');
}
?>
