import { supabase, getCurrentUser } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = '/login';
    return;
  }

  const form = document.getElementById('addTaskForm');

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('startDate').min = today;
  document.getElementById('endDate').min = today;

  document.getElementById('startDate').addEventListener('change', (e) => {
    document.getElementById('endDate').min = e.target.value;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = {
      topicName: formData.get('topicName'),
      familiarity: parseInt(formData.get('familiarity')),
      difficulty: parseInt(formData.get('difficulty')),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
      taskColor: formData.get('taskColor') || '#475569'
    };

    if (new Date(data.endDate) <= new Date(data.startDate)) {
      showError('End date must be after start date');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Schedule...';
    submitBtn.disabled = true;

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        window.location.href = '/login';
        return;
      }

      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          user_id: userId,
          topic_name: data.topicName,
          topic_familiarity: data.familiarity,
          topic_difficulty: data.difficulty,
          start_date: data.startDate,
          end_date: data.endDate,
          task_color: data.taskColor
        }])
        .select()
        .single();

      if (taskError) throw taskError;

      const EF = Math.max((data.difficulty + data.familiarity) / 2, 1.5);
      let interval = 1;

      const start = new Date(data.startDate);
      const end = new Date(data.endDate);

      const events = [];

      events.push({
        user_id: userId,
        task_id: taskData.id,
        topic_name: data.topicName,
        event_date: data.startDate,
        start_date: data.startDate,
        end_date: data.endDate,
        task_color: data.taskColor,
        completed: false
      });

      for (let i = 1; i < 100; i++) {
        const nextInterval = Math.round(EF * interval);
        if (nextInterval > 1000) break;

        interval = nextInterval;
        const eventDate = new Date(start);
        eventDate.setDate(eventDate.getDate() + nextInterval);

        if (eventDate <= end) {
          const eventDateStr = eventDate.toISOString().split('T')[0];
          events.push({
            user_id: userId,
            task_id: taskData.id,
            topic_name: data.topicName,
            event_date: eventDateStr,
            start_date: data.startDate,
            end_date: data.endDate,
            task_color: data.taskColor,
            completed: false
          });
        } else {
          break;
        }
      }

      const { error: eventsError } = await supabase
        .from('events')
        .insert(events);

      if (eventsError) throw eventsError;

      showSuccess('Schedule created successfully!');
      setTimeout(() => {
        window.location.href = '/dashboard?success=schedule-created';
      }, 1500);
    } catch (error) {
      console.error('Error creating schedule:', error);
      showError('Failed to create schedule. Please try again.');
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
});

function showError(message) {
  showMessage(message, 'error');
}

function showSuccess(message) {
  showMessage(message, 'success');
}

function showMessage(message, type) {
  const existing = document.querySelector('.message');
  if (existing) existing.remove();

  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  messageDiv.style.cssText = `
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 16px;
    font-size: 14px;
    font-weight: 500;
    ${type === 'error'
      ? 'background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;'
      : 'background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0;'
    }
  `;
  messageDiv.textContent = message;

  const form = document.querySelector('.task-form');
  form.insertBefore(messageDiv, form.firstChild);

  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 5000);
}
