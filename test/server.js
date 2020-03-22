const connect = require('connect'),
  path = require('path'),
  serveStatic = require('serve-static'),
  ncp = require('ncp').ncp,
  exec = require('child_process').exec;

function startServer(){
  connect().use(serveStatic(path.join(__dirname,'./browser'))).listen(7357, function(){
      console.log('Test server running on 7357...');
  });
}

ncp(path.join(__dirname,'../dist'), path.join(__dirname,'browser/dist'), function (err) {
 if (err) {
   console.error(err);
   process.exit(1);
 }
 startServer();
});
