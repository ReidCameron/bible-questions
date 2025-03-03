function wrapUnhandledPromise(func, options = {}){
    console.log("Start unhandled promise wrapper")
    if(!(func instanceof Function)) {
        return new Promise((_,rej)=>{
            rej(`Expected argument of type 'Function', but received '${typeof func}'.`);
        })
    }

    options.waitTime = options.waitTime ?? 1500;

    //Promise for main thread
    var res; var rej;
    console.log("Creater promise wrapper")
    const promise = new Promise(async (resolve, reject)=>{
        res = resolve; rej = reject;
    })

    //Wait for func to resolve or die
    console.log("Start Timeout")
    const timeout = setTimeout(()=>{
        console.log("Complete Timeout")
        res(options.default);
    },options.waitTime);
    
    //Call dubious function
    console.log("Call Dubious function")
    func()
        .then(()=>{
            console.log("Dubious func resolved")
            res();
        })
        .catch(()=>{
            console.log("Dubious func rejected")
            rej();
        })
        .finally(()=>{
            console.log("Finally resolve dubious function and clear timeout")
            clearTimeout(timeout);
        });

    console.log("END unhandled promise wrapper")
    return promise;
}

module.exports = { wrapUnhandledPromise }