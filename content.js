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
const TASK_ROW_SELECTOR = '.TaskRow, .SpreadsheetRow'; 
const TASK_COMPLETED_CLASS = 'TaskRow--isCompleted, .SpreadsheetTaskCompletionStatus--completed';
// More comprehensive selector to catch the completion button in various Asana interfaces
const TASK_COMPLETED_CHECKBOX_SELECTOR = 'div[role="button"].TaskCompletionToggleButton, div[role="button"].SpreadsheetTaskCompletionCell, div[aria-label*="Mark complete"], div[aria-label*="Marcar como"], .CheckboxButton, .TaskCompletionButton'; 

const CUSTOM_FIELD_CONTAINER_SELECTOR = '.TableRow';
const CUSTOM_FIELD_LABEL_SELECTOR = '.LabeledRowStructure-left';
const CUSTOM_FIELD_VALUE_SELECTOR = '.LabeledRowStructure-right';

// Cooldown period to prevent double celebrations (in ms)
const CELEBRATION_COOLDOWN = 4000;

// Define celebration options for different task sizes
const CELEBRATIONS = {
  small: {
    text: 'Small Victory!',
    className: 'celebration-small',
    emoji: '🎉',
    image: 'celebrations/small-celebration.webp'
  },
  medium: {
    text: 'Good Job!',
    className: 'celebration-medium',
    emoji: '🚀',
    image: 'celebrations/medium-celebration.webp'
  },
  large: {
    text: 'Impressive!',
    className: 'celebration-large',
    emoji: '🏆',
    image: 'celebrations/large-celebration.webp'
  },
  xlarge: {
    text: 'EPIC ACHIEVEMENT!',
    className: 'celebration-xlarge',
    emoji: '🎇✨',
    image: 'celebrations/xlarge-celebration.webp'
  },
  default: {
    text: 'Task Completed!',
    className: 'celebration-default',
    emoji: '✅',
    image: 'celebrations/default-celebration.webp'
  }
};

/**
 * Finds the parent task row element from an internal element.
 * This uses multiple strategies to find the parent task.
 */
function findParentTaskRow(element) {
    if (!element) return null;
    console.log('Looking for parent task row from:', element);
    
    // Strategy 1: Direct parent lookup using selectors
    let taskRow = element.closest(TASK_ROW_SELECTOR);
    
    // Strategy 2: If that didn't work, try traversing up to find task context
    if (!taskRow) {
        console.log('Direct task row not found, trying alternative strategies');
        
        // Try to find the task name nearby to identify the task context
        const taskName = findTaskNameFromElement(element);
        
        if (taskName) {
            console.log('Found task name:', taskName);
            // In some views, we might need to work with the task by name
            // For now, we'll use the closest TabPanel or TaskDetails as our task container
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
                    // console.log(`Level ${i} parent:`, parent);
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
    
    console.log('Found task row:', taskRow);
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
 * Extracts Task Size and Priority from a task element.
 */
function getTaskDetails(taskRowElement) {
    let taskSize = null;
    let priority = null;

    if (!taskRowElement) return { taskSize, priority };

    console.log('Getting task details from element:', taskRowElement);
    
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
            }
        }
    });

    // Strategy 2: Try to find fields in the dialog or details view
    // if (!taskSize || !priority) {
    //     console.log('Trying to find fields in task dialog/details');
        
    //     // Find all .Pill elements which often contain field values
    //     const pills = document.querySelectorAll('.Pill-label');
    //     pills.forEach(pill => {
    //         const text = pill.textContent.trim().toLowerCase();
    //         console.log('Found pill:', text);
            
    //         // Check if this pill contains priority or size information
    //         if (text.match(/^(low|medium|high|urgent)$/i)) {
    //             priority = pill.textContent.trim();
    //         } else if (text.match(/^(small|medium|large|x-?large)$/i)) {
    //             taskSize = pill.textContent.trim();
    //         }
    //     });
    // }
    
    // If still not found, default to creating a celebration anyway
    if (!taskSize) {
        taskSize = "medium";
    }
    
    if (!priority) {
        priority = "P1 - Urgent";
    }

    console.log(`Details extracted - Size: ${taskSize}, Priority: ${priority}`);
    return { taskSize, priority };
}

/**
 * Processes a completed task and shows celebration if needed
 */
function processCompletedTask(taskElement) {
    // If already celebrated recently, skip
    if (taskElement && taskElement.dataset.celebratedRecently) {
        console.log('Skipping celebration - already celebrated recently');
        return;
    }
    
    console.log('Task completed detected:', taskElement);
    const { taskSize, priority } = getTaskDetails(taskElement);
    showCelebration(taskSize, priority);
    
    // Set cooldown flag if we have a task element
    if (taskElement) {
        taskElement.dataset.celebratedRecently = 'true';
        setTimeout(() => delete taskElement.dataset.celebratedRecently, CELEBRATION_COOLDOWN);
    }
}

/**
 * Shows the celebration.
 */
function showCelebration(taskSize, priority) {
    console.log(`Task completed! Size: ${taskSize}, Priority: ${priority}`);

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
    
    // Create the celebration content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'celebration-content';
    contentDiv.innerHTML = `
        ${celebrationConfig.emoji} ${celebrationConfig.text} ${celebrationConfig.emoji}
        <br><small>Priority: ${priority || 'N/A'}</small>
    `;
    
    // Add background image if available
    if (celebrationConfig.image) {
        try {
            const imageUrl = chrome.runtime.getURL(celebrationConfig.image);
            celebrationDiv.classList.add('celebration-with-image');
            celebrationDiv.style.setProperty('--celebration-image', `url(${imageUrl})`);
        } catch (e) {
            console.log('Could not load celebration image', e);
        }
    }
    
    // Add dark overlay and content
    const overlayDiv = document.createElement('div');
    overlayDiv.className = 'celebration-overlay';
    
    celebrationDiv.appendChild(overlayDiv);
    celebrationDiv.appendChild(contentDiv);
    document.body.appendChild(celebrationDiv);

    // Add confetti effect
    showConfetti();

    // Entry animation - using CSS animations
    celebrationDiv.classList.add('celebration-visible');

    // Hide after a few seconds
    setTimeout(() => {
        celebrationDiv.classList.remove('celebration-visible');
        celebrationDiv.classList.add('celebration-hiding');
        
        setTimeout(() => {
            if (celebrationDiv.parentNode) {
                celebrationDiv.remove();
            }
        }, 500); // Time for exit animation
    }, 3500); // Duration of celebration
}

/**
 * Creates a simple confetti effect using DOM elements
 */
function showConfetti() {
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.body.appendChild(confettiContainer);
    
    // Create 50 confetti pieces
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        
        // Set random properties through CSS variables
        confetti.style.setProperty('--confetti-color', colors[Math.floor(Math.random() * colors.length)]);
        confetti.style.setProperty('--confetti-left', `${Math.random() * 100}vw`);
        confetti.style.setProperty('--confetti-size', `${Math.random() * 10 + 5}px`);
        confetti.style.setProperty('--confetti-rotation', `${Math.random() * 360}deg`);
        confetti.style.setProperty('--confetti-duration', `${Math.random() * 3 + 2}s`);
        confetti.style.setProperty('--confetti-delay', `${Math.random() * 1.5}s`);
        
        confettiContainer.appendChild(confetti);
    }
    
    // Remove the confetti container after animations are done
    setTimeout(() => {
        if (confettiContainer.parentNode) {
            confettiContainer.remove();
        }
    }, 5000);
}

// Main detection mechanism using MutationObserver
const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const targetElement = mutation.target;
            console.log('Class change detected on:', targetElement);
            
            if (targetElement.matches && 
                targetElement.matches(TASK_ROW_SELECTOR) && 
                targetElement.classList.contains(TASK_COMPLETED_CLASS)) {
                
                // Only celebrate if this is a new completion (not previously completed)
                const wasAlreadyCompleted = mutation.oldValue && mutation.oldValue.includes(TASK_COMPLETED_CLASS);
                if (!wasAlreadyCompleted) {
                    console.log('New task completion detected!');
                    processCompletedTask(targetElement);
                }
            }
        }
    }
});

// Backup method using click detection - Enhanced to better detect Asana's completion pattern
document.addEventListener('click', function(event) {
    console.log('Click detected:', event.target);
    
    // Try various methods to find the completion button
    const clickedCompleteButton = event.target.closest(TASK_COMPLETED_CHECKBOX_SELECTOR);
    
    if (clickedCompleteButton) {
        console.log('Clicked on what appears to be a completion button:', clickedCompleteButton);
        
        // Find the associated task row
        const taskRow = findParentTaskRow(clickedCompleteButton);
        
        // Get the button text to help determine if it's a completion action
        const buttonText = clickedCompleteButton.textContent.trim().toLowerCase();
        const isMarkCompleteButton = 
            buttonText.includes('mark complete') || 
            buttonText.includes('marcar como') ||
            buttonText.includes('complete') ||
            clickedCompleteButton.classList.contains('TaskCompletionToggleButton');
        
        console.log('Button text:', buttonText, 'Is mark complete button:', isMarkCompleteButton);
        
        if (taskRow) {
            console.log('Associated task row found:', taskRow);
            
            // Short delay to allow Asana to update task status
            setTimeout(() => {
                console.log('Checking if task is now completed...');
                const isCompleted = 
                    taskRow.classList.contains('TaskRow--isCompleted') || 
                    taskRow.classList.contains('SpreadsheetTaskCompletionStatus--completed') ||
                    taskRow.querySelector('.TaskCompletionStatusIndicator--isComplete') !== null;
                
                console.log('Task completion state:', isCompleted);
                
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
        console.log('DOM observer started on:', asanaMainContainer);
        
        observer.observe(asanaMainContainer, {
            childList: true,   // Watch for added/removed nodes
            subtree: true,     // Watch all descendants
            attributes: true,  // Watch for attribute changes
            attributeFilter: ['class'], // Only interested in class changes
            attributeOldValue: true     // Need previous value to check if newly completed
        });
        
        // Also add specific observers for task completion cells which might not change class
        const taskCompletionCells = document.querySelectorAll('.TaskCompletionToggleButton, .SpreadsheetTaskCompletionCell');
        console.log(`Found ${taskCompletionCells.length} task completion cells to observe`);
        
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