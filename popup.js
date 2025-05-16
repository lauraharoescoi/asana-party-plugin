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

// PARTY MODE button
document.getElementById('party-mode').addEventListener('click', function() {
    console.log('PARTY MODE activated!');
    
    // Animate the button to make it more fun
    this.textContent = '🎵 PARTY ON! 🎵';
    this.style.animation = 'gradient 1s ease infinite';
    
    // Get the active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
            // Send message to content script
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "activatePartyMode"
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message:', chrome.runtime.lastError);
                    document.getElementById('party-mode').textContent = 'Error: Not on Asana page';
                } else {
                    console.log('Party mode activated successfully');
                }
            });
        }
    });
    
    // Reset button after a delay
    setTimeout(() => {
        document.getElementById('party-mode').textContent = '🎊 PARTY MODE 🎊';
    }, 3000);
});

// Log when the popup is fully loaded
window.addEventListener('load', () => {
    console.log('Popup fully loaded');
}); 