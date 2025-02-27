function wrapUnhandledPromise(func, options = {}){
    if(!(func instanceof Function)) {
        return new Promise((_,rej)=>{
            rej(`Expected argument of type 'Function', but received '${typeof func}'.`);
        })
    }

    options.waitTime = options.waitTime ?? 1500;

    //Promise for main thread
    var res; var rej;
    const promise = new Promise(async (resolve, reject)=>{
        res = resolve; rej = reject;
    })

    //Wait for func to resolve or die
    const timeout = setTimeout(()=>{res(options.default)},options.waitTime);
    
    //Call dubious function
    func().then(res).catch(rej).finally(()=>{clearTimeout(timeout)});

    return promise;
}

module.exports = { wrapUnhandledPromise }