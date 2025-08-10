// Add task functionality
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addTaskForm');
  
  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('startDate').min = today;
  document.getElementById('endDate').min = today;
  
  // Update end date minimum when start date changes
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
    
    // Validation
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      showError('End date must be after start date');
      return;
    }
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Schedule...';
    submitBtn.disabled = true;
    
    try {
      const response = await fetch('/api/add-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (result.success) {
        showSuccess('Schedule created successfully!');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        showError(result.error || 'Failed to create schedule');
      }
    } catch (error) {
      showError('Network error. Please try again.');
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
  // Remove existing messages
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