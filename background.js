// Handle wake lock requests
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "requestWakeLock") {
        chrome.power.requestKeepAwake('display', function() {
            sendResponse({status: "success"});
        });
        return true;
    }
    
    if (request.action === "releaseWakeLock") {
        chrome.power.releaseKeepAwake(function() {
            sendResponse({status: "success"});
        });
        return true;
    }
}); 