// content.js
console.log('%c Asana Celebrations Plugin Loaded! ', 'background: #9b59b6; color: white; font-size: 16px; padding: 5px; border-radius: 5px;');

// Also log to make sure content.js is executing properly
try {
  document.body.dataset.asanaCelebrationsLoaded = 'true';
  console.log('Plugin initialization started - DOM marker added');
} catch (err) {
  console.error('Plugin initialization error:', err);
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Message received in content script:', request);
  
  if (request.action === "showCelebration") {
    console.log('Showing celebration from popup request');
    // Show a large celebration
    showCelebration("xlarge", "P1 - Urgent", "Tech");
    sendResponse({status: "success"});
  }
  
  if (request.action === "showGif") {
    console.log('Showing GIF from popup request');
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 999999; display: flex; justify-content: center; align-items: center;';
    
    const gif = document.createElement('img');
    gif.src = chrome.runtime.getURL('celebrations/hacking.gif');
    gif.style.cssText = 'width: 70%; height: 70%; object-fit: contain;';
    
    const textOverlay = document.createElement('div');
    textOverlay.textContent = request.text || 'doing stuff...';
    textOverlay.style.cssText = 'position: absolute; bottom: 50%; left: 50%; transform: translateX(-50%); color: white; font-size: 32px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
    
    // Request screen wake lock
    chrome.runtime.sendMessage({action: "requestWakeLock"}, function(response) {
        console.log('Wake lock requested:', response);
    });
    
    // Add click handler to close the overlay
    overlay.addEventListener('click', () => {
        // Release wake lock when closing
        chrome.runtime.sendMessage({action: "releaseWakeLock"}, function(response) {
            console.log('Wake lock released:', response);
        });
        overlay.remove();
    });
    
    overlay.appendChild(gif);
    overlay.appendChild(textOverlay);
    document.body.appendChild(overlay);
    
    sendResponse({status: "success"});
  }
  
  if (request.action === "activatePartyMode") {
    console.log('Party mode activated from popup request');
    startPartyMode();
    sendResponse({status: "success"});
  }
  
  return true; // Keep the message channel open for async response
});

// Party Mode variables
let partyModeActive = false;
let partyModeInterval = null;
let discoLights = [];
let musicElement = null;

/**
 * Starts the party mode in Asana
 */
function startPartyMode() {
  if (partyModeActive) return; // Already in party mode
  partyModeActive = true;
  
  // Create the party overlay container
  const partyContainer = document.createElement('div');
  partyContainer.id = 'asana-party-container';
  partyContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 99999; overflow: hidden;';
  document.body.appendChild(partyContainer);
  
  // Create a click capture layer (with pointer-events enabled) for the entire screen
  const clickLayer = document.createElement('div');
  clickLayer.id = 'party-click-layer';
  clickLayer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: transparent; z-index: 99998; cursor: pointer; pointer-events: auto;';
  partyContainer.appendChild(clickLayer);
  
  // Add click event to close party mode when clicking anywhere
  clickLayer.addEventListener('click', stopPartyMode);
  
  // Display a brief message to let users know they can click anywhere to stop
  const clickMessage = document.createElement('div');
  clickMessage.textContent = 'Click anywhere to stop the party';
  clickMessage.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); padding: 8px 16px; background: rgba(0,0,0,0.6); color: white; border-radius: 20px; font-size: 14px; pointer-events: none; z-index: 999999; opacity: 0; transition: opacity 0.5s;';
  partyContainer.appendChild(clickMessage);
  
  // Show the message after a short delay and fade it out
  setTimeout(() => {
    clickMessage.style.opacity = '1';
    setTimeout(() => {
      clickMessage.style.opacity = '0';
    }, 3000);
  }, 1000);
  
  // Create disco lights
  createDiscoLights(partyContainer);
  
  // Start floating emojis
  createFloatingEmojis(partyContainer);
  
  // Create background music (if allowed by browser)
  try {
    musicElement = document.createElement('audio');
    musicElement.src = chrome.runtime.getURL('celebrations/party-music.mp3');
    musicElement.volume = 0.5;
    musicElement.loop = true;
    document.body.appendChild(musicElement);
    
    // Need user interaction to play audio in most browsers
    const playMusicButton = document.createElement('button');
    playMusicButton.textContent = '🔊 PLAY MUSIC';
    playMusicButton.style.cssText = 'position: fixed; bottom: 20px; left: 20px; padding: 10px 15px; background: #3366ff; color: white; border: none; border-radius: 20px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.3); z-index: 999999; pointer-events: auto;';
    partyContainer.appendChild(playMusicButton);
    
    playMusicButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent the event from reaching the click layer
      musicElement.play()
        .then(() => {
          playMusicButton.style.display = 'none';
        })
        .catch(err => {
          console.error('Could not play music:', err);
          playMusicButton.textContent = '❌ MUSIC BLOCKED';
        });
    });
  } catch (e) {
    console.error('Could not create audio element:', e);
  }
  
  // Apply party effects to Asana UI
  partyModeInterval = setInterval(pulseAsanaElements, 1000);
  
  // Show confetti
  showConfetti();
  
  // Add a random celebration every 10 seconds
  setTimeout(() => {
    if (partyModeActive) {
      showGifCelebrations(5, 'celebrations', true);
    }
  }, 2000);
  
  const partyInterval = setInterval(() => {
    if (partyModeActive) {
      showGifCelebrations(3, 'celebrations', true);
    } else {
      clearInterval(partyInterval);
    }
  }, 10000);
}

/**
 * Stops the party mode and cleans up all elements
 */
function stopPartyMode() {
  if (!partyModeActive) return;
  
  partyModeActive = false;
  
  // Clear interval
  if (partyModeInterval) {
    clearInterval(partyModeInterval);
    partyModeInterval = null;
  }
  
  // Stop music
  if (musicElement) {
    musicElement.pause();
    musicElement.remove();
    musicElement = null;
  }
  
  // Remove all disco lights
  discoLights.forEach(light => {
    if (light.parentNode) {
      light.remove();
    }
  });
  discoLights = [];
  
  // Remove all party elements
  const partyContainer = document.getElementById('asana-party-container');
  if (partyContainer) {
    partyContainer.remove();
  }
  
  // Remove all floating GIFs
  removeAllGifCelebrations();
  
  // Remove confetti
  const confettiContainer = document.querySelector('.confetti-container');
  if (confettiContainer) {
    confettiContainer.remove();
  }
  
  // Remove any style elements added for animations
  document.querySelectorAll('style[id^="party-"]').forEach(style => {
    style.remove();
  });
  
  // Reset any modified Asana UI elements
  document.querySelectorAll('.asana-party-modified').forEach(el => {
    el.classList.remove('asana-party-modified');
    el.style.animation = '';
    el.style.transform = '';
    el.style.transition = '';
    // Reset any other style properties that might have been modified
    el.style.filter = '';
    el.style.borderRadius = '';
    el.style.border = '';
    el.style.boxShadow = '';
  });
  
  // Add a nice exit effect
  const exitElement = document.createElement('div');
  exitElement.textContent = 'Party Over!';
  exitElement.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 60px; color: white; text-shadow: 0 0 10px #ff0099; z-index: 9999; opacity: 0; animation: fadeInOut 2s forwards; pointer-events: none;';
  document.body.appendChild(exitElement);
  
  // Add the keyframe animation
  const style = document.createElement('style');
  style.id = 'party-exit-animation';
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(2); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
    }
  `;
  document.head.appendChild(style);
  
  // Remove exit element after animation
  setTimeout(() => {
    exitElement.remove();
    style.remove();
    
    // Final cleanup check - ensure no celebration elements are left
    document.querySelectorAll('.floating-celebration-gif, .disco-light, [id^="asana-party"], [id^="party-"]').forEach(el => {
      if (el.parentNode) el.remove();
    });
  }, 2000);
}

/**
 * Creates colorful disco lights
 */
function createDiscoLights(container) {
  const lightColors = ['#ff3366', '#ff6633', '#ffcc33', '#33cc33', '#3366ff', '#cc33ff', '#ff00cc'];
  
  // Create multiple light sources
  for (let i = 0; i < 7; i++) {
    const light = document.createElement('div');
    light.className = 'disco-light';
    light.style.cssText = `
      position: absolute;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: ${lightColors[i % lightColors.length]};
      filter: blur(40px);
      opacity: 0.7;
      mix-blend-mode: screen;
      pointer-events: none;
      z-index: 1;
      animation: moveLight${i} 8s infinite alternate;
    `;
    
    // Add custom animation for each light
    const style = document.createElement('style');
    const xStart = Math.random() * 100;
    const yStart = Math.random() * 100;
    const xEnd = Math.random() * 100;
    const yEnd = Math.random() * 100;
    
    style.textContent = `
      @keyframes moveLight${i} {
        0% { transform: translate(${xStart}vw, ${yStart}vh) scale(1); }
        50% { transform: translate(${(xStart + xEnd) / 2}vw, ${(yStart + yEnd) / 2}vh) scale(2); }
        100% { transform: translate(${xEnd}vw, ${yEnd}vh) scale(1); }
      }
    `;
    
    document.head.appendChild(style);
    container.appendChild(light);
    discoLights.push(light);
  }
}

/**
 * Creates floating party emojis
 */
function createFloatingEmojis(container) {
  const emojis = ['🎉', '🎊', '🎵', '🎸', '🎷', '🎺', '🥁', '💃', '🕺', '✨', '🎤'];
  
  // Create 20 floating emojis
  for (let i = 0; i < 20; i++) {
    const emoji = document.createElement('div');
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    emoji.textContent = randomEmoji;
    emoji.style.cssText = `
      position: absolute;
      font-size: ${20 + Math.random() * 30}px;
      opacity: ${0.5 + Math.random() * 0.5};
      left: ${Math.random() * 100}vw;
      top: 110vh;
      animation: floatUp ${10 + Math.random() * 15}s linear infinite;
      animation-delay: ${Math.random() * 20}s;
      transform: rotate(${Math.random() * 360}deg);
      pointer-events: none;
      z-index: 2;
    `;
    
    container.appendChild(emoji);
  }
  
  // Add the animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes floatUp {
      0% {
        top: 110vh;
        transform: translateX(0) rotate(0);
      }
      100% {
        top: -50px;
        transform: translateX(${-50 + Math.random() * 100}px) rotate(${Math.random() * 360}deg);
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Applies pulsing effects to Asana UI elements 
 */
function pulseAsanaElements() {
  if (!partyModeActive) return;
  
  // Apply effects to various Asana UI elements
  const targets = [
    '.TopbarPageHeaderGlobalActions', // Top bar actions
    '.CircleBadge', // Circle badges in Asana
    '.TaskRow', // Task rows
    '.ProjectsNavigation', // Project navigation
    '.SidebarTeamSection', // Team sections
    '.Avatar', // User avatars
    '.BaseButton', // Buttons
    '.Icon', // Icons
    '.SearchBar', // Search bar
    '.TopbarPageHeader-title', // Page header title
  ];
  
  targets.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (!el.classList.contains('asana-party-modified')) {
        el.classList.add('asana-party-modified');
        
        // Save original styles if needed
        if (!el.dataset.originalTransition) {
          el.dataset.originalTransition = el.style.transition || '';
        }
        
        // Apply colorful effects
        const hue = Math.floor(Math.random() * 360);
        const animation = `colorPulse${Math.floor(Math.random() * 4)} ${2 + Math.random() * 3}s infinite`;
        
        el.style.transition = 'all 0.5s ease';
        el.style.animation = animation;
        
        // Apply varying effects by element type
        if (selector === '.TopbarPageHeaderGlobalActions' || selector === '.CircleBadge') {
          el.style.transform = `scale(${1 + Math.random() * 0.1}) rotate(${Math.random() * 5}deg)`;
        } else if (selector === '.Avatar') {
          el.style.borderRadius = '20%'; // Make avatars less round
          el.style.transform = `rotate(${Math.random() * 360}deg)`;
        }
      }
    });
  });
  
  // Add animations styles if not already added
  if (!document.getElementById('party-animations')) {
    const animStyle = document.createElement('style');
    animStyle.id = 'party-animations';
    animStyle.textContent = `
      @keyframes colorPulse0 {
        0% { filter: hue-rotate(0deg) brightness(1); }
        50% { filter: hue-rotate(180deg) brightness(1.2); }
        100% { filter: hue-rotate(360deg) brightness(1); }
      }
      @keyframes colorPulse1 {
        0% { filter: hue-rotate(90deg) brightness(1.1); }
        50% { filter: hue-rotate(270deg) brightness(0.9); }
        100% { filter: hue-rotate(450deg) brightness(1.1); }
      }
      @keyframes colorPulse2 {
        0% { filter: hue-rotate(180deg) brightness(1); }
        50% { filter: hue-rotate(360deg) brightness(1.3); }
        100% { filter: hue-rotate(540deg) brightness(1); }
      }
      @keyframes colorPulse3 {
        0% { filter: hue-rotate(270deg) brightness(1.2); }
        50% { filter: hue-rotate(450deg) brightness(0.8); }
        100% { filter: hue-rotate(630deg) brightness(1.2); }
      }
    `;
    document.head.appendChild(animStyle);
  }
}

// Updated selectors based on latest Asana UI
const TASK_ROW_SELECTOR = '.TaskPane'; 
const TASK_COMPLETED_CLASS = 'TaskRow--isCompleted, .SpreadsheetTaskCompletionStatus--completed';
// More comprehensive selector to catch the completion button in various Asana interfaces
const TASK_COMPLETED_CHECKBOX_SELECTOR = 'div[role="button"].TaskCompletionToggleButton, div[role="button"].SpreadsheetTaskCompletionCell, div[aria-label*="Mark complete"], div[aria-label*="Marcar como"], .CheckboxButton, .TaskCompletionButton'; 

const CUSTOM_FIELD_CONTAINER_SELECTOR = '.TableRow';
const CUSTOM_FIELD_LABEL_SELECTOR = '.LabeledRowStructure-left';
const CUSTOM_FIELD_VALUE_SELECTOR = '.LabeledRowStructure-right';

// Cooldown period to prevent double celebrations (in ms)
const CELEBRATION_COOLDOWN = 6000;

// Define celebration options for different task sizes
const CELEBRATIONS = {
  small: {
    text: 'Small Victory!',
    className: 'celebration-small',
    emoji: '🎉',
    gifCount: 3, // Number of GIFs to show for small tasks
    gifFolder: 'celebrations'
  },
  medium: {
    text: 'Good Job!',
    className: 'celebration-medium',
    emoji: '🚀',
    gifCount: 5, // Number of GIFs to show for medium tasks
    gifFolder: 'celebrations'
  },
  large: {
    text: 'Impressive!',
    className: 'celebration-large',
    emoji: '🏆',
    gifCount: 7, // Number of GIFs to show for large tasks
    gifFolder: 'celebrations'
  },
  xlarge: {
    text: 'EPIC ACHIEVEMENT!',
    className: 'celebration-xlarge',
    emoji: '🎇✨',
    gifCount: 10, // Number of GIFs to show for XL tasks
    gifFolder: 'celebrations'
  },
  default: {
    text: 'Task Completed!',
    className: 'celebration-default',
    emoji: '✅',
    gifCount: 1, // Number of GIFs to show for default tasks
    gifFolder: 'celebrations'
  }
};

/**
 * Finds the parent task row element from an internal element.
 * This uses multiple strategies to find the parent task.
 */
function findParentTaskRow(element) {
    if (!element) return null;    
    // Strategy 1: Direct parent lookup using selectors
    let taskRow = element.closest(TASK_ROW_SELECTOR);
    
    // Strategy 2: If that didn't work, try traversing up to find task context
    if (!taskRow) {
        console.log('Direct task row not found, trying alternative strategies');
        
        // Try to find the task name nearby to identify the task context
        const taskName = findTaskNameFromElement(element);
        
        if (taskName) {
            taskRow = element.closest('.TaskDetails, .TabPanel, .TaskPane');
            
            if (taskRow) {
                // Add task name as data attribute for reference
                taskRow.dataset.taskName = taskName;
            }
        }
        
        // If still not found, try going up several levels to find any relevant container
        if (!taskRow) {
            // This is a bit of a hack, but in some Asana views, we need to go up 4-5 levels
            // to find the actual task container
            let parent = element.parentElement;
            for (let i = 0; i < 8 && parent; i++) {
                if (parent.classList.length > 0 || parent.id) {
                    // Look for common task-related container classes
                    if (parent.classList.contains('TaskCell') || 
                        parent.classList.contains('TaskRow') || 
                        parent.classList.contains('SpreadsheetRow') ||
                        parent.classList.contains('SpreadsheetTaskNameAndDetailsCell') ||
                        parent.classList.contains('TaskPane')) {
                        taskRow = parent;
                        break;
                    }
                }
                parent = parent.parentElement;
            }
        }
    }
    
    return taskRow;
}

/**
 * Tries to find the task name from a given element in the DOM
 */
function findTaskNameFromElement(element) {
    // Try various strategies to find task name
    
    // Strategy 1: Look for TaskName component nearby
    let parent = element;
    for (let i = 0; i < 5 && parent; i++) {
        const taskNameEl = parent.querySelector('.TaskName, .SpreadsheetTaskNameCell');
        if (taskNameEl) {
            return taskNameEl.textContent.trim();
        }
        parent = parent.parentElement;
    }
    
    // Strategy 2: Look for heading or title nearby
    const heading = element.closest('[role="dialog"]')?.querySelector('h1, h2, .DialogHeader');
    if (heading) {
        return heading.textContent.trim();
    }
    
    return null;
}

/**
 * Extracts Task Size, Priority, and Team from a task element.
 */
function getTaskDetails(taskRowElement) {
    let taskSize = null;
    let priority = null;
    let team = null;

    if (!taskRowElement) return { taskSize, priority, team };
    
    // Strategy 1: Look in the custom fields section
    const customFields = document.querySelectorAll(CUSTOM_FIELD_CONTAINER_SELECTOR);
    console.log('Found custom fields in document:', customFields.length);

    customFields.forEach(fieldElement => {
        const labelElement = fieldElement.querySelector(CUSTOM_FIELD_LABEL_SELECTOR);
        const valueElement = fieldElement.querySelector(CUSTOM_FIELD_VALUE_SELECTOR);

        if (labelElement && valueElement) {
            const label = labelElement.textContent.trim();
            const value = valueElement.textContent.trim();

            // Case insensitive matching for different language settings
            if (label === 'Task Size') {
                taskSize = value;
            } else if (label === 'Priority') {
                priority = value;
            } else if (label === 'Team') {
                team = value;
            }
        }
    });
    
    // If still not found, default to creating a celebration anyway
    if (!taskSize) {
        taskSize = "medium";
    }
    
    if (!priority) {
        priority = "P1 - Urgent";
    }

    console.log(`Details extracted - Size: ${taskSize}, Priority: ${priority}`);
    return { taskSize, priority, team };
}

/**
 * Processes a completed task and shows celebration if needed
 */
function processCompletedTask(taskElement) {
    // If already celebrated recently, skip
    if (taskElement && taskElement.dataset.celebratedRecently) {
        return;
    }
    
    const { taskSize, priority, team } = getTaskDetails(taskElement);
    showCelebration(taskSize, priority, team);
    
    // Set cooldown flag if we have a task element
    if (taskElement) {
        taskElement.dataset.celebratedRecently = 'true';
        setTimeout(() => delete taskElement.dataset.celebratedRecently, CELEBRATION_COOLDOWN);
    }
}

/**
 * Shows the celebration.
 */
function showCelebration(taskSize, priority, team) {
    console.log(`Task completed! Size: ${taskSize}, Priority: ${priority}, Team: ${team}`);

    const existingCelebration = document.getElementById('asana-celebration-overlay');
    if (existingCelebration) {
        existingCelebration.remove();
    }

    const celebrationDiv = document.createElement('div');
    celebrationDiv.id = 'asana-celebration-overlay';
    
    // Get the appropriate celebration based on task size
    let celebrationConfig = CELEBRATIONS.default;
    const size = taskSize ? taskSize.toLowerCase() : 'unknown';
    
    if (size === 'small') {
        celebrationConfig = CELEBRATIONS.small;
    } else if (size === 'medium') {
        celebrationConfig = CELEBRATIONS.medium;
    } else if (size === 'large') {
        celebrationConfig = CELEBRATIONS.large;
    } else if (size === 'xlarge' || size === 'x-large') {
        celebrationConfig = CELEBRATIONS.xlarge;
    } else if (taskSize) {
        celebrationConfig = CELEBRATIONS.default;
        celebrationConfig.text = `Task Completed! (Size: ${taskSize})`;
    }

    // Apply the corresponding CSS class
    celebrationDiv.classList.add(celebrationConfig.className);
    
    // Game of Thrones house-themed content
    const houseThemes = {
        'Targaryen': {
            sigilImg: 'house_sigils/targaryen.webp',
            quote: "Fire and Blood",
            message: "A Targaryen victory! The dragon has conquered another task!",
            className: "house-targaryen"
        },
        'Hightower': {
            sigilImg: 'house_sigils/hightower.png',
            quote: "We Light the Way",
            message: "Tower of knowledge and wisdom! Another task illuminated!",
            className: "house-hightower"
        },
        'Tyrell': {
            sigilImg: 'house_sigils/tyrell.png',
            quote: "Growing Strong",
            message: "The rose blooms with another completed task!",
            className: "house-tyrell"
        },
        'Greyjoy': {
            sigilImg: 'house_sigils/greyjoy.webp',
            quote: "We Do Not Sow",
            message: "What is dead may never die! Conquered like the Iron Islands!",
            className: "house-greyjoy"
        },
        'Lannister': {
            sigilImg: 'house_sigils/lannister.webp',
            quote: "Hear Me Roar",
            message: "A Lannister always completes their tasks!",
            className: "house-lannister"
        },
        'Martell': {
            sigilImg: 'house_sigils/martell.png',
            quote: "Unbowed, Unbent, Unbroken",
            message: "The sun of Dorne shines on your completed task!",
            className: "house-martell"
        },
        'Mormont': {
            sigilImg: 'house_sigils/mormont.webp',
            quote: "Here We Stand",
            message: "With the strength of Bear Island, another task falls!",
            className: "house-mormont"
        },
        'Wildings': {
            sigilImg: 'house_sigils/wildlings.webp',
            quote: "Free Folk",
            message: "Beyond the Wall, your tasks are conquered with wild freedom!",
            className: "house-wildlings"
        },
        'Tech': {
            sigilImg: 'house_sigils/tech.png',
            quote: "Innovation is Coming",
            message: "The maesters of technology have solved another problem!",
            className: "house-tech"
        }
    };
    
    // Check if we have a matching house theme
    let houseTheme = null;
    if (team) {
        Object.keys(houseThemes).forEach(houseName => {
            if (team.includes(houseName)) {
                houseTheme = houseThemes[houseName];
            }
        });
    }
    
    // Create motivational messages based on task size
    const motivationalMessages = {
        small: [
            "Every small win adds up to big victories!",
            "Progress is progress, no matter how small.",
            "Small steps lead to massive results!",
            "One task at a time is how legends are made.",
            "The journey of excellence begins with small wins!"
        ],
        medium: [
            "You're on fire today! Keep it up!",
            "Making meaningful progress — incredible work!",
            "Keep this momentum going! You're amazing!",
            "You're crushing it! Next task, please!",
            "That's how success happens — one task at a time!"
        ],
        large: [
            "That was a big one — be incredibly proud!",
            "Major achievement unlocked! You're unstoppable!",
            "You've accomplished something truly significant!",
            "Your dedication is inspiring! Celebrate this win!",
            "Tackling the big challenges — that's what champions do!"
        ],
        xlarge: [
            "PHENOMENAL ACHIEVEMENT! YOU'RE EXTRAORDINARY!",
            "MONUMENTAL SUCCESS! NOTHING CAN STOP YOU!",
            "YOU'RE ABSOLUTELY INCREDIBLE! KEEP SOARING!",
            "LEGENDARY PERFORMANCE! HISTORY IN THE MAKING!",
            "EXCEPTIONAL WORK! YOU'RE REDEFINING EXCELLENCE!"
        ],
        default: [
            "Well done! Another step toward greatness!",
            "Great work! Your consistent effort is paying off!",
            "Task mastered! Your productivity is inspiring!",
            "Keep it up! You're making incredible progress!",
            "Success is built on completing one task at a time!"
        ]
    };
    
    // Additional encouraging phrases based on task priority
    const priorityPhrases = {
        high: "Critical task completed with excellence!",
        medium: "Important milestone achieved!",
        low: "Another quality task completed!"
    };
    
    // Get random motivational message for the current task size
    const messages = motivationalMessages[size] || motivationalMessages.default;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Determine priority phrase if available
    let priorityPhrase = "";
    if (priority) {
        const priorityLower = priority.toLowerCase();
        if (priorityLower.includes("1") || priorityLower.includes("high") || priorityLower.includes("urgent")) {
            priorityPhrase = priorityPhrases.high;
        } else if (priorityLower.includes("2") || priorityLower.includes("medium")) {
            priorityPhrase = priorityPhrases.medium;
        } else {
            priorityPhrase = priorityPhrases.low;
        }
    }
    
    // If we have a house theme, apply it
    if (houseTheme) {
        // Add the house-specific class to the celebration div
        celebrationDiv.classList.add(houseTheme.className);
        
        // Get correct image URL using chrome.runtime.getURL if available
        let leftSigilUrl = houseTheme.sigilImg;
        let rightSigilUrl = houseTheme.sigilImg;
        
        // In Chrome extension context, convert relative paths to absolute URLs
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            leftSigilUrl = chrome.runtime.getURL(houseTheme.sigilImg);
            rightSigilUrl = chrome.runtime.getURL(houseTheme.sigilImg);
        }
        
        // Create the celebration content with house theme
        const contentDiv = document.createElement('div');
        contentDiv.className = 'celebration-content';
        contentDiv.innerHTML = `
            <div class="celebration-title">
                <img src="${leftSigilUrl}" alt="${team}" class="house-sigil left-sigil">
                <span class="celebration-title-text">${celebrationConfig.text}</span>
                <img src="${rightSigilUrl}" alt="${team}" class="house-sigil right-sigil">
            </div>
            <div class="celebration-house-motto">"${houseTheme.quote}"</div>
            <div class="celebration-message">${houseTheme.message}</div>
            <div class="celebration-divider"></div>
            <div class="celebration-details">${priorityPhrase || 'Priority: ' + (priority || 'N/A')}</div>
        `;
        
        celebrationDiv.appendChild(contentDiv);
    } else {
        // Create the standard celebration content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'celebration-content';
        contentDiv.innerHTML = `
            <div class="celebration-title">
                <span class="celebration-emoji">${celebrationConfig.emoji}</span>
                <span class="celebration-title-text">${celebrationConfig.text}</span>
                <span class="celebration-emoji">${celebrationConfig.emoji}</span>
            </div>
            <div class="celebration-message">${randomMessage}</div>
            <div class="celebration-divider"></div>
            <div class="celebration-details">${priorityPhrase || 'Priority: ' + (priority || 'N/A')}</div>
        `;
        
        celebrationDiv.appendChild(contentDiv);
    }
    
    // Add dark overlay
    const overlayDiv = document.createElement('div');
    overlayDiv.className = 'celebration-overlay';
    celebrationDiv.insertBefore(overlayDiv, celebrationDiv.firstChild);
    
    document.body.appendChild(celebrationDiv);

    // Add confetti effect
    showConfetti();
    
    // Add GIF celebrations based on task size
    showGifCelebrations(celebrationConfig.gifCount, celebrationConfig.gifFolder, false);

    // Entry animation - using CSS animations
    celebrationDiv.classList.add('celebration-visible');

    // Hide after a few seconds
    setTimeout(() => {
        celebrationDiv.classList.remove('celebration-visible');
        celebrationDiv.classList.add('celebration-hiding');
        
        // Also remove any floating GIFs
        removeAllGifCelebrations();
        
        setTimeout(() => {
            if (celebrationDiv.parentNode) {
                celebrationDiv.remove();
            }
        }, 500); // Time for exit animation
    }, 5000); // Duration of celebration
}

/**
 * Creates an enhanced confetti effect using DOM elements
 */
function showConfetti() {
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.body.appendChild(confettiContainer);
    
    // Create 250 confetti pieces with better color variety and shapes
    const colors = [
        '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', 
        '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', 
        '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', 
        '#FF5722', '#D500F9', '#FFD600', '#64FFDA', '#69F0AE'
    ];
    
    // Create different shapes of confetti
    const shapes = ['circle', 'square', 'rectangle', 'triangle'];
    
    for (let i = 0; i < 250; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        
        // Randomly choose a shape
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        confetti.classList.add(`confetti-${shape}`);
        
        // Set random properties through CSS variables
        confetti.style.setProperty('--confetti-color', colors[Math.floor(Math.random() * colors.length)]);
        
        // Set different sizes based on the shape
        let size = Math.random() * 10 + 6; // 6px to 16px
        confetti.style.setProperty('--confetti-size', `${size}px`);
        
        // Distribute evenly across the screen with slight variance
        const horizontalPosition = (i % 25) * 4 + Math.random() * 2;
        confetti.style.setProperty('--confetti-left', `${horizontalPosition}%`);
        
        // Vary the starting positions vertically as well
        const verticalVariation = Math.random() * 30 - 15; // -15px to +15px
        confetti.style.setProperty('--confetti-start', `${verticalVariation}px`);
        
        // Random rotation
        confetti.style.setProperty('--confetti-rotation', `${Math.random() * 360}deg`);
        
        // Vary the animation duration and delay
        const duration = Math.random() * 3 + 2.5; // 2.5s to 5.5s
        confetti.style.setProperty('--confetti-duration', `${duration}s`);
        
        const delay = Math.random() * 2; // 0s to 2s delay
        confetti.style.setProperty('--confetti-delay', `${delay}s`);
        
        // Add some shine effect to some pieces
        if (Math.random() > 0.8) {
            confetti.classList.add('confetti-shine');
        }
        
        confettiContainer.appendChild(confetti);
    }
    
    // Remove the confetti container after animations are done
    setTimeout(() => {
        if (confettiContainer.parentNode) {
            confettiContainer.remove();
        }
    }, 7000); // Increased to last longer than the celebration
}

/**
 * Loads all GIFs from a specific folder
 * @param {string} folderPath - Path to the folder
 * @param {Function} callback - Callback with array of URLs
 */
function loadGifsFromFolder(folderPath, callback) {
    const maxGifsToCheck = 50; // Look for up to 47 GIFs
    const gifUrls = [];
    let checkedCount = 0;
    
    // For Chrome extensions, we need to use chrome.runtime.getURL
    try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            // First collect all possible GIF URLs without checking if they exist
            const possibleUrls = [];
            for (let i = 1; i <= maxGifsToCheck; i++) {
                try {
                    const path = `${folderPath}/${i}.gif`;
                    const url = chrome.runtime.getURL(path);
                    possibleUrls.push(url);
                } catch (e) {
                    // Skip if URL can't be generated
                }
            }
            
            // Function to check if we're done loading
            const checkIfDone = () => {
                checkedCount++;
                if (checkedCount >= maxGifsToCheck) {
                    // We've checked all possible GIFs, return whatever we've found
                    callback(gifUrls);
                }
            };
            
            // Validate each URL and add the valid ones to gifUrls
            possibleUrls.forEach(url => {
                const img = new Image();
                img.onload = function() {
                    gifUrls.push(url);
                    checkIfDone();
                };
                img.onerror = function() {
                    checkIfDone();
                };
                img.src = url;
            });
        } else {
            // Fallback for non-Chrome environments
            for (let i = 1; i <= maxGifsToCheck; i++) {
                const path = `${folderPath}/${i}.gif`;
                gifUrls.push(path);
            }
            callback(gifUrls);
        }
    } catch (e) {
        console.error('Error loading GIFs:', e);
        callback([]);
    }
}

/**
 * Displays random floating GIFs on the screen
 * @param {number} count - Number of GIFs to display
 * @param {string} folderPath - Path to the folder containing GIFs
 * @param {boolean} isPartyMode - Whether this is for party mode (allows center positioning)
 */
function showGifCelebrations(count, folderPath, isPartyMode = false) {
    // Try to load the GIFs from the folder
    loadGifsFromFolder(folderPath, (gifUrls) => {
        if (!gifUrls || gifUrls.length === 0) {
            return;
        }
        
        // Create the specified number of GIF elements (or as many as we have)
        const actualCount = Math.min(count, gifUrls.length);
        console.log(`Showing ${actualCount} GIFs from ${gifUrls.length} available`);
        
        // Create a large pool of potential positions
        const positionPool = [];
        
        // Define an exclusion zone for the text container (center of screen)
        // Only apply this for task completion celebrations, not for party mode
        const exclusionZone = {
            centerX: 50,
            centerY: 50,
            radiusX: isPartyMode ? 0 : 25, // No exclusion in party mode
            radiusY: isPartyMode ? 0 : 30  // No exclusion in party mode
        };
        
        // If in party mode, add positions including the center area
        if (isPartyMode) {
            // Center area positions (only for party mode)
            for (let i = 0; i < 10; i++) {
                const left = 30 + Math.random() * 40; // 30-70%
                const top = 30 + Math.random() * 40; // 30-70%
                positionPool.push({ left: left + '%', top: top + '%' });
            }
        }
        
        // Outer ring - positions closer to screen edges
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const distanceFromCenter = 40 + Math.random() * 15; // 40-55% from center (closer to edges)
            const left = 50 + Math.cos(angle) * distanceFromCenter;
            const top = 50 + Math.sin(angle) * distanceFromCenter;
            positionPool.push({ left: left + '%', top: top + '%' });
        }
        
        // Corner regions - extra GIFs in the corners where there's more space
        // Top-left corner
        for (let i = 0; i < 5; i++) {
            const left = 5 + Math.random() * 20; // 5-25%
            const top = 5 + Math.random() * 20; // 5-25%
            positionPool.push({ left: left + '%', top: top + '%' });
        }
        
        // Top-right corner
        for (let i = 0; i < 5; i++) {
            const left = 75 + Math.random() * 20; // 75-95%
            const top = 5 + Math.random() * 20; // 5-25%
            positionPool.push({ left: left + '%', top: top + '%' });
        }
        
        // Bottom-left corner
        for (let i = 0; i < 5; i++) {
            const left = 5 + Math.random() * 20; // 5-25%
            const top = 75 + Math.random() * 20; // 75-95%
            positionPool.push({ left: left + '%', top: top + '%' });
        }
        
        // Bottom-right corner
        for (let i = 0; i < 5; i++) {
            const left = 75 + Math.random() * 20; // 75-95%
            const top = 75 + Math.random() * 20; // 75-95%
            positionPool.push({ left: left + '%', top: top + '%' });
        }
        
        // Edge positions - midpoints of edges
        // Top edge
        for (let i = 0; i < 3; i++) {
            const left = 30 + Math.random() * 40; // 30-70%
            const top = 5 + Math.random() * 10; // 5-15%
            positionPool.push({ left: left + '%', top: top + '%' });
        }
        
        // Bottom edge
        for (let i = 0; i < 3; i++) {
            const left = 30 + Math.random() * 40; // 30-70%
            const top = 85 + Math.random() * 10; // 85-95%
            positionPool.push({ left: left + '%', top: top + '%' });
        }
        
        // Left edge
        for (let i = 0; i < 3; i++) {
            const left = 5 + Math.random() * 10; // 5-15%
            const top = 30 + Math.random() * 40; // 30-70%
            positionPool.push({ left: left + '%', top: top + '%' });
        }
        
        // Right edge
        for (let i = 0; i < 3; i++) {
            const left = 85 + Math.random() * 10; // 85-95%
            const top = 30 + Math.random() * 40; // 30-70%
            positionPool.push({ left: left + '%', top: top + '%' });
        }
        
        // Helper function to check if a position is within the exclusion zone
        const isInExclusionZone = (pos) => {
            // If in party mode, no exclusion zone
            if (isPartyMode) return false;
            
            const x = parseFloat(pos.left);
            const y = parseFloat(pos.top);
            
            // Calculate the normalized distance from center
            const dx = Math.abs(x - exclusionZone.centerX) / exclusionZone.radiusX;
            const dy = Math.abs(y - exclusionZone.centerY) / exclusionZone.radiusY;
            
            // If the point is inside the ellipse
            return (dx * dx + dy * dy) < 1;
        };
        
        // Filter out positions that are within the exclusion zone
        const validPositions = positionPool.filter(pos => !isInExclusionZone(pos));
        
        // Shuffle the valid positions
        for (let i = validPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
        }
        
        // Select random positions from the pool, ensuring they're not too close to each other
        const selectedPositions = [];
        const minDistanceSquared = 15 * 15; // Minimum distance squared in percentage points
        
        // Helper function to calculate distance squared between two positions
        const distanceSquared = (pos1, pos2) => {
            const x1 = parseFloat(pos1.left);
            const y1 = parseFloat(pos1.top);
            const x2 = parseFloat(pos2.left);
            const y2 = parseFloat(pos2.top);
            return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
        };
        
        // Try to select as many positions as needed from valid positions
        for (const position of validPositions) {
            // Check if this position is far enough from all already selected positions
            let isFarEnough = true;
            for (const selectedPos of selectedPositions) {
                if (distanceSquared(position, selectedPos) < minDistanceSquared) {
                    isFarEnough = false;
                    break;
                }
            }
            
            if (isFarEnough) {
                selectedPositions.push(position);
                if (selectedPositions.length >= actualCount) {
                    break; // We have enough positions
                }
            }
        }
        
        // If we couldn't find enough positions, just use what we have (this should be rare)
        const positions = selectedPositions.length < actualCount ? 
            validPositions.slice(0, actualCount) : selectedPositions;
        
        // Shuffle the gifUrls to get random ones each time
        const shuffledGifs = [...gifUrls];
        for (let i = shuffledGifs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledGifs[i], shuffledGifs[j]] = [shuffledGifs[j], shuffledGifs[i]];
        }
        
        for (let i = 0; i < actualCount; i++) {
            // Get a GIF from the shuffled array, using modulo to handle if we have fewer GIFs than count
            const gifUrl = shuffledGifs[i % shuffledGifs.length];
            
            // Create GIF element with preload
            const gifElement = new Image();
            gifElement.className = 'floating-celebration-gif';
            gifElement.onload = function() {
                // Only add it to the DOM after it's loaded
                document.body.appendChild(gifElement);
                
                // Add class for entrance animation after a short delay
                setTimeout(() => {
                    gifElement.classList.add('gif-visible');
                }, 10 + (i * 150)); // Increased stagger time between animations
            };
            gifElement.src = gifUrl;
            
            // Use the pre-calculated positions or fallback to a safe default
            const position = positions[i] || { left: '5%', top: '5%' };
            const randomPosition = {
                left: position.left,
                top: position.top,
                scale: 0.8 + Math.random() * 0.4, // 0.8 to 1.2 scale 
                rotation: (Math.random() * 10 - 5) + 'deg', // -5 to +5 degrees
                delay: i * 0.15 // Staggered delay
            };
            
            gifElement.style.setProperty('--gif-left', randomPosition.left);
            gifElement.style.setProperty('--gif-top', randomPosition.top);
            gifElement.style.setProperty('--gif-scale', randomPosition.scale);
            gifElement.style.setProperty('--gif-rotation', randomPosition.rotation);
            gifElement.style.setProperty('--gif-delay', randomPosition.delay + 's');
        }
    });
}

/**
 * Removes all floating GIFs from the page
 */
function removeAllGifCelebrations() {
    const gifs = document.querySelectorAll('.floating-celebration-gif');
    gifs.forEach(gif => {
        gif.classList.remove('gif-visible');
        gif.classList.add('gif-hiding');
        setTimeout(() => {
            if (gif.parentNode) {
                gif.remove();
            }
        }, 500);
    });
}

// Main detection mechanism using MutationObserver
const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const targetElement = mutation.target;
            
        }
    }
});

// Backup method using click detection - Enhanced to better detect Asana's completion pattern
document.addEventListener('click', function(event) {    
    // Try various methods to find the completion button
    const clickedCompleteButton = event.target.closest(TASK_COMPLETED_CHECKBOX_SELECTOR);
    
    if (clickedCompleteButton) {        
        // Find the associated task row
        const taskRow = findParentTaskRow(clickedCompleteButton);
        
        // Get the button text to help determine if it's a completion action
        const buttonText = clickedCompleteButton.textContent.trim().toLowerCase();
        const isMarkCompleteButton = 
            buttonText.includes('mark complete') || 
            buttonText.includes('marcar como') ||
            clickedCompleteButton.classList.contains('TaskCompletionToggleButton--isNotPressed');
        
        
        if (taskRow) {            
            // Short delay to allow Asana to update task status
            setTimeout(() => {
                const isCompleted = 
                    taskRow.classList.contains('TaskRow--isCompleted') || 
                    taskRow.classList.contains('SpreadsheetTaskCompletionStatus--completed') ||
                    taskRow.querySelector('.TaskCompletionStatusIndicator--isComplete') !== null;
                
                
                if (isCompleted) {
                    processCompletedTask(taskRow);
                } else {
                    // Try an alternative approach - check if the checkbox is checked
                    const checkbox = clickedCompleteButton.querySelector('input[type="checkbox"]:checked');
                    if (checkbox || isMarkCompleteButton) {
                        console.log('Task likely completed, showing celebration');
                        processCompletedTask(taskRow);
                    } else {
                        console.log("Completion status not confirmed after click");
                    }
                }
            }, 300);
        } else {
            console.log('Could not find associated task row, but button was clicked');
            
            // If we're confident this is a completion button, show celebration anyway
            if (isMarkCompleteButton) {
                console.log('Showing celebration based on button click alone');
                // Short delay to allow potential UI updates
                setTimeout(() => {
                    processCompletedTask(null); // Pass null to indicate we don't have a task element
                }, 300);
            }
        }
    }
}, true);

// Initialize observer when Asana's DOM is ready
let attempts = 0;
const maxAttempts = 20;
const initialLoadInterval = setInterval(() => {
    attempts++;
    // Try to find Asana's main container in order of specificity
    const asanaMainContainer = document.querySelector('.ProjectPageStructure-contents') || // Project views
                               document.querySelector('.MyTasksPage-tasks') ||            // My Tasks view
                               document.querySelector('.SpreadsheetGridScroller') ||      // List/spreadsheet view
                               document.body;                                             // Fallback

    if (document.readyState === "complete" && 
        asanaMainContainer && 
        (asanaMainContainer !== document.body || attempts > 5)) {
        
        clearInterval(initialLoadInterval);
        
        observer.observe(asanaMainContainer, {
            childList: true,   // Watch for added/removed nodes
            subtree: true,     // Watch all descendants
            attributes: true,  // Watch for attribute changes
            attributeFilter: ['class'], // Only interested in class changes
            attributeOldValue: true     // Need previous value to check if newly completed
        });
        
        // Also add specific observers for task completion cells which might not change class
        const taskCompletionCells = document.querySelectorAll('.TaskCompletionToggleButton, .SpreadsheetTaskCompletionCell');
        
        taskCompletionCells.forEach(cell => {
            observer.observe(cell, {
                attributes: true,
                childList: true,
                subtree: true
            });
        });
    } else if (attempts >= maxAttempts) {
        clearInterval(initialLoadInterval);
        console.error("Could not find Asana main container for DOM observer after multiple attempts.");
    }
}, 1000);