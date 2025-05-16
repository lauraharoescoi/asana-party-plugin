console.log('Popup script loaded');

document.getElementById('show-hacking').addEventListener('click', function() {
    console.log('Button clicked, sending message to content script');
    
    // Get the text from input, or use default if empty
    const textInput = document.getElementById('hacking-text');
    const celebrationText = textInput.value.trim() || 'doing stuff...';
    
    // Get the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            // Send message to content script
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "showGif",
                text: celebrationText
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message:', chrome.runtime.lastError);
                    document.getElementById('show-hacking').textContent = 'Error: Not on Asana page';
                } else {
                    console.log('Message sent successfully');
                }
            });
        }
    });
});

// Log when the popup is fully loaded
window.addEventListener('load', () => {
    console.log('Popup fully loaded');
}); 