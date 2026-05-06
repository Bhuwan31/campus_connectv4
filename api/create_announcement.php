<?php
require_once '../includes/config.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, [], 'Invalid request method');
}

$adminId = getCurrentUserId();
$title = sanitize($_POST['title'] ?? '');
$content = sanitize($_POST['content'] ?? '');
$priority = in_array($_POST['priority'] ?? '', ['low', 'normal', 'high']) ? $_POST['priority'] : 'normal';

if (empty($title) || empty($content)) {
    jsonResponse(false, [], 'Title and content are required');
}

try {
    $db = getDB();
    $stmt = $db->prepare("INSERT INTO announcements (admin_id, title, content, priority) VALUES (?, ?, ?, ?)");
    $stmt->execute([$adminId, $title, $content, $priority]);

    jsonResponse(true, ['announcement_id' => $db->lastInsertId()], 'Announcement created');

} catch (PDOException $e) {
    jsonResponse(false, [], 'Failed to create announcement');
}
?>
