<?php
require_once '../includes/config.php';

session_destroy();
jsonResponse(true, [], 'Logged out successfully');
?>
