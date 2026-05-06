<?php
require_once '../includes/config.php';
requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, [], 'Invalid request method');
}

$userId = getCurrentUserId();
$content = sanitize($_POST['content'] ?? '');
$feeling = sanitize($_POST['feeling'] ?? '');
$feeling_emoji = sanitize($_POST['feeling_emoji'] ?? '');
$location_city = sanitize($_POST['location_city'] ?? '');
$location_lat = filter_var($_POST['location_lat'] ?? null, FILTER_VALIDATE_FLOAT);
$location_lng = filter_var($_POST['location_lng'] ?? null, FILTER_VALIDATE_FLOAT);

if (empty($content)) {
    jsonResponse(false, [], 'Post content is required');
}

try {
    $db = getDB();
    $image = null;

    // Handle image upload
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $validation = validateImage($_FILES['image']);
        if (!$validation['valid']) {
            jsonResponse(false, [], $validation['error']);
        }

        $filename = generateFilename($validation['ext']);
        $uploadPath = UPLOAD_DIR . $filename;

        if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadPath)) {
            $image = $filename;
        }
    }

    $stmt = $db->prepare("INSERT INTO posts (user_id, content, image, feeling, feeling_emoji, location_city, location_lat, location_lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$userId, $content, $image, $feeling, $feeling_emoji, $location_city, $location_lat, $location_lng]);

    $postId = $db->lastInsertId();

    jsonResponse(true, ['post_id' => $postId], 'Post created successfully');

} catch (PDOException $e) {
    jsonResponse(false, [], 'Failed to create post');
}
?>
