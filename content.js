// content.js
console.log('Asana Celebrations Plugin Loaded!');

const TASK_ROW_SELECTOR = '.TaskRow'; 
const TASK_COMPLETED_CLASS = 'TaskRow--isCompleted'; 
const TASK_COMPLETED_CHECKBOX_SELECTOR = 'div[role="button"].TaskCompletionToggleButton, div[aria-label*="Mark complete"], div[aria-label*="Marcar como"]'; 

const CUSTOM_FIELD_CONTAINER_SELECTOR = '.CustomPropertyRow';
const CUSTOM_FIELD_LABEL_SELECTOR = '.CustomPropertyRow-title';
const CUSTOM_FIELD_VALUE_SELECTOR = '.CustomPropertyEditableTokenCell-tokenName, .Pill-label';

// Cooldown period to prevent double celebrations (in ms)
const CELEBRATION_COOLDOWN = 4000;

/**
 * Finds the parent task row element from an internal element.
 */
function findParentTaskRow(element) {
    if (!element) return null;
    return element.closest(TASK_ROW_SELECTOR);
}

/**
 * Extracts Task Size and Priority from a task element.
 */
function getTaskDetails(taskRowElement) {
    let taskSize = null;
    let priority = null;

    if (!taskRowElement) return { taskSize, priority };

    const customFields = taskRowElement.querySelectorAll(CUSTOM_FIELD_CONTAINER_SELECTOR);

    customFields.forEach(fieldElement => {
        const labelElement = fieldElement.querySelector(CUSTOM_FIELD_LABEL_SELECTOR);
        const valueElement = fieldElement.querySelector(CUSTOM_FIELD_VALUE_SELECTOR);

        if (labelElement && valueElement) {
            const label = labelElement.textContent.trim();
            const value = valueElement.textContent.trim();

            if (label === 'Task Size') {
                taskSize = value;
            } else if (label === 'Priority') {
                priority = value;
            }
        }
    });

    console.log(`Details extracted - Size: ${taskSize}, Priority: ${priority}`);
    return { taskSize, priority };
}

/**
 * Processes a completed task and shows celebration if needed
 */
function processCompletedTask(taskElement) {
    // If already celebrated recently, skip
    if (taskElement.dataset.celebratedRecently) return;
    
    console.log('Task completed detected:', taskElement);
    const { taskSize, priority } = getTaskDetails(taskElement);
    showCelebration(taskSize, priority);
    
    // Set cooldown flag
    taskElement.dataset.celebratedRecently = 'true';
    setTimeout(() => delete taskElement.dataset.celebratedRecently, CELEBRATION_COOLDOWN);
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
        case 'x-large':
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
            
            if (targetElement.matches && 
                targetElement.matches(TASK_ROW_SELECTOR) && 
                targetElement.classList.contains(TASK_COMPLETED_CLASS)) {
                
                // Only celebrate if this is a new completion (not previously completed)
                const wasAlreadyCompleted = mutation.oldValue && mutation.oldValue.includes(TASK_COMPLETED_CLASS);
                if (!wasAlreadyCompleted) {
                    processCompletedTask(targetElement);
                }
            }
        }
    }
});

// Backup method using click detection
document.addEventListener('click', function(event) {
    const clickedCompleteButton = event.target.closest(TASK_COMPLETED_CHECKBOX_SELECTOR);
    
    if (clickedCompleteButton) {
        const taskRow = findParentTaskRow(clickedCompleteButton);
        if (taskRow) {
            // Short delay to allow Asana to update task status
            setTimeout(() => {
                if (taskRow.classList.contains(TASK_COMPLETED_CLASS)) {
                    processCompletedTask(taskRow);
                }
            }, 300);
        }
    }
}, true); // Use capture phase for earlier detection

// Initialize observer when Asana's DOM is ready
let attempts = 0;
const maxAttempts = 20;
const initialLoadInterval = setInterval(() => {
    attempts++;
    // Try to find Asana's main container in order of specificity
    const asanaMainContainer = document.querySelector('.ProjectPageStructure-contents') || // Project views
                               document.querySelector('.MyTasksPage-tasks') ||            // My Tasks view
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
    } else if (attempts >= maxAttempts) {
        clearInterval(initialLoadInterval);
        console.error("Could not find Asana main container for DOM observer after multiple attempts.");
    }
}, 1000);