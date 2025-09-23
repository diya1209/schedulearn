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
  
  // Setup move mode buttons
  const confirmMoveBtn = document.getElementById('confirmMoveBtn');
  const cancelMoveBtn = document.getElementById('cancelMoveBtn');
  
  if (confirmMoveBtn) {
    confirmMoveBtn.addEventListener('click', confirmMove);
  }
  
  if (cancelMoveBtn) {
    cancelMoveBtn.addEventListener('click', exitMoveMode);
  }
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
window.enterMoveMode = enterMoveMode;
window.exitMoveMode = exitMoveMode;
window.confirmMove = confirmMove;

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
    editable: false, // Will be enabled in move mode
    eventDrop: function(info) {
      if (window.moveMode && window.moveMode.active) {
        handleEventDrop(info);
      } else {
        // Revert if not in move mode
        info.revert();
      }
    },
    eventClick: function(info) {
      // Don't show popup if in move mode
      if (window.moveMode && window.moveMode.active) {
        return;
      }
      // Show event details
      showTaskDetailPopup(info.event);
    },
    dateClick: function(info) {
      // Handle date click - could add quick task creation
      console.log('Date clicked:', info.dateStr);
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

// Move mode functionality
let moveMode = {
  active: false,
  selectedEvent: null,
  originalDate: null,
  newDate: null
};
window.moveMode = moveMode;

function enterMoveMode(eventData) {
  console.log('=== ENTERING MOVE MODE ===');
  console.log('Event data:', eventData);
  
  moveMode.active = true;
  moveMode.selectedEvent = eventData;
  moveMode.originalDate = eventData.eventDate;
  moveMode.newDate = null;
  
  // Enable dragging on calendar
  window.calendar.setOption('editable', true);
  
  // Show move mode overlay with instructions but no confirm button yet
  showMoveInstructions();
  
  // Grey out all events and highlight the selected one
  const allEvents = window.calendar.getEvents();
  allEvents.forEach(event => {
    if (event.title === eventData.eventTitle && event.start.toISOString().split('T')[0] === eventData.eventDate) {
      // This is the selected event - highlight it
      event.setProp('className', 'selected-for-move');
      event.setProp('backgroundColor', '#f59e0b');
      event.setProp('borderColor', '#f59e0b');
    } else {
      // Grey out other events
      event.setProp('className', 'greyed-out');
      event.setProp('backgroundColor', '#6b7280');
      event.setProp('borderColor', '#6b7280');
    }
  });
  
  console.log('Move mode activated');
}

function showMoveInstructions() {
  const overlay = document.getElementById('moveModeOverlay');
  const header = overlay.querySelector('.move-mode-header');
  
  header.innerHTML = `
    <h3>📅 Move Task Mode</h3>
    <p>Drag the highlighted orange task to a new date on the calendar</p>
    <div class="move-mode-actions">
      <button class="btn btn-outline" id="cancelMoveBtn">Cancel</button>
    </div>
  `;
  
  // Re-attach cancel button event listener
  const cancelBtn = document.getElementById('cancelMoveBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', exitMoveMode);
  }
  
  overlay.classList.add('show');
}

function showMoveConfirmation(newDate) {
  const overlay = document.getElementById('moveModeOverlay');
  const header = overlay.querySelector('.move-mode-header');
  
  const formattedDate = new Date(newDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  header.innerHTML = `
    <h3>📅 Confirm Move</h3>
    <p>Move "${moveMode.selectedEvent.eventTitle}" to <strong>${formattedDate}</strong>?</p>
    <div class="move-mode-actions">
      <button class="btn btn-outline" id="cancelMoveBtn">Cancel</button>
      <button class="btn btn-success" id="confirmMoveBtn">Confirm Move</button>
    </div>
  `;
  
  // Re-attach event listeners
  const cancelBtn = document.getElementById('cancelMoveBtn');
  const confirmBtn = document.getElementById('confirmMoveBtn');
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', exitMoveMode);
  }
  
  if (confirmBtn) {
    confirmBtn.addEventListener('click', confirmMove);
  }
}
function exitMoveMode() {
  console.log('=== EXITING MOVE MODE ===');
  
  moveMode.active = false;
  moveMode.selectedEvent = null;
  moveMode.originalDate = null;
  moveMode.newDate = null;
  
  // Disable dragging on calendar
  window.calendar.setOption('editable', false);
  
  // Hide move mode overlay
  const overlay = document.getElementById('moveModeOverlay');
  overlay.classList.remove('show');
  
  // Refresh calendar to restore original colors
  window.calendar.refetchEvents();
  
  console.log('Move mode deactivated');
}

function handleEventDrop(info) {
  console.log('=== EVENT DROPPED ===');
  console.log('New date:', info.event.start.toISOString().split('T')[0]);
  
  moveMode.newDate = info.event.start.toISOString().split('T')[0];
  
  // Show confirmation UI
  showMoveConfirmation(moveMode.newDate);
}

async function confirmMove() {
  if (!moveMode.newDate || !moveMode.selectedEvent) {
    showMessage('Please drag the task to a new date first', 'error');
    return;
  }
  
  console.log('=== CONFIRMING MOVE ===');
  console.log('Moving from:', moveMode.originalDate);
  console.log('Moving to:', moveMode.newDate);
  
  try {
    const response = await fetch('/api/move-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId: moveMode.selectedEvent.eventId,
        topicName: moveMode.selectedEvent.eventTitle,
        originalDate: moveMode.originalDate,
        newDate: moveMode.newDate
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to move task');
    }
    
    const result = await response.json();
    
    if (result.success) {
      showMessage('Task moved successfully!', 'success');
      exitMoveMode();
      // Refresh calendar
      window.calendar.refetchEvents();
    } else {
      showMessage(result.error || 'Failed to move task', 'error');
    }
  } catch (error) {
    console.error('Error moving task:', error);
    showMessage('Failed to move task. Please try again.', 'error');
  }
}

function showTaskDetailPopup(event) {
  const popup = document.getElementById('taskDetailPopup');
  
  console.log('=== SHOW TASK DETAIL POPUP ===');
  console.log('Event object:', event);
  console.log('Event title:', event.title);
  console.log('Event extendedProps:', event.extendedProps);
  
  // Populate popup with event data
  document.getElementById('taskTopicName').textContent = event.title;
  
  // Store event data for delete operations
  popup.dataset.eventId = event.extendedProps?.eventId || event.id || '';
  popup.dataset.eventTitle = event.title;
  popup.dataset.eventDate = event.start.toISOString().split('T')[0];
  popup.dataset.startDate = event.extendedProps?.startDate || event.start.toISOString().split('T')[0];
  popup.dataset.endDate = event.extendedProps?.endDate || event.start.toISOString().split('T')[0];
  popup.dataset.completed = event.extendedProps?.completed || 'false';
  
  console.log('Event data stored:', {
    eventId: popup.dataset.eventId,
    title: popup.dataset.eventTitle,
    date: popup.dataset.eventDate,
    completed: popup.dataset.completed
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
  const deleteTaskBtn = document.getElementById('deleteTaskBtn');
  const deleteScheduleBtn = document.getElementById('deleteScheduleBtn');
  const moveTaskBtn = document.getElementById('moveTaskBtn');
  
  console.log('=== SETUP TASK ACTION HANDLERS ===');
  console.log('Complete button found:', !!completeTaskBtn);
  console.log('Delete task button found:', !!deleteTaskBtn);
  console.log('Delete schedule button found:', !!deleteScheduleBtn);
  console.log('Move task button found:', !!moveTaskBtn);
  
  // Remove existing listeners
  completeTaskBtn.replaceWith(completeTaskBtn.cloneNode(true));
  deleteTaskBtn.replaceWith(deleteTaskBtn.cloneNode(true));
  deleteScheduleBtn.replaceWith(deleteScheduleBtn.cloneNode(true));
  moveTaskBtn.replaceWith(moveTaskBtn.cloneNode(true));
  
  // Get new references
  const newCompleteTaskBtn = document.getElementById('completeTaskBtn');
  const newDeleteTaskBtn = document.getElementById('deleteTaskBtn');
  const newDeleteScheduleBtn = document.getElementById('deleteScheduleBtn');
  const newMoveTaskBtn = document.getElementById('moveTaskBtn');
  
  // Check if task is already completed
  const popup = document.getElementById('taskDetailPopup');
  const isCompleted = popup.dataset.completed === 'true' || popup.dataset.completed === '1';
  
  console.log('Task completion status:', {
    completed: popup.dataset.completed,
    isCompleted: isCompleted,
    eventId: popup.dataset.eventId,
    eventTitle: popup.dataset.eventTitle,
    eventDate: popup.dataset.eventDate
  });
  
  if (isCompleted) {
    console.log('Task is already completed, disabling button');
    newCompleteTaskBtn.disabled = true;
    newCompleteTaskBtn.innerHTML = '<span class="btn-icon">✅</span>Already Completed';
    newCompleteTaskBtn.style.opacity = '0.6';
    newCompleteTaskBtn.style.cursor = 'not-allowed';
  } else {
    console.log('Task is not completed, adding click handler');
    newCompleteTaskBtn.addEventListener('click', handleCompleteTask);
  }
  
  newDeleteTaskBtn.addEventListener('click', handleDeleteTask);
  newDeleteScheduleBtn.addEventListener('click', handleDeleteSchedule);
  newMoveTaskBtn.addEventListener('click', handleMoveTask);
}

function handleMoveTask() {
  const popup = document.getElementById('taskDetailPopup');
  const eventData = {
    eventId: popup.dataset.eventId,
    eventTitle: popup.dataset.eventTitle,
    eventDate: popup.dataset.eventDate
  };
  
  console.log('=== MOVE TASK CLICKED ===');
  console.log('Event data for move:', eventData);
  
  // Close the task detail popup
  closeTaskPopup();
  
  // Enter move mode
  enterMoveMode(eventData);
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
  console.log('Function called successfully');
  
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
    
    // Change button text based on the action
    if (title.includes('Completed')) {
      deleteBtn.textContent = 'Complete';
      deleteBtn.className = 'btn btn-success';
    } else {
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'btn btn-error';
    }
    
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