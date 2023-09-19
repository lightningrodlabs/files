onmessage = function(event) {
    console.log('Main thread said: ' + event);
    postMessage('Hello, main thread!');
};
