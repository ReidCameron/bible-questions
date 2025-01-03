const { app } = require('./server/server')
const port = 8888;
app.listen(port,()=>{
    console.log(`\n          -----------\x1b[32mServer Running on port ${port}\x1b[0m----------`);
    console.log('          ------------------------------------------------');
    console.log(`          |                                              |`);
    console.log(`          |            http://localhost:${port}/            |`);
    console.log(`          |                                              |`);
    console.log('          ------------------------------------------------\n');
});