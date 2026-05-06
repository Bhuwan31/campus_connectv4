<?php
require_once '../includes/config.php';

if (isLoggedIn()) {
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT id, name, email, profile_image, is_admin, feeling, feeling_emoji, location_city FROM users WHERE id = ?");
        $stmt->execute([getCurrentUserId()]);
        $user = $stmt->fetch();

        if ($user) {
            jsonResponse(true, ['user' => $user, 'authenticated' => true, 'is_admin' => (bool)$user['is_admin']]);
        }
    } catch (PDOException $e) {
        // Fall through to unauthenticated
    }
}

jsonResponse(true, ['authenticated' => false]);
?>
