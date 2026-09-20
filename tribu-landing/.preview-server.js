const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const port = 5177;
const types = {
  '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml',
  '.json':'application/json', '.ico':'image/x-icon', '.gif':'image/gif'
};
http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath.endsWith('/')) urlPath += 'index.html';
  let filePath = path.join(root, urlPath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Mimic the .htaccess perfil-publico rewrite for local testing
      if (/^\/[a-z0-9][a-z0-9-]*\/?$/.test(urlPath)) {
        const fallback = path.join(root, 'perfil-publico', 'index.html');
        fs.readFile(fallback, (err2, data2) => {
          if (err2) { res.writeHead(404); res.end('Not found: ' + urlPath); return; }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data2);
        });
        return;
      }
      res.writeHead(404); res.end('Not found: ' + urlPath); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log('Listening on ' + port));
