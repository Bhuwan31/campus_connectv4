<?php
require_once '../includes/config.php';
requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, [], 'Invalid request method');
}

$userId = getCurrentUserId();
$postId = filter_var($_POST['post_id'] ?? 0, FILTER_VALIDATE_INT);
$parentId = !empty($_POST['parent_id']) ? filter_var($_POST['parent_id'], FILTER_VALIDATE_INT) : null;
$content = sanitize($_POST['content'] ?? '');

if (!$postId || empty($content)) {
    jsonResponse(false, [], 'Post ID and content are required');
}

try {
    $db = getDB();

    // Verify post exists
    $stmt = $db->prepare("SELECT id FROM posts WHERE id = ?");
    $stmt->execute([$postId]);
    if (!$stmt->fetch()) {
        jsonResponse(false, [], 'Post not found');
    }

    // If parent_id provided, verify it exists and belongs to same post
    if ($parentId) {
        $stmt = $db->prepare("SELECT id FROM comments WHERE id = ? AND post_id = ?");
        $stmt->execute([$parentId, $postId]);
        if (!$stmt->fetch()) {
            jsonResponse(false, [], 'Parent comment not found');
        }
    }

    $stmt = $db->prepare("INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)");
    $stmt->execute([$postId, $userId, $parentId, $content]);

    $commentId = $db->lastInsertId();

    // Fetch the created comment with user info
    $stmt = $db->prepare("
        SELECT c.id, c.content, c.created_at, c.parent_id,
               u.id as user_id, u.name as user_name, u.profile_image as user_image
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
    ");
    $stmt->execute([$commentId]);
    $comment = $stmt->fetch();

    jsonResponse(true, ['comment' => $comment], 'Comment added successfully');

} catch (PDOException $e) {
    jsonResponse(false, [], 'Failed to add comment');
}
?>
