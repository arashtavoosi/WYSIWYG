const fs = require('fs');
const http = require('http');
const path = require('path');

const port = Number(process.env.PORT) || 4173;
const root = path.resolve(__dirname, '..');
const directories = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock-files.json'), 'utf8'));
const types = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain'
};

function send(response, status, type, body) {
    response.writeHead(status, {
        'Cache-Control': 'no-store',
        'Content-Type': type + '; charset=utf-8'
    });
    response.end(body);
}

http.createServer(function (request, response) {
    const url = new URL(request.url, 'http://localhost');

    if (url.pathname === '/files') {
        const requestedPath = url.searchParams.get('path') || '/';
        const directory = directories[requestedPath];

        if (!directory) {
            send(response, 404, 'application/json', JSON.stringify({ error: 'Directory not found' }));
            return;
        }

        send(response, 200, 'application/json', JSON.stringify(Object.assign({ path: requestedPath }, directory)));
        return;
    }

    const relativePath = decodeURIComponent(url.pathname === '/' ? '/demos/wysiwyg-v1.html' : url.pathname);
    const filePath = path.resolve(root, '.' + relativePath);

    if (filePath.indexOf(root + path.sep) !== 0) {
        send(response, 403, 'text/plain', 'Forbidden');
        return;
    }

    fs.readFile(filePath, function (error, body) {
        if (error) {
            send(response, error.code === 'ENOENT' ? 404 : 500, 'text/plain', 'Not found');
            return;
        }

        send(response, 200, types[path.extname(filePath)] || 'application/octet-stream', body);
    });
}).listen(port, function () {
    console.log('Demo: http://localhost:' + port + '/demos/wysiwyg-v1.html');
});
