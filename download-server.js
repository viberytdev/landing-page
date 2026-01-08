const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.DOWNLOAD_PORT || 3001;
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

const server = http.createServer((req, res) => {
  // Enable CORS for testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Route for downloading app.exe
  if (req.url === '/downloads/app.exe' && req.method === 'GET') {
    const filePath = path.join(DOWNLOADS_DIR, 'app.exe');

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found' }));
      return;
    }

    // Set headers for file download
    const stat = fs.statSync(filePath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'attachment; filename="app.exe"');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('File streaming error:', err);
      res.writeHead(500);
      res.end('Server error');
    });
    return;
  }

  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', port: PORT }));
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`📥 Download server running at http://localhost:${PORT}`);
  console.log(`🔗 Download app.exe at: http://localhost:${PORT}/downloads/app.exe`);
  console.log(`🏥 Health check at: http://localhost:${PORT}/health`);
});
