console.log("Hello there!")
const form = document.querySelector('form');
if(form){
    form.addEventListener('submit', ()=>{
        const val = form.querySelector('input')?.value;
        if(val){
            window.location.assign('/string/' + val)
        }
        
    })
}