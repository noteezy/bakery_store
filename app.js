const http = require('http');
const fs = require('fs');
const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
	//fs.readFile('index.html', function(err, data) {
    res.writeHead(200, {'Content-Type': 'text/html'});
	res.write(req.url);
    //res.write(data);
    res.end();
  });
	
  // res.statusCode = 200;
  // res.setHeader('Content-Type', 'text/plain');
  // res.write(req.url);
  // res.end();
//});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});