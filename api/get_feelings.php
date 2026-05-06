<?php
require_once '../includes/config.php';

// No auth required - public endpoint
jsonResponse(true, ['feelings' => getFeelings()]);
?>
