<?php
require_once '../includes/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, [], 'Invalid request method');
}

$name = sanitize($_POST['name'] ?? '');
$email = filter_var(trim($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL);
$password = $_POST['password'] ?? '';
$student_id = sanitize($_POST['student_id'] ?? '');
$location_city = sanitize($_POST['location_city'] ?? '');
$location_lat = filter_var($_POST['location_lat'] ?? null, FILTER_VALIDATE_FLOAT);
$location_lng = filter_var($_POST['location_lng'] ?? null, FILTER_VALIDATE_FLOAT);

if (empty($name) || empty($email) || empty($password) || empty($student_id)) {
    jsonResponse(false, [], 'All fields are required');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, [], 'Invalid email format');
}

if (strlen($password) < 6) {
    jsonResponse(false, [], 'Password must be at least 6 characters');
}

if (strlen($student_id) < 3) {
    jsonResponse(false, [], 'Student ID must be at least 3 characters');
}

try {
    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonResponse(false, [], 'Email already registered');
    }

    $stmt = $db->prepare("SELECT id FROM users WHERE student_id = ?");
    $stmt->execute([$student_id]);
    if ($stmt->fetch()) {
        jsonResponse(false, [], 'Student ID already registered. Each student ID can only be used once.');
    }

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $db->prepare("INSERT INTO users (name, email, password, student_id, location_city, location_lat, location_lng) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$name, $email, $hashedPassword, $student_id, $location_city, $location_lat, $location_lng]);

    $userId = $db->lastInsertId();

    $_SESSION['user_id'] = $userId;
    $_SESSION['user_name'] = $name;

    jsonResponse(true, ['user_id' => $userId, 'name' => $name], 'Registration successful');

} catch (PDOException $e) {
    jsonResponse(false, [], 'Registration failed: ' . $e->getMessage());
}
?>
