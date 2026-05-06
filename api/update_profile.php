<?php
require_once '../includes/config.php';
requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, [], 'Invalid request method');
}

$userId = getCurrentUserId();
$name = sanitize($_POST['name'] ?? '');
$bio = sanitize($_POST['bio'] ?? '');
$department = sanitize($_POST['department'] ?? '');
$feeling = sanitize($_POST['feeling'] ?? '');
$feeling_emoji = sanitize($_POST['feeling_emoji'] ?? '');
$location_city = sanitize($_POST['location_city'] ?? '');
$location_lat = filter_var($_POST['location_lat'] ?? null, FILTER_VALIDATE_FLOAT);
$location_lng = filter_var($_POST['location_lng'] ?? null, FILTER_VALIDATE_FLOAT);

if (empty($name)) {
    jsonResponse(false, [], 'Name is required');
}

try {
    $db = getDB();

    // Handle profile image upload
    $profileImage = null;
    if (isset($_FILES['profile_image']) && $_FILES['profile_image']['error'] === UPLOAD_ERR_OK) {
        $validation = validateImage($_FILES['profile_image']);
        if (!$validation['valid']) {
            jsonResponse(false, [], $validation['error']);
        }

        $filename = generateFilename($validation['ext']);
        $uploadPath = UPLOAD_DIR . $filename;

        if (move_uploaded_file($_FILES['profile_image']['tmp_name'], $uploadPath)) {
            $profileImage = $filename;

            $stmt = $db->prepare("SELECT profile_image FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $old = $stmt->fetch();
            if ($old && $old['profile_image'] !== 'default-avatar.png' && file_exists(UPLOAD_DIR . $old['profile_image'])) {
                unlink(UPLOAD_DIR . $old['profile_image']);
            }
        }
    }

    if ($profileImage) {
        $stmt = $db->prepare("UPDATE users SET name = ?, bio = ?, department = ?, feeling = ?, feeling_emoji = ?, location_city = ?, location_lat = ?, location_lng = ?, profile_image = ? WHERE id = ?");
        $stmt->execute([$name, $bio, $department, $feeling, $feeling_emoji, $location_city, $location_lat, $location_lng, $profileImage, $userId]);
    } else {
        $stmt = $db->prepare("UPDATE users SET name = ?, bio = ?, department = ?, feeling = ?, feeling_emoji = ?, location_city = ?, location_lat = ?, location_lng = ? WHERE id = ?");
        $stmt->execute([$name, $bio, $department, $feeling, $feeling_emoji, $location_city, $location_lat, $location_lng, $userId]);
    }

    $stmt = $db->prepare("SELECT id, name, email, bio, department, profile_image, student_id, is_admin, feeling, feeling_emoji, location_city, location_lat, location_lng FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    $_SESSION['user_name'] = $user['name'];

    jsonResponse(true, ['user' => $user], 'Profile updated successfully');

} catch (PDOException $e) {
    jsonResponse(false, [], 'Update failed');
}
?>
