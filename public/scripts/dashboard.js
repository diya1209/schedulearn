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
    eventClick: function(info) {
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

function showTaskDetailPopup(event) {
  const popup = document.getElementById('taskDetailPopup');
  
  // Populate popup with event data
  document.getElementById('taskTopicName').textContent = event.title;
  document.getElementById('taskReviewDate').textContent = event.start.toLocaleDateString();
  
  // Get study period from event properties
  const startDate = event.extendedProps?.startDate || event.start.toISOString().split('T')[0];
  const endDate = event.extendedProps?.endDate || event.start.toISOString().split('T')[0];
  document.getElementById('taskStudyPeriod').textContent = `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
  
  // Store event data for delete operations
  popup.dataset.eventId = event.extendedProps?.eventId || event.id || '';
  popup.dataset.eventTitle = event.title;
  popup.dataset.eventDate = event.start.toISOString().split('T')[0];
  popup.dataset.startDate = startDate;
  popup.dataset.endDate = endDate;
  
  console.log('Event data stored:', {
    eventId: popup.dataset.eventId,
    title: popup.dataset.eventTitle,
    date: popup.dataset.eventDate
  });
  
  // Setup delete button handlers
  setupDeleteHandlers();
  
  // Show popup
  popup.classList.add('show');
}

function closeTaskPopup() {
  const popup = document.getElementById('taskDetailPopup');
  popup.classList.remove('show');
}

function setupDeleteHandlers() {
  const deleteTaskBtn = document.getElementById('deleteTaskBtn');
  const deleteScheduleBtn = document.getElementById('deleteScheduleBtn');
  
  // Remove existing listeners
  deleteTaskBtn.replaceWith(deleteTaskBtn.cloneNode(true));
  deleteScheduleBtn.replaceWith(deleteScheduleBtn.cloneNode(true));
  
  // Get new references
  const newDeleteTaskBtn = document.getElementById('deleteTaskBtn');
  const newDeleteScheduleBtn = document.getElementById('deleteScheduleBtn');
  
  newDeleteTaskBtn.addEventListener('click', handleDeleteTask);
  newDeleteScheduleBtn.addEventListener('click', handleDeleteSchedule);
}

async function handleDeleteTask() {
  const popup = document.getElementById('taskDetailPopup');
  const eventId = popup.dataset.eventId;
  const eventTitle = popup.dataset.eventTitle;
  const eventDate = popup.dataset.eventDate;
  
  if (!confirm(`Are you sure you want to delete the review for "${eventTitle}" on ${new Date(eventDate).toLocaleDateString()}?`)) {
    return;
  }
  
  try {
    const requestBody = {
      topicName: eventTitle,
      eventDate: eventDate
    };
    
    // Include eventId if available for more precise deletion
    if (eventId) {
      requestBody.eventId = parseInt(eventId);
    }
    
    console.log('Deleting task with data:', requestBody);
    
    const response = await fetch('/api/delete-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    const result = await response.json();
    console.log('Delete task response:', result);
    
    if (result.success) {
      closeTaskPopup();
      // Refresh calendar
      if (window.calendar) {
        window.calendar.refetchEvents();
      }
      showMessage('Review deleted successfully!', 'success');
    } else {
      showMessage(result.error || 'Failed to delete review', 'error');
    }
  } catch (error) {
    console.error('Delete task error:', error);
    showMessage(`Network error: ${error.message}. Please try again.`, 'error');
  }
}

async function handleDeleteSchedule() {
  const popup = document.getElementById('taskDetailPopup');
  const eventTitle = popup.dataset.eventTitle;
  
  if (!confirm(`Are you sure you want to delete the ENTIRE schedule for "${eventTitle}"? This will remove all review dates for this topic.`)) {
    return;
  }
  
  try {
    console.log('Deleting schedule for topic:', eventTitle);
    
    const response = await fetch('/api/delete-schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topicName: eventTitle
      })
    });
    
    const result = await response.json();
    console.log('Delete schedule response:', result);
    
    if (result.success) {
      closeTaskPopup();
      // Refresh calendar
      if (window.calendar) {
        window.calendar.refetchEvents();
      }
      showMessage('Schedule deleted successfully!', 'success');
    } else {
      showMessage(result.error || 'Failed to delete schedule', 'error');
    }
  } catch (error) {
    console.error('Delete schedule error:', error);
    showMessage(`Network error: ${error.message}. Please try again.`, 'error');
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
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10002;
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