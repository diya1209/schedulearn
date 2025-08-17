// Dashboard functionality
document.addEventListener('DOMContentLoaded', async () => {
  // Check for success message from URL params
  checkForSuccessMessage();
  
  // Load user info
  await loadUserInfo();
  
  // Initialize calendar
  initializeCalendar();
  
  // Setup logout
  setupLogout();
  
  // Load stats
  await loadStats();
});

function checkForSuccessMessage() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('success') === 'schedule-created') {
    showSuccessPopup();
    // Clean up URL without reloading page
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }
}

function showSuccessPopup() {
  const popup = document.getElementById('successPopup');
  if (popup) {
    popup.classList.add('show');
  }
}

function closeSuccessPopup() {
  const popup = document.getElementById('successPopup');
  if (popup) {
    popup.classList.remove('show');
  }
}

// Make closeSuccessPopup available globally
window.closeSuccessPopup = closeSuccessPopup;
window.closeTaskPopup = closeTaskPopup;
window.showCustomConfirm = showCustomConfirm;
window.closeConfirmPopup = closeConfirmPopup;

async function loadUserInfo() {
  try {
    const response = await fetch('/api/user');
    if (response.ok) {
      const user = await response.json();
      document.getElementById('username').textContent = user.username;
    }
  } catch (error) {
    console.error('Failed to load user info:', error);
  }
}

function initializeCalendar() {
  const calendarEl = document.getElementById('calendar');
  
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next',
      center: 'title',
      right: 'today'
    },
    titleFormat: { month: 'long' },
    events: '/api/events',
    eventDisplay: 'block',
    dayMaxEvents: false,
    moreLinkClick: 'popover',
    height: 'auto',
    editable: false, // We'll control this programmatically
    eventClick: function(info) {
      if (window.moveMode) {
        // In move mode, store the event to be moved
        window.eventToMove = info.event;
      } else {
        // Normal mode - show event details
        showTaskDetailPopup(info.event);
      }
    },
    dateClick: function(info) {
      console.log('=== DATE CLICK DETECTED ===');
      console.log('Clicked date:', info.dateStr);
      console.log('Move mode active:', window.moveMode);
      console.log('Move event data:', window.moveEventData);
      
      if (window.moveMode && window.eventToMove) {
        console.log('Processing move to date:', info.dateStr);
        // Move the selected event to this date
        moveEventToDate(window.eventToMove, info.dateStr);
      } else {
        console.log('Move mode not active or no event data available');
        if (!window.moveMode) console.log('Move mode is false');
        if (!window.moveEventData) console.log('Move event data is null/undefined');
      }
    },
    eventDidMount: function(info) {
      // Add tooltip or additional styling
      info.el.title = `Study: ${info.event.title}`;
    }
  });
  
  calendar.render();
  
  // Store calendar instance globally for potential updates
  window.calendar = calendar;
}

function showTaskDetailPopup(event) {
  const popup = document.getElementById('taskDetailPopup');
  
  // Populate popup with event data
  document.getElementById('taskTopicName').textContent = event.title;
  
  // Store event data for delete operations
  popup.dataset.eventId = event.extendedProps?.eventId || event.id || '';
  popup.dataset.eventTitle = event.title;
  popup.dataset.eventDate = event.start.toISOString().split('T')[0];
  popup.dataset.startDate = event.extendedProps?.startDate || event.start.toISOString().split('T')[0];
  popup.dataset.endDate = event.extendedProps?.endDate || event.start.toISOString().split('T')[0];
  
  console.log('Event data stored:', {
    eventId: popup.dataset.eventId,
    title: popup.dataset.eventTitle,
    date: popup.dataset.eventDate
  });
  
  // Setup delete button handlers
  setupTaskActionHandlers();
  
  // Show popup
  popup.classList.add('show');
}

function closeTaskPopup() {
  const popup = document.getElementById('taskDetailPopup');
  popup.classList.remove('show');
}

function setupTaskActionHandlers() {
  const completeTaskBtn = document.getElementById('completeTaskBtn');
  const moveTaskBtn = document.getElementById('moveTaskBtn');
  const deleteTaskBtn = document.getElementById('deleteTaskBtn');
  const deleteScheduleBtn = document.getElementById('deleteScheduleBtn');
  
  // Remove existing listeners
  completeTaskBtn.replaceWith(completeTaskBtn.cloneNode(true));
  moveTaskBtn.replaceWith(moveTaskBtn.cloneNode(true));
  deleteTaskBtn.replaceWith(deleteTaskBtn.cloneNode(true));
  deleteScheduleBtn.replaceWith(deleteScheduleBtn.cloneNode(true));
  
  // Get new references
  const newCompleteTaskBtn = document.getElementById('completeTaskBtn');
  const newMoveTaskBtn = document.getElementById('moveTaskBtn');
  const newDeleteTaskBtn = document.getElementById('deleteTaskBtn');
  const newDeleteScheduleBtn = document.getElementById('deleteScheduleBtn');
  
  // Check if task is already completed
  const popup = document.getElementById('taskDetailPopup');
  const isCompleted = popup.dataset.completed === '1';
  
  if (isCompleted) {
    newCompleteTaskBtn.disabled = true;
    newCompleteTaskBtn.innerHTML = '<span class="btn-icon">✅</span>Already Completed';
    newCompleteTaskBtn.style.opacity = '0.6';
    newCompleteTaskBtn.style.cursor = 'not-allowed';
  } else {
    newCompleteTaskBtn.addEventListener('click', handleCompleteTask);
  }
  
  newMoveTaskBtn.addEventListener('click', handleMoveTask);
  newDeleteTaskBtn.addEventListener('click', handleDeleteTask);
  newDeleteScheduleBtn.addEventListener('click', handleDeleteSchedule);
}

async function handleCompleteTask() {
  const popup = document.getElementById('taskDetailPopup');
  const eventId = popup.dataset.eventId;
  const eventTitle = popup.dataset.eventTitle;
  const eventDate = popup.dataset.eventDate;
  
  console.log('=== COMPLETE TASK DEBUG ===');
  console.log('Event ID:', eventId);
  console.log('Event Title:', eventTitle);
  console.log('Event Date:', eventDate);
  
  // Show custom confirmation
  const confirmed = await showCustomConfirm(
    'Mark Task as Completed?',
    `Great job! Mark "${eventTitle}" on ${new Date(eventDate).toLocaleDateString()} as completed?`
  );
  
  if (!confirmed) {
    console.log('User cancelled complete task operation');
    return;
  }
  
  console.log('User confirmed complete task operation');
  
  try {
    const requestBody = {
      topicName: eventTitle,
      eventDate: eventDate
    };
    
    // Include eventId if available for more precise completion
    if (eventId) {
      requestBody.eventId = parseInt(eventId);
    }
    
    console.log('Request body being sent:', requestBody);
    console.log('Making POST request to /api/complete-task...');
    
    const response = await fetch('/api/complete-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('Authentication required - redirecting to login');
        window.location.href = '/login';
        return;
      }
      
      try {
        const errorResult = await response.json();
        console.log('Error response from server:', errorResult);
        showMessage(errorResult.error || 'Failed to mark task as completed', 'error');
      } catch (parseError) {
        console.log('Failed to parse error response:', parseError);
        showMessage('Failed to mark task as completed', 'error');
      }
      return;
    }
    
    const result = await response.json();
    console.log('Success response from server:', result);
    
    if (result.success) {
      console.log('Task marked as completed successfully, closing popup and refreshing calendar');
      // Close the task detail popup after successful completion
      closeTaskPopup();
      // Refresh calendar to show completed state
      if (window.calendar) {
        window.calendar.refetchEvents();
      }
      showMessage('🎉 Great job! Task marked as completed!', 'success');
    } else {
      console.log('Server returned success=false:', result);
      showMessage(result.error || 'Failed to mark task as completed', 'error');
    }
  } catch (error) {
    console.error('Network/JavaScript error during complete task:', error);
    showMessage('Network error. Please try again.', 'error');
  }
}

async function handleMoveTask() {
  const popup = document.getElementById('taskDetailPopup');
  const eventId = popup.dataset.eventId;
  const eventTitle = popup.dataset.eventTitle;
  const eventDate = popup.dataset.eventDate;
  
  console.log('=== MOVE TASK DEBUG ===');
  console.log('Event ID:', eventId);
  console.log('Event Title:', eventTitle);
  console.log('Event Date:', eventDate);
  
  // Close the popup
  closeTaskPopup();
  
  // Enter move mode
  enterMoveMode(eventId, eventTitle, eventDate);
}

function enterMoveMode(eventId, eventTitle, eventDate) {
  console.log('=== ENTERING MOVE MODE ===');
  console.log('Setting move mode variables:', { eventId, eventTitle, eventDate });
  
  // Set global move mode variables
  window.moveMode = true;
  window.moveEventData = { eventId, eventTitle, eventDate };
  
  console.log('Move mode set to:', window.moveMode);
  console.log('Move event data stored:', window.moveEventData);
  
  // Add visual styling for move mode
  document.body.classList.add('move-mode');
  console.log('Added move-mode class to body');
  
  // Show instruction overlay
  const instruction = document.createElement('div');
  instruction.className = 'move-instruction';
  instruction.innerHTML = `
    📅 Click on any date to move "${eventTitle}" there
    <button onclick="exitMoveMode()" style="margin-left: 15px; background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Cancel</button>
  `;
  document.body.appendChild(instruction);
  console.log('Added instruction overlay');
  
  // Store instruction element for cleanup
  window.moveInstruction = instruction;
  console.log('=== MOVE MODE SETUP COMPLETE ===');
}

function exitMoveMode() {
  console.log('=== EXITING MOVE MODE ===');
  // Reset move mode
  window.moveMode = false;
  window.eventToMove = null;
  window.moveEventData = null;
  console.log('Reset move mode variables');
  
  // Remove visual styling
  document.body.classList.remove('move-mode');
  console.log('Removed move-mode class from body');
  
  // Remove instruction overlay
  if (window.moveInstruction) {
    window.moveInstruction.remove();
    window.moveInstruction = null;
    console.log('Removed instruction overlay');
  }
  console.log('=== MOVE MODE EXIT COMPLETE ===');
}

async function moveEventToDate(moveData, newDate) {
  console.log('=== MOVE EVENT TO DATE ===');
  console.log('Move data received:', moveData);
  console.log('New date:', newDate);
  
  const { eventId, eventTitle, eventDate } = moveData;
  
  console.log('Extracted data:');
  console.log('- Event ID:', eventId);
  console.log('- Event Title:', eventTitle);
  console.log('- Original Date:', eventDate);
  console.log('- New Date:', newDate);
  
  // Show confirmation
  console.log('Showing confirmation dialog...');
  const confirmed = await showCustomConfirm(
    'Move Task?',
    `Move "${eventTitle}" from ${new Date(eventDate).toLocaleDateString()} to ${new Date(newDate).toLocaleDateString()}?`
  );
  
  if (!confirmed) {
    console.log('User cancelled move operation');
    exitMoveMode();
    return;
  }
  
  console.log('User confirmed move operation');
  
  try {
    const requestBody = {
      topicName: eventTitle,
      oldDate: eventDate,
      newDate: newDate
    };
    
    // Include eventId if available for more precise moving
    if (eventId) {
      requestBody.eventId = parseInt(eventId);
    }
    
    console.log('Request body being sent:', requestBody);
    console.log('Making POST request to /api/move-task...');
    
    const response = await fetch('/api/move-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('Authentication required - redirecting to login');
        window.location.href = '/login';
        return;
      }
      
      try {
        const errorResult = await response.json();
        console.log('Error response from server:', errorResult);
        showMessage(errorResult.error || 'Failed to move task', 'error');
      } catch (parseError) {
        console.log('Failed to parse error response:', parseError);
        showMessage('Failed to move task', 'error');
      }
      exitMoveMode();
      return;
    }
    
    const result = await response.json();
    console.log('Success response from server:', result);
    
    if (result.success) {
      console.log('Task moved successfully, exiting move mode and refreshing calendar');
      // Exit move mode
      exitMoveMode();
      
      // Refresh calendar to show moved task
      if (window.calendar) {
        console.log('Refreshing calendar events...');
        window.calendar.refetchEvents();
      }
      
      showMessage(`📅 Task moved to ${new Date(newDate).toLocaleDateString()} successfully!`, 'success');
    } else {
      console.log('Server returned success=false:', result);
      showMessage(result.error || 'Failed to move task', 'error');
      exitMoveMode();
    }
  } catch (error) {
    console.error('Network/JavaScript error during move task:', error);
    showMessage('Network error. Please try again.', 'error');
    exitMoveMode();
  }
}

// Make exitMoveMode available globally
window.exitMoveMode = exitMoveMode;

async function handleDeleteTask() {
  const popup = document.getElementById('taskDetailPopup');
  const eventId = popup.dataset.eventId;
  const eventTitle = popup.dataset.eventTitle;
  const eventDate = popup.dataset.eventDate;
  
  console.log('=== DELETE TASK DEBUG ===');
  console.log('Event ID:', eventId);
  console.log('Event Title:', eventTitle);
  console.log('Event Date:', eventDate);
  
  // Show custom confirmation
  const confirmed = await showCustomConfirm(
    'Delete This Review?',
    `Are you sure you want to delete the review for "${eventTitle}" on ${new Date(eventDate).toLocaleDateString()}?`
  );
  
  if (!confirmed) {
    console.log('User cancelled delete task operation');
    return;
  }
  
  console.log('User confirmed delete task operation');
  
  try {
    const requestBody = {
      topicName: eventTitle,
      eventDate: eventDate
    };
    
    // Include eventId if available for more precise deletion
    if (eventId) {
      requestBody.eventId = parseInt(eventId);
    }
    
    console.log('Request body being sent:', requestBody);
    console.log('Making DELETE request to /api/delete-task...');
    
    const response = await fetch('/api/delete-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Authentication required - redirect to login
        console.log('Authentication required - redirecting to login');
        window.location.href = '/login';
        return;
      }
      
      // Try to parse error message from JSON response
      try {
        const errorResult = await response.json();
        console.log('Error response from server:', errorResult);
        showMessage(errorResult.error || 'Failed to delete review', 'error');
      } catch (parseError) {
        console.log('Failed to parse error response:', parseError);
        showMessage('Failed to delete review', 'error');
      }
      return;
    }
    
    const result = await response.json();
    console.log('Success response from server:', result);
    
    if (result.success) {
      console.log('Task deleted successfully, closing popup and refreshing calendar');
      // Close the task detail popup after successful deletion
      closeTaskPopup();
      // Refresh calendar
      if (window.calendar) {
        window.calendar.refetchEvents();
      }
      showMessage('Review deleted successfully!', 'success');
    } else {
      console.log('Server returned success=false:', result);
      showMessage(result.error || 'Failed to delete review', 'error');
    }
  } catch (error) {
    console.error('Network/JavaScript error during delete task:', error);
    showMessage('Network error. Please try again.', 'error');
  }
}

async function handleDeleteSchedule() {
  const popup = document.getElementById('taskDetailPopup');
  const eventTitle = popup.dataset.eventTitle;
  
  console.log('=== DELETE SCHEDULE DEBUG ===');
  console.log('Event Title:', eventTitle);
  
  // Show custom confirmation
  const confirmed = await showCustomConfirm(
    'Delete Entire Schedule?',
    `Are you sure you want to delete the ENTIRE schedule for "${eventTitle}"? This will remove all review dates for this topic.`
  );
  
  if (!confirmed) {
    console.log('User cancelled delete schedule operation');
    return;
  }
  
  console.log('User confirmed delete schedule operation');
  
  try {
    const requestBody = { topicName: eventTitle };
    console.log('Request body being sent:', requestBody);
    console.log('Making DELETE request to /api/delete-schedule...');
    
    const response = await fetch('/api/delete-schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Authentication required - redirect to login
        console.log('Authentication required - redirecting to login');
        window.location.href = '/login';
        return;
      }
      
      // Try to parse error message from JSON response
      try {
        const errorResult = await response.json();
        console.log('Error response from server:', errorResult);
        showMessage(errorResult.error || 'Failed to delete schedule', 'error');
      } catch (parseError) {
        console.log('Failed to parse error response:', parseError);
        showMessage('Failed to delete schedule', 'error');
      }
      return;
    }
    
    const result = await response.json();
    console.log('Success response from server:', result);
    
    if (result.success) {
      console.log('Schedule deleted successfully, closing popup and refreshing calendar');
      // Close the task detail popup after successful deletion
      closeTaskPopup();
      // Refresh calendar
      if (window.calendar) {
        window.calendar.refetchEvents();
      }
      showMessage('Schedule deleted successfully!', 'success');
    } else {
      console.log('Server returned success=false:', result);
      showMessage(result.error || 'Failed to delete schedule', 'error');
    }
  } catch (error) {
    console.error('Network/JavaScript error during delete schedule:', error);
    showMessage('Network error. Please try again.', 'error');
  }
}

function showMessage(message, type) {
  // Remove existing messages
  const existing = document.querySelector('.dashboard-message');
  if (existing) existing.remove();
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'dashboard-message';
  messageDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10002;
    min-width: 200px;
    text-align: center;
    ${type === 'error' 
      ? 'background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;'
      : 'background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;'
    }
  `;
  messageDiv.textContent = message;
  
  document.body.appendChild(messageDiv);
  
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 5000);
}

function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/logout', {
          method: 'POST'
        });
        
        if (response.ok) {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Logout failed:', error);
      }
    });
  }
}

async function loadStats() {
  try {
    const response = await fetch('/api/events');
    if (response.ok) {
      const events = await response.json();
      
      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayEvents = events.filter(event => event.start === today);
      const uniqueTopics = new Set(events.map(event => event.title));
      
      // Update stats display
      document.getElementById('totalTasks').textContent = uniqueTopics.size;
      document.getElementById('todayReviews').textContent = todayEvents.length;
      
      // Calculate week streak (simplified)
      const weekStreak = calculateWeekStreak(events);
      document.getElementById('weekStreak').textContent = weekStreak;
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

function calculateWeekStreak(events) {
  // Simplified streak calculation
  // In a real app, you'd want to track actual completion of reviews
  const today = new Date();
  let streak = 0;
  
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    const hasEvents = events.some(event => event.start === dateStr);
    if (hasEvents) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

// Custom confirmation dialog
function showCustomConfirm(title, message) {
  return new Promise((resolve) => {
    const popup = document.getElementById('confirmationPopup');
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const cancelBtn = document.getElementById('confirmCancel');
    const deleteBtn = document.getElementById('confirmDelete');
    
    // Set content
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Show popup
    popup.classList.add('show');
    
    // Handle buttons
    const handleCancel = () => {
      popup.classList.remove('show');
      cancelBtn.removeEventListener('click', handleCancel);
      deleteBtn.removeEventListener('click', handleConfirm);
      resolve(false);
    };
    
    const handleConfirm = () => {
      popup.classList.remove('show');
      cancelBtn.removeEventListener('click', handleCancel);
      deleteBtn.removeEventListener('click', handleConfirm);
      resolve(true);
    };
    
    cancelBtn.addEventListener('click', handleCancel);
    deleteBtn.addEventListener('click', handleConfirm);
    
    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleEscape);
        handleCancel();
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}

function closeConfirmPopup() {
  const popup = document.getElementById('confirmationPopup');
  popup.classList.remove('show');
}