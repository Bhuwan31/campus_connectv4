<?php
/**
 * Campus Connect - Database Configuration
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'campus_connectv3');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Upload settings
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('UPLOAD_URL', 'uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB

// Session settings
session_start();

/**
 * Get PDO database connection
 */
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database connection failed']);
            exit;
        }
    }
    return $pdo;
}

/**
 * Send JSON response
 */
function jsonResponse($success, $data = [], $message = '') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $data));
    exit;
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

/**
 * Require authentication
 */
function requireAuth() {
    if (!isLoggedIn()) {
        jsonResponse(false, [], 'Authentication required');
    }
}

/**
 * Check if current user is admin
 */
function isAdmin() {
    if (!isLoggedIn()) return false;
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT is_admin FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        return $user && $user['is_admin'] == 1;
    } catch (PDOException $e) {
        return false;
    }
}

/**
 * Require admin access
 */
function requireAdmin() {
    requireAuth();
    if (!isAdmin()) {
        jsonResponse(false, [], 'Admin access required');
    }
}

/**
 * Get current user ID
 */
function getCurrentUserId() {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Sanitize input
 */
function sanitize($input) {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

/**
 * Validate image upload
 */
function validateImage($file) {
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        return ['valid' => false, 'error' => 'Upload failed'];
    }

    if ($file['size'] > MAX_FILE_SIZE) {
        return ['valid' => false, 'error' => 'File too large (max 5MB)'];
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedTypes)) {
        return ['valid' => false, 'error' => 'Invalid file type. Only images allowed'];
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExts)) {
        return ['valid' => false, 'error' => 'Invalid file extension'];
    }

    if (!getimagesize($file['tmp_name'])) {
        return ['valid' => false, 'error' => 'Invalid image file'];
    }

    return ['valid' => true, 'ext' => $ext];
}

/**
 * Generate unique filename
 */
function generateFilename($ext) {
    return uniqid() . '_' . time() . '.' . $ext;
}

/**
 * Available feelings/stickers
 */
function getFeelings() {
    return [
        ['name' => 'Happy', 'emoji' => '😊'],
        ['name' => 'Excited', 'emoji' => '🤩'],
        ['name' => 'Loved', 'emoji' => '🥰'],
        ['name' => 'Blessed', 'emoji' => '🙏'],
        ['name' => 'Grateful', 'emoji' => '😇'],
        ['name' => 'Sad', 'emoji' => '😢'],
        ['name' => 'Angry', 'emoji' => '😠'],
        ['name' => 'Confused', 'emoji' => '😕'],
        ['name' => 'Tired', 'emoji' => '😴'],
        ['name' => 'Sick', 'emoji' => '🤒'],
        ['name' => 'Studying', 'emoji' => '📚'],
        ['name' => 'Partying', 'emoji' => '🎉'],
        ['name' => 'Traveling', 'emoji' => '✈️'],
        ['name' => 'Eating', 'emoji' => '🍕'],
        ['name' => 'Gaming', 'emoji' => '🎮'],
        ['name' => 'Working Out', 'emoji' => '💪'],
        ['name' => 'Coding', 'emoji' => '💻'],
        ['name' => 'Listening to Music', 'emoji' => '🎵'],
        ['name' => 'Watching Movie', 'emoji' => '🎬'],
        ['name' => 'Reading', 'emoji' => '📖'],
    ];
}
?>
