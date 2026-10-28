const { spawn } = require('child_process');

const path = require('path');

const fs = require('fs');

const PHP_CANDIDATES = [
  process.env.PHP_BIN,
  '/Applications/XAMPP/xamppfiles/bin/php',
  '/opt/homebrew/bin/php',
  '/usr/local/bin/php',
  '/usr/bin/php',
  'php'
].filter(Boolean);

let resolvedPhpBin = null;
for (const cand of PHP_CANDIDATES) {
  if (cand === 'php' || fs.existsSync(cand)) {
    resolvedPhpBin = cand;
    break;
  }
}

if (!resolvedPhpBin) {
  resolvedPhpBin = '/Applications/XAMPP/xamppfiles/bin/php';
}

const PHP_QUERY_ENGINE = path.join(__dirname, '..', 'php', 'query_engine.php');

/**
 * Universal PHP Dispatcher Middleware
 * Intercepts incoming HTTP requests and pipes them directly to the PHP PDO Query Engine.
 */
function phpDispatcher(req, res, next) {
  if (req.originalUrl.startsWith('/api/ai')) {
    return next();
  }

  const queryParams = new URLSearchParams(req.query).toString();
  const fullUri = req.baseUrl + req.path + (queryParams ? `?${queryParams}` : '');

  let authHeader = req.headers['authorization'] || (req.query && req.query.token ? `Bearer ${req.query.token}` : '');
  if (!authHeader && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const c of cookies) {
      const [name, val] = c.trim().split('=');
      if (name === 'xmed_token') {
        authHeader = `Bearer ${decodeURIComponent(val)}`;
        break;
      }
    }
  }

  const env = Object.assign({}, process.env, {
    REQUEST_METHOD: req.method,
    REQUEST_URI: fullUri,
    HTTP_AUTHORIZATION: authHeader,
    HTTP_COOKIE: req.headers.cookie || '',
    CONTENT_TYPE: req.headers['content-type'] || 'application/json'
  });

  const phpProcess = spawn(resolvedPhpBin, [PHP_QUERY_ENGINE], { env });

  let stdoutData = '';
  let stderrData = '';

  if (req.body && Object.keys(req.body).length > 0) {
    phpProcess.stdin.write(JSON.stringify(req.body));
  }
  phpProcess.stdin.end();

  phpProcess.stdout.on('data', (chunk) => {
    stdoutData += chunk.toString();
  });

  phpProcess.stderr.on('data', (chunk) => {
    stderrData += chunk.toString();
  });

  phpProcess.on('close', (code) => {
    if (stderrData && !stdoutData) {
      console.error('[PHP Query Engine stderr]:', stderrData);
    }

    if (!stdoutData) {
      return res.status(500).json({
        success: false,
        error: 'PHP_DISPATCH_FAILURE',
        message: stderrData || 'No response returned by PHP backend engine.'
      });
    }

    try {
      const parsed = JSON.parse(stdoutData.trim());

      let statusCode = parsed.http_status || 200;

      delete parsed.http_status;

      return res.status(statusCode).json(parsed);
    } catch (e) {
      return res.type('application/json').send(stdoutData);
    }
  });

  phpProcess.on('error', (err) => {
    console.error('[PHP Dispatcher Spawn Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'PHP_EXECUTION_ERROR',
      message: err.message
    });
  });
}

module.exports = {
  phpDispatcher,
  resolvedPhpBin
};
