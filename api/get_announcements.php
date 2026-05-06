<?php
require_once '../includes/config.php';
requireAuth();

try {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT a.id, a.title, a.content, a.priority, a.created_at,
               u.name as admin_name, u.profile_image as admin_image
        FROM announcements a
        JOIN users u ON a.admin_id = u.id
        ORDER BY 
            FIELD(a.priority, 'high', 'normal', 'low'),
            a.created_at DESC
        LIMIT 10
    ");
    $stmt->execute();
    $announcements = $stmt->fetchAll();

    jsonResponse(true, ['announcements' => $announcements]);

} catch (PDOException $e) {
    jsonResponse(false, [], 'Failed to fetch announcements');
}
?>
