const connect = require('connect'),
  path = require('path'),
  serveStatic = require('serve-static'),
  exec = require('child_process').exec;

function runTests(){
  	return new Promise((res, rej) => {
  		try {
  			exec(`cypress run`, {}, (err) => {
  					if (err) {
  						rej(err);
  					} else {
  						res();
  					}
  			});
  		} catch (e) {
  			rej(e);
  		}
    });
  };

connect().use(serveStatic(path.join(__dirname,'./browser'))).listen(7357, function(){
    console.log('Server running on 7357...');
});

connect().use(serveStatic(path.join(__dirname,'../dist'))).listen(7356, function(){
    console.log('Server running on 7356...');
});


runTests().then(()=>{
  process.exit(0);
}).catch(()=>{
  process.exit(1);
});
