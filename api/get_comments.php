<?php
require_once '../includes/config.php';
requireAuth();

$postId = filter_var($_GET['post_id'] ?? 0, FILTER_VALIDATE_INT);

if (!$postId) {
    jsonResponse(false, [], 'Post ID is required');
}

try {
    $db = getDB();

    // Get all comments for the post
    $stmt = $db->prepare("
        SELECT c.id, c.content, c.created_at, c.parent_id,
               u.id as user_id, u.name as user_name, u.profile_image as user_image
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    ");
    $stmt->execute([$postId]);
    $comments = $stmt->fetchAll();

    // Organize into nested structure
    $commentMap = [];
    $rootComments = [];

    foreach ($comments as $comment) {
        $comment['replies'] = [];
        $commentMap[$comment['id']] = $comment;
    }

    foreach ($commentMap as $id => $comment) {
        if ($comment['parent_id'] && isset($commentMap[$comment['parent_id']])) {
            $commentMap[$comment['parent_id']]['replies'][] = &$commentMap[$id];
        } else {
            $rootComments[] = &$commentMap[$id];
        }
    }

    jsonResponse(true, ['comments' => $rootComments]);

} catch (PDOException $e) {
    jsonResponse(false, [], 'Failed to fetch comments');
}
?>
