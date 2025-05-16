// content.js
console.log('%c Asana Celebrations Plugin Loaded! ', 'background: #9b59b6; color: white; font-size: 16px; padding: 5px; border-radius: 5px;');

// Also log to make sure content.js is executing properly
try {
  document.body.dataset.asanaCelebrationsLoaded = 'true';
  console.log('Plugin initialization started - DOM marker added');
} catch (err) {
  console.error('Plugin initialization error:', err);
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
    gifCount: 2, // Number of GIFs to show for small tasks
    gifFolder: 'celebrations'
  },
  medium: {
    text: 'Good Job!',
    className: 'celebration-medium',
    emoji: '🚀',
    gifCount: 3, // Number of GIFs to show for medium tasks
    gifFolder: 'celebrations'
  },
  large: {
    text: 'Impressive!',
    className: 'celebration-large',
    emoji: '🏆',
    gifCount: 4, // Number of GIFs to show for large tasks
    gifFolder: 'celebrations'
  },
  xlarge: {
    text: 'EPIC ACHIEVEMENT!',
    className: 'celebration-xlarge',
    emoji: '🎇✨',
    gifCount: 6, // Number of GIFs to show for XL tasks
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
        
        // Create the celebration content with house theme
        const contentDiv = document.createElement('div');
        contentDiv.className = 'celebration-content';
        
        // Get correct image URL using chrome.runtime.getURL if available
        let leftSigilUrl = houseTheme.sigilImg;
        let rightSigilUrl = houseTheme.sigilImg;
        
        // In Chrome extension context, convert relative paths to absolute URLs
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
            leftSigilUrl = chrome.runtime.getURL(houseTheme.sigilImg);
            rightSigilUrl = chrome.runtime.getURL(houseTheme.sigilImg);
        }
        
        contentDiv.innerHTML = `
            <div class="celebration-title">
                <img src="${leftSigilUrl}" alt="${team}" class="house-sigil left-sigil">
                ${celebrationConfig.text}
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
                ${celebrationConfig.text}
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
    showGifCelebrations(celebrationConfig.gifCount, celebrationConfig.gifFolder);

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
    const maxGifsToCheck = 21; // Look for up to 21 GIFs
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
 */
function showGifCelebrations(count, folderPath) {
    // Try to load the GIFs from the folder
    loadGifsFromFolder(folderPath, (gifUrls) => {
        if (!gifUrls || gifUrls.length === 0) {
            return;
        }
        
        // Create the specified number of GIF elements (or as many as we have)
        const actualCount = Math.min(count, gifUrls.length);
        console.log(`Showing ${actualCount} GIFs from ${gifUrls.length} available`);
        
        // Set up a grid distribution to better spread GIFs across the screen
        const positions = [];
        
        // Divide the screen into sections to place GIFs
        const columns = Math.ceil(Math.sqrt(actualCount));
        const rows = Math.ceil(actualCount / columns);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                if (positions.length < actualCount) {
                    // Add some randomness to grid positions
                    positions.push({
                        left: ((100 / columns) * col) + (Math.random() * 20 - 10) + (100 / columns / 2) + '%',
                        top: ((100 / rows) * row) + (Math.random() * 20 - 10) + (100 / rows / 2) + '%',
                    });
                }
            }
        }
        
        // Shuffle the positions array for more randomness
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        
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
                }, 10 + (i * 100)); // Stagger the animations
            };
            gifElement.src = gifUrl;
            
            // Use the pre-calculated positions instead of completely random ones
            const position = positions[i];
            const randomPosition = {
                left: position.left,
                top: position.top,
                scale: 0.7 + Math.random() * 0.6, // 0.7 to 1.3 scale
                rotation: (Math.random() * 20 - 10) + 'deg', // -10 to +10 degrees
                delay: i * 0.1 // Staggered delay
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