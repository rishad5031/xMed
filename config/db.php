<?php
if (!function_exists('loadEnvFile')) {
    function loadEnvFile($path) {
        if (!file_exists($path)) return;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) continue;
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value, " \t\n\r\0\x0B\"'");
                if (getenv($name) === false) {
                    putenv("{$name}={$value}");
                    $_ENV[$name] = $value;
                    $_SERVER[$name] = $value;
                }
            }
        }
    }
}

loadEnvFile(dirname(__DIR__) . '/.env');

$db_host = getenv('DB_HOST') ?: '127.0.0.1';
$db_port = getenv('DB_PORT') ?: '3306';
$db_name = getenv('DB_NAME') ?: 'xmed_db';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : (getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');
$db_charset = 'utf8mb4';

$pdo_options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
    PDO::ATTR_TIMEOUT            => 3,
];

$pdo = null;

function createPDOConnection() {
    global $db_host, $db_port, $db_name, $db_charset, $db_user, $db_pass, $pdo_options;

    $strategies = [
        "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset={$db_charset}",
        "mysql:host=localhost;dbname={$db_name};charset={$db_charset}",
        "mysql:unix_socket=/tmp/mysql.sock;dbname={$db_name};charset={$db_charset}",
        "mysql:unix_socket=/var/mysql/mysql.sock;dbname={$db_name};charset={$db_charset}",
        "mysql:unix_socket=/private/tmp/mysql.sock;dbname={$db_name};charset={$db_charset}",
        "mysql:unix_socket=/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock;dbname={$db_name};charset={$db_charset}",
        "mysql:unix_socket=/Applications/MAMP/tmp/mysql/mysql.sock;dbname={$db_name};charset={$db_charset}",
        "mysql:unix_socket=/opt/homebrew/var/mysql/mysql.sock;dbname={$db_name};charset={$db_charset}",
        "mysql:unix_socket=/usr/local/var/mysql/mysql.sock;dbname={$db_name};charset={$db_charset}",
        "mysql:unix_socket=/var/run/mysqld/mysqld.sock;dbname={$db_name};charset={$db_charset}"
    ];

    $lastException = null;

    foreach ($strategies as $dsn) {
        if (strpos($dsn, 'unix_socket=') !== false) {
            preg_match('/unix_socket=([^;]+)/', $dsn, $m);
            if (!empty($m[1]) && !file_exists($m[1])) {
                continue;
            }
        }

        try {
            $conn = new PDO($dsn, $db_user, $db_pass, $pdo_options);
            $conn->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci");
            return $conn;
        } catch (PDOException $e) {
            $lastException = $e;
            continue;
        }
    }

    if ($lastException) {
        error_log("[xMED Database Error] PDO Connection failed: " . $lastException->getMessage());
        throw $lastException;
    }

    throw new PDOException("Unable to connect to MySQL database {$db_name}.");
}

try {
    $pdo = createPDOConnection();
} catch (PDOException $e) {
}

function getPDO() {
    global $pdo;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $pdo = createPDOConnection();
    return $pdo;
}
?>
