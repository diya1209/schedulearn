import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import SQLiteStore from 'connect-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const SQLiteStoreSession = SQLiteStore(session);

// Initialize database
let db;
async function initDatabase() {
  db = await open({
    filename: 'schedulearn.db',
    driver: sqlite3.Database
  });

// Initialize database tables
await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    topic_name TEXT NOT NULL,
    topic_familiarity INTEGER NOT NULL,
    topic_difficulty INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    task_color TEXT DEFAULT '#4f46e5',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    topic_name TEXT NOT NULL,
    event_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    task_color TEXT DEFAULT '#4f46e5',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (task_id) REFERENCES tasks (id)
  );
`);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  store: new SQLiteStoreSession({
    db: 'sessions.db',
    table: 'sessions'
  }),
  secret: 'schedulearn-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true
  }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    // Check if this is an API request
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    res.redirect('/login');
  }
};

// Routes
app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.get('/login', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
});

app.get('/signup', (req, res) => {
  if (req.session.userId) {
    res.redirect('/dashboard');
  } else {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
  }
});

app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/add-task', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'add-task.html'));
});

// API Routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run('INSERT INTO users (username, password) VALUES (?, ?)', username, hashedPassword);
    
    req.session.userId = result.lastID;
    req.session.username = username;
    
    res.json({ success: true, redirect: '/dashboard' });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const user = await db.get('SELECT id, username, password FROM users WHERE username = ?', username);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    
    res.json({ success: true, redirect: '/dashboard' });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, redirect: '/' });
});

app.post('/api/add-task', requireAuth, async (req, res) => {
  const { topicName, familiarity, difficulty, startDate, endDate, taskColor } = req.body;
  const userId = req.session.userId;
  
  try {
    // Insert task
    const taskResult = await db.run(`
      INSERT INTO tasks (user_id, topic_name, topic_familiarity, topic_difficulty, start_date, end_date, task_color)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, userId, topicName, familiarity, difficulty, startDate, endDate, taskColor || '#475569');
    
    const taskId = taskResult.lastID;
    
    // Calculate forgetting curve schedule
    const EF = Math.max((parseInt(difficulty) + parseInt(familiarity)) / 2, 1.5);
    let interval = 1;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Add initial event
    await db.run(`
      INSERT INTO events (user_id, task_id, topic_name, event_date, start_date, end_date, task_color)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, userId, taskId, topicName, startDate, startDate, endDate, taskColor || '#475569');
    
    // Generate review schedule
    for (let i = 1; i < 100; i++) {
      const nextInterval = Math.round(EF * interval);
      if (nextInterval > 1000) break;
      
      interval = nextInterval;
      const eventDate = new Date(start);
      eventDate.setDate(eventDate.getDate() + nextInterval);
      
      if (eventDate <= end) {
        const eventDateStr = eventDate.toISOString().split('T')[0];
        await db.run(`
          INSERT INTO events (user_id, task_id, topic_name, event_date, start_date, end_date, task_color)
          VALUES (?, ?, ?, ?, ?, ?, ?)`, userId, taskId, topicName, eventDateStr, startDate, endDate, taskColor || '#475569');
      } else {
        break;
      }
    }
    
    res.json({ success: true, message: 'Task added successfully' });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ error: 'Failed to add task' });
  }
});

app.get('/api/events', requireAuth, async (req, res) => {
  try {
    const events = await db.all(`
      SELECT id, topic_name, event_date, start_date, end_date, task_color
      FROM events
      WHERE user_id = ?
      ORDER BY event_date`, req.session.userId);
    
    const formattedEvents = events.map(event => ({
      id: event.id,
      title: event.topic_name,
      start: event.event_date,
      end: event.event_date,
      allDay: true,
      backgroundColor: event.task_color || '#475569',
      borderColor: event.task_color || '#475569',
      textColor: '#ffffff',
      extendedProps: {
        eventId: event.id,
        startDate: event.start_date,
        endDate: event.end_date
      }
    }));
    
    res.json(formattedEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/user', requireAuth, (req, res) => {
  res.json({ username: req.session.username });
});

// Delete single task (specific date)
app.post('/api/delete-task', requireAuth, async (req, res) => {
  const { eventId, topicName, eventDate } = req.body;
  const userId = req.session.userId;
  
  console.log('=== DELETE TASK SERVER DEBUG ===');
  console.log('User ID:', userId);
  console.log('Event ID:', eventId);
  console.log('Topic Name:', topicName);
  console.log('Event Date:', eventDate);
  
  try {
    // Use eventId if provided, otherwise fall back to topic name and date
    let result;
    if (eventId) {
      console.log('Attempting to delete by event ID...');
      result = await db.run(`
        DELETE FROM events 
        WHERE id = ? AND user_id = ?`, 
        eventId, userId);
      console.log('Delete by ID result:', result);
    } else {
      console.log('Attempting to delete by topic name and date...');
      result = await db.run(`
        DELETE FROM events 
        WHERE user_id = ? AND topic_name = ? AND event_date = ?`, 
        userId, topicName, eventDate);
      console.log('Delete by topic/date result:', result);
    }
    
    console.log('Changes made:', result.changes);
    
    if (result.changes === 0) {
      console.log('No records were deleted - task not found');
      return res.status(404).json({ error: 'Task not found' });
    }
    
    console.log('Task deleted successfully');
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Database error during task deletion:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Delete entire schedule (all dates for a topic)
app.post('/api/delete-schedule', requireAuth, async (req, res) => {
  const { topicName } = req.body;
  const userId = req.session.userId;
  
  console.log('=== DELETE SCHEDULE SERVER DEBUG ===');
  console.log('User ID:', userId);
  console.log('Topic Name:', topicName);
  
  try {
    // First, get the task_id to delete from tasks table as well
    console.log('Looking for task_id for this topic...');
    const taskInfo = await db.get(`
      SELECT DISTINCT task_id FROM events 
      WHERE user_id = ? AND topic_name = ?`, 
      userId, topicName);
    console.log('Task info found:', taskInfo);
    
    // Delete all events for this topic
    console.log('Deleting all events for this topic...');
    const eventsResult = await db.run(`
      DELETE FROM events 
      WHERE user_id = ? AND topic_name = ?`, 
      userId, topicName);
    console.log('Events deletion result:', eventsResult);
    
    // Delete the task itself if we found a task_id
    let tasksResult = { changes: 0 };
    if (taskInfo && taskInfo.task_id) {
      console.log('Deleting task by task_id:', taskInfo.task_id);
      tasksResult = await db.run(`
        DELETE FROM tasks 
        WHERE id = ? AND user_id = ?`, 
        taskInfo.task_id, userId);
      console.log('Tasks deletion by ID result:', tasksResult);
    } else {
      // Fallback: delete by topic name
      console.log('Fallback: deleting task by topic name...');
      tasksResult = await db.run(`
        DELETE FROM tasks 
        WHERE user_id = ? AND topic_name = ?`, 
        userId, topicName);
      console.log('Tasks deletion by name result:', tasksResult);
    }
    
    console.log('Total changes - Events:', eventsResult.changes, 'Tasks:', tasksResult.changes);
    
    if (eventsResult.changes === 0 && tasksResult.changes === 0) {
      console.log('No records were deleted - schedule not found');
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    console.log('Schedule deleted successfully');
    res.json({ 
      success: true, 
      message: 'Schedule deleted successfully',
      eventsDeleted: eventsResult.changes,
      tasksDeleted: tasksResult.changes
    });
  } catch (error) {
    console.error('Database error during schedule deletion:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// Start server after database initialization
async function startServer() {
  await initDatabase();
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Schedulearn server running on port ${PORT}`);
  });
}

startServer().catch(console.error);