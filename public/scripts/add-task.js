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
  
  // Preview schedule calculation
  const previewSchedule = () => {
    const familiarity = parseInt(document.getElementById('familiarity').value) || 3;
    const difficulty = parseInt(document.getElementById('difficulty').value) || 3;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
      const EF = Math.max((difficulty + familiarity) / 2, 1.5);
      const daysDiff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
      
      let reviewCount = 1;
      let interval = 1;
      let totalDays = 0;
      
      while (totalDays < daysDiff && reviewCount < 20) {
        const nextInterval = Math.round(EF * interval);
        totalDays += nextInterval;
        if (totalDays <= daysDiff) {
          reviewCount++;
          interval = nextInterval;
        } else {
          break;
        }
      }
      
      updatePreview(reviewCount, EF.toFixed(1));
    }
  };
  
  // Add event listeners for preview
  ['familiarity', 'difficulty', 'startDate', 'endDate'].forEach(id => {
    document.getElementById(id).addEventListener('change', previewSchedule);
  });
  
  function updatePreview(reviewCount, easinessFactor) {
    let previewDiv = document.querySelector('.schedule-preview');
    if (!previewDiv) {
      previewDiv = document.createElement('div');
      previewDiv.className = 'schedule-preview';
      previewDiv.style.cssText = `
        background: var(--bg-tertiary);
        padding: 16px;
        border-radius: 8px;
        margin-top: 16px;
        border: 1px solid var(--border-color);
      `;
      document.querySelector('.form-section:last-of-type').appendChild(previewDiv);
    }
    
    previewDiv.innerHTML = `
      <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Schedule Preview</h4>
      <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
        📅 Estimated ${reviewCount} review sessions<br>
        🧠 Easiness Factor: ${easinessFactor}<br>
        ⏱️ Intervals will increase based on your ratings
      </p>
    `;
  }
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