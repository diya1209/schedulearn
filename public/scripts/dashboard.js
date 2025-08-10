// Dashboard functionality
document.addEventListener('DOMContentLoaded', async () => {
  // Load user info
  await loadUserInfo();
  
  // Initialize calendar
  initializeCalendar();
  
  // Setup logout
  setupLogout();
  
  // Load stats
  await loadStats();
});

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
      right: 'Today'
    },
    titleFormat: { month: 'long' },
    events: '/api/events',
    eventDisplay: 'block',
    dayMaxEvents: 3,
    eventClick: function(info) {
      // Show event details
      showEventDetails(info.event);
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

function showEventDetails(event) {
  // Create a simple modal or alert for event details
  const details = `
    Topic: ${event.title}
    Date: ${event.start.toLocaleDateString()}
    
    This is a scheduled review session based on the forgetting curve algorithm.
  `;
  
  alert(details);
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