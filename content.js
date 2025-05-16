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
    
    // Set background color based on task size
    let celebrationText = '';
    let backgroundColor = '#4CAF50'; // Default green
    let emoji = '✅';
    let fontSize = null;

    switch (taskSize ? taskSize.toLowerCase() : 'unknown') {
        case 'small':
            celebrationText = 'Small Victory!';
            backgroundColor = '#3498db'; // Blue
            emoji = '🎉';
            break;
        case 'medium':
            celebrationText = 'Good Job!';
            backgroundColor = '#f1c40f'; // Yellow
            emoji = '🚀';
            break;
        case 'large':
            celebrationText = 'Impressive!';
            backgroundColor = '#e74c3c'; // Red
            emoji = '🏆';
            break;
        case 'xlarge':
            celebrationText = 'EPIC ACHIEVEMENT!';
            backgroundColor = '#9b59b6'; // Purple
            emoji = '🎇✨';
            fontSize = '36px';
            break;
        default:
            celebrationText = 'Task Completed!';
            if (taskSize) celebrationText += ` (Size: ${taskSize})`;
            break;
    }

    celebrationDiv.style.backgroundColor = backgroundColor;
    if (fontSize) {
        celebrationDiv.style.fontSize = fontSize;
    }
    
    celebrationDiv.innerHTML = `${emoji} ${celebrationText} ${emoji}<br><small style="font-size: 0.6em; opacity: 0.8;">Priority: ${priority || 'N/A'}</small>`;
    document.body.appendChild(celebrationDiv);

    // Entry animation
    setTimeout(() => {
        celebrationDiv.style.opacity = '1';
        celebrationDiv.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 50);

    // Hide after a few seconds
    setTimeout(() => {
        celebrationDiv.style.opacity = '0';
        celebrationDiv.style.transform = 'translate(-50%, -50%) scale(0.8)';
        setTimeout(() => {
            if (celebrationDiv.parentNode) {
                celebrationDiv.remove();
            }
        }, 400); // Time for exit animation
    }, 3500); // Duration of celebration
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