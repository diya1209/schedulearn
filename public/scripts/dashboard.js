import { supabase, getCurrentUser } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login';
    return;
  }

  checkForSuccessMessage();
  await loadUserInfo();
  initializeCalendar();
  setupLogout();
  await loadStats();

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

window.closeSuccessPopup = closeSuccessPopup;
window.closeTaskPopup = closeTaskPopup;
window.showCustomConfirm = showCustomConfirm;
window.closeConfirmPopup = closeConfirmPopup;
window.enterMoveMode = enterMoveMode;
window.exitMoveMode = exitMoveMode;
window.confirmMove = confirmMove;

async function loadUserInfo() {
  const username = localStorage.getItem('username');
  if (username) {
    document.getElementById('username').textContent = username;
  }
}

async function loadEventsFromSupabase() {
  const userId = localStorage.getItem('userId');
  if (!userId) return [];

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('event_date');

  if (error) {
    console.error('Error loading events:', error);
    return [];
  }

  return events.map(event => ({
    id: event.id,
    title: event.topic_name,
    start: event.event_date,
    end: event.event_date,
    allDay: true,
    backgroundColor: event.task_color || '#475569',
    borderColor: event.task_color || '#475569',
    textColor: '#ffffff',
    className: event.completed ? 'completed' : '',
    extendedProps: {
      eventId: event.id,
      startDate: event.start_date,
      endDate: event.end_date,
      completed: event.completed
    }
  }));
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
    events: loadEventsFromSupabase,
    eventDisplay: 'block',
    dayMaxEvents: false,
    moreLinkClick: 'popover',
    height: 'auto',
    editable: false,
    eventDrop: function(info) {
      if (window.moveMode && window.moveMode.active) {
        handleEventDrop(info);
      } else {
        info.revert();
      }
    },
    eventClick: function(info) {
      if (window.moveMode && window.moveMode.active) {
        return;
      }
      showTaskDetailPopup(info.event);
    },
    dateClick: function(info) {
      console.log('Date clicked:', info.dateStr);
    },
    eventDidMount: function(info) {
      info.el.title = `Study: ${info.event.title}`;
    }
  });

  calendar.render();
  window.calendar = calendar;
}

let moveMode = {
  active: false,
  selectedEvent: null,
  originalDate: null,
  newDate: null
};
window.moveMode = moveMode;

function enterMoveMode(eventData) {
  moveMode.active = true;
  moveMode.selectedEvent = eventData;
  moveMode.originalDate = eventData.eventDate;
  moveMode.newDate = null;

  window.calendar.setOption('editable', true);
  showMoveInstructions();

  const allEvents = window.calendar.getEvents();
  allEvents.forEach(event => {
    if (event.title === eventData.eventTitle && event.start.toISOString().split('T')[0] === eventData.eventDate) {
      event.setProp('className', 'selected-for-move');
      event.setProp('backgroundColor', '#f59e0b');
      event.setProp('borderColor', '#f59e0b');
    } else {
      event.setProp('className', 'greyed-out');
      event.setProp('backgroundColor', '#6b7280');
      event.setProp('borderColor', '#6b7280');
    }
  });
}

function showMoveInstructions() {
  const overlay = document.getElementById('moveModeOverlay');
  const header = overlay.querySelector('.move-mode-header');

  header.innerHTML = `
    <h3>📅 Move Task Mode</h3>
    <p>Drag the orange task to a new date</p>
    <div class="move-mode-actions">
      <button class="btn btn-outline" id="cancelMoveBtn">Cancel</button>
    </div>
  `;

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
  moveMode.active = false;
  moveMode.selectedEvent = null;
  moveMode.originalDate = null;
  moveMode.newDate = null;

  window.calendar.setOption('editable', false);

  const overlay = document.getElementById('moveModeOverlay');
  overlay.classList.remove('show');

  window.calendar.refetchEvents();
}

function handleEventDrop(info) {
  moveMode.newDate = info.event.start.toISOString().split('T')[0];
  showMoveConfirmation(moveMode.newDate);
}

async function confirmMove() {
  if (!moveMode.newDate || !moveMode.selectedEvent) {
    showMessage('Please drag the task to a new date first', 'error');
    return;
  }

  const userId = localStorage.getItem('userId');
  if (!userId) {
    window.location.href = '/login';
    return;
  }

  try {
    const { data: existingEvent } = await supabase
      .from('events')
      .select('id')
      .eq('user_id', userId)
      .eq('topic_name', moveMode.selectedEvent.eventTitle)
      .eq('event_date', moveMode.newDate)
      .maybeSingle();

    if (existingEvent) {
      showMessage('There is already a review scheduled for this topic on that date', 'error');
      return;
    }

    const { error } = await supabase
      .from('events')
      .update({ event_date: moveMode.newDate })
      .eq('id', moveMode.selectedEvent.eventId)
      .eq('user_id', userId);

    if (error) throw error;

    showMessage('Task moved successfully!', 'success');
    exitMoveMode();
    window.calendar.refetchEvents();
  } catch (error) {
    console.error('Error moving task:', error);
    showMessage('Failed to move task. Please try again.', 'error');
  }
}

function showTaskDetailPopup(event) {
  const popup = document.getElementById('taskDetailPopup');

  document.getElementById('taskPopupTitle').textContent = event.title;

  popup.dataset.eventId = event.extendedProps?.eventId || event.id || '';
  popup.dataset.eventTitle = event.title;
  popup.dataset.eventDate = event.start.toISOString().split('T')[0];
  popup.dataset.startDate = event.extendedProps?.startDate || event.start.toISOString().split('T')[0];
  popup.dataset.endDate = event.extendedProps?.endDate || event.start.toISOString().split('T')[0];
  popup.dataset.completed = event.extendedProps?.completed || 'false';

  setupTaskActionHandlers();
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

  completeTaskBtn.replaceWith(completeTaskBtn.cloneNode(true));
  deleteTaskBtn.replaceWith(deleteTaskBtn.cloneNode(true));
  deleteScheduleBtn.replaceWith(deleteScheduleBtn.cloneNode(true));
  moveTaskBtn.replaceWith(moveTaskBtn.cloneNode(true));

  const newCompleteTaskBtn = document.getElementById('completeTaskBtn');
  const newDeleteTaskBtn = document.getElementById('deleteTaskBtn');
  const newDeleteScheduleBtn = document.getElementById('deleteScheduleBtn');
  const newMoveTaskBtn = document.getElementById('moveTaskBtn');

  const popup = document.getElementById('taskDetailPopup');
  const isCompleted = popup.dataset.completed === 'true' || popup.dataset.completed === '1';

  if (isCompleted) {
    newCompleteTaskBtn.disabled = true;
    newCompleteTaskBtn.innerHTML = '<span class="btn-icon">✅</span>Already Completed';
    newCompleteTaskBtn.style.opacity = '0.6';
    newCompleteTaskBtn.style.cursor = 'not-allowed';
  } else {
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

  closeTaskPopup();
  enterMoveMode(eventData);
}

async function handleCompleteTask() {
  const popup = document.getElementById('taskDetailPopup');
  const eventId = popup.dataset.eventId;
  const eventTitle = popup.dataset.eventTitle;
  const eventDate = popup.dataset.eventDate;

  const confirmed = await showCustomConfirm(
    'Mark Task as Completed?',
    `Great job! Mark "${eventTitle}" on ${new Date(eventDate).toLocaleDateString()} as completed?`
  );

  if (!confirmed) return;

  const userId = localStorage.getItem('userId');
  if (!userId) {
    window.location.href = '/login';
    return;
  }

  try {
    const { error } = await supabase
      .from('events')
      .update({ completed: true })
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) throw error;

    closeTaskPopup();
    if (window.calendar) {
      window.calendar.refetchEvents();
    }
    showMessage('🎉 Great job! Task marked as completed!', 'success');
  } catch (error) {
    console.error('Error completing task:', error);
    showMessage('Failed to mark task as completed. Please try again.', 'error');
  }
}

async function handleDeleteTask() {
  const popup = document.getElementById('taskDetailPopup');
  const eventId = popup.dataset.eventId;
  const eventTitle = popup.dataset.eventTitle;
  const eventDate = popup.dataset.eventDate;

  const confirmed = await showCustomConfirm(
    'Delete This Review?',
    `Are you sure you want to delete the review for "${eventTitle}" on ${new Date(eventDate).toLocaleDateString()}?`
  );

  if (!confirmed) return;

  const userId = localStorage.getItem('userId');
  if (!userId) {
    window.location.href = '/login';
    return;
  }

  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (error) throw error;

    closeTaskPopup();
    if (window.calendar) {
      window.calendar.refetchEvents();
    }
    showMessage('Review deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting task:', error);
    showMessage('Failed to delete review. Please try again.', 'error');
  }
}

async function handleDeleteSchedule() {
  const popup = document.getElementById('taskDetailPopup');
  const eventTitle = popup.dataset.eventTitle;

  const confirmed = await showCustomConfirm(
    'Delete Entire Schedule?',
    `Are you sure you want to delete the ENTIRE schedule for "${eventTitle}"? This will remove all review dates for this topic.`
  );

  if (!confirmed) return;

  const userId = localStorage.getItem('userId');
  if (!userId) {
    window.location.href = '/login';
    return;
  }

  try {
    const { data: taskInfo } = await supabase
      .from('events')
      .select('task_id')
      .eq('user_id', userId)
      .eq('topic_name', eventTitle)
      .limit(1)
      .maybeSingle();

    await supabase
      .from('events')
      .delete()
      .eq('user_id', userId)
      .eq('topic_name', eventTitle);

    if (taskInfo && taskInfo.task_id) {
      await supabase
        .from('tasks')
        .delete()
        .eq('id', taskInfo.task_id)
        .eq('user_id', userId);
    }

    closeTaskPopup();
    if (window.calendar) {
      window.calendar.refetchEvents();
    }
    showMessage('Schedule deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting schedule:', error);
    showMessage('Failed to delete schedule. Please try again.', 'error');
  }
}

function showMessage(message, type) {
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
      await supabase.auth.signOut();
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      window.location.href = '/';
    });
  }
}

async function loadStats() {
  const events = await loadEventsFromSupabase();

  const today = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(event => event.start === today);
  const uniqueTopics = new Set(events.map(event => event.title));

  document.getElementById('totalTasks').textContent = uniqueTopics.size;
  document.getElementById('todayReviews').textContent = todayEvents.length;

  const weekStreak = calculateWeekStreak(events);
  document.getElementById('weekStreak').textContent = weekStreak;
}

function calculateWeekStreak(events) {
  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];

    const dayEvents = events.filter(event => event.start === dateStr);

    if (dayEvents.length > 0) {
      const allCompleted = dayEvents.every(event => event.extendedProps?.completed);
      if (allCompleted) {
        streak++;
      } else {
        break;
      }
    } else if (i === 0) {
      break;
    } else {
      streak++;
    }
  }

  return streak;
}

function showCustomConfirm(title, message) {
  return new Promise((resolve) => {
    const popup = document.getElementById('confirmationPopup');
    const titleEl = document.getElementById('confirmTitle');
    const messageEl = document.getElementById('confirmMessage');
    const cancelBtn = document.getElementById('confirmCancel');
    const deleteBtn = document.getElementById('confirmDelete');

    titleEl.textContent = title;
    messageEl.textContent = message;

    if (title.includes('Completed')) {
      deleteBtn.textContent = 'Complete';
      deleteBtn.className = 'btn btn-success';
    } else {
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'btn btn-error';
    }

    popup.classList.add('show');

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
