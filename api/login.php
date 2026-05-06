<?php
require_once '../includes/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, [], 'Invalid request method');
}

$email = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
$password = $_POST['password'] ?? '';

if (empty($email) || empty($password)) {
    jsonResponse(false, [], 'Email and password are required');
}

try {
    $db = getDB();
    $stmt = $db->prepare("SELECT id, name, email, password, profile_image, bio, department, student_id, is_admin, location_city, feeling, feeling_emoji FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        jsonResponse(false, [], 'Invalid email or password');
    }

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['name'];
    $_SESSION['is_admin'] = $user['is_admin'];

    unset($user['password']);

    jsonResponse(true, ['user' => $user], 'Login successful');

} catch (PDOException $e) {
    jsonResponse(false, [], 'Login failed');
}
?>
