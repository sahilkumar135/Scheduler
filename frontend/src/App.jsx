import React, { useState, useEffect } from 'react';
import './App.css';

// Define your backend API URLs
const API_BASE_URL = 'http://13.159.20.163:5000/api'; // Base URL for all API endpoints
const TASKS_API_URL = `${API_BASE_URL}/tasks`; // URL for task operations
const AUTH_API_URL = `${API_BASE_URL}/auth`;   // URL for authentication operations

// Motivational quotes array
const motivationalQuotes = [
  "The best way to predict the future is to create it.",
  "Your only limit is your imagination.",
  "Believe you can and you're halfway there.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "Don't watch the clock; do what it does. Keep going.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "The only impossible journey is the one you never begin.",
  "It always seems impossible until it's done.",
  "Start where you are. Use what you have. Do what you can.",
  "The secret of getting ahead is getting started."
];

// Main App component for the Task Manager
function App() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Tracks if a user is logged in
  const [username, setUsername] = useState('');       // Stores the username for login/signup
  const [password, setPassword] = useState('');       // Stores the password for login/signup
  const [authError, setAuthError] = useState(null);   // Stores authentication errors
  const [isRegistering, setIsRegistering] = useState(false); // Toggles between login and register forms
  const [token, setToken] = useState(localStorage.getItem('token') || null); // Stores JWT token
  const [loggedInUsername, setLoggedInUsername] = useState(''); // Stores the username of the logged-in user

  // Task management states (existing)
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Low');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('creationDate');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [editingTaskDueDate, setEditingTaskDueDate] = '';
  const [editingTaskPriority, setEditingTaskPriority] = '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quote of the day state
  const [currentQuote, setCurrentQuote] = useState('');

  // Effect to set a random quote on component mount
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setCurrentQuote(motivationalQuotes[randomIndex]);
  }, []);

  // Effect to check for token on initial load and set login status
  useEffect(() => {
    if (token) {
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        setLoggedInUsername(storedUsername);
      }
      setIsLoggedIn(true);
      fetchTasks(); // Fetch tasks if a token exists
    } else {
      setIsLoggedIn(false);
      setLoading(false); // No token, so not loading tasks
    }
  }, [token]); // Re-run if token changes

  // Function to fetch tasks from the backend (now requires token)
  const fetchTasks = async () => {
    if (!token) { // Only fetch if authenticated
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(TASKS_API_URL, {
        headers: {
          'x-auth-token': token, // Send the JWT token
        },
      });

      if (!response.ok) {
        // If token is invalid or expired, force logout
        if (response.status === 401) {
          handleLogout();
          throw new Error("Session expired or invalid. Please log in again.");
        }
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      setError(`Failed to load tasks: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle user login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const response = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('token', data.token); // Store the JWT
      localStorage.setItem('username', username); // Store username for display
      setToken(data.token); // Update token state
      setLoggedInUsername(username); // Set logged-in username
      setIsLoggedIn(true);
      setUsername('');
      setPassword('');
      // fetchTasks will be called by useEffect due to token change
    } catch (err) {
      console.error("Login error:", err);
      setAuthError(err.message || "An unknown error occurred during login.");
    }
  };

  // Handle user registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const response = await fetch(`${AUTH_API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('token', data.token); // Store the JWT
      localStorage.setItem('username', username); // Store username for display
      setToken(data.token); // Update token state
      setLoggedInUsername(username); // Set logged-in username
      setIsLoggedIn(true);
      setUsername('');
      setPassword('');
      // fetchTasks will be called by useEffect due to token change
    } catch (err) {
      console.error("Registration error:", err);
      setAuthError(err.message || "An unknown error occurred during registration.");
    }
  };

  // Handle user logout
  const handleLogout = () => {
    localStorage.removeItem('token'); // Remove token from local storage
    localStorage.removeItem('username'); // Remove username from local storage
    setToken(null); // Clear token state
    setLoggedInUsername(''); // Clear logged-in username
    setIsLoggedIn(false);
    setTasks([]); // Clear tasks on logout
    setUsername('');
    setPassword('');
    setAuthError(null);
    setError(null);
    setLoading(false);
  };

  // Function to handle adding a new task
  const handleAddTask = async () => {
    const trimmedText = newTaskText.trim();
    if (trimmedText && token) { // Ensure token exists
      setError(null);
      try {
        const response = await fetch(TASKS_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token, // Send the JWT token
          },
          body: JSON.stringify({
            text: trimmedText,
            dueDate: newTaskDueDate || null,
            priority: newTaskPriority,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const addedTask = await response.json();
        setTasks([...tasks, addedTask]);
        setNewTaskText('');
        setNewTaskDueDate('');
        setNewTaskPriority('Low');
      } catch (err) {
        console.error('Error adding task:', err);
        setError(`Failed to add task: ${err.message}`);
      }
    }
  };

  // Function to handle toggling the completion status of a task
  const handleToggleComplete = async (id) => {
    if (!token) return; // Ensure token exists
    setError(null);
    const taskToUpdate = tasks.find(task => task._id === id);
    if (!taskToUpdate) return;

    try {
      const response = await fetch(`${TASKS_API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token, // Send the JWT token
        },
        body: JSON.stringify({
          ...taskToUpdate,
          completed: !taskToUpdate.completed,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const updatedTask = await response.json();
      setTasks(tasks.map(task =>
        task._id === id ? updatedTask : task
      ));
    } catch (err) {
      console.error('Error toggling task completion:', err);
      setError(`Failed to update task: ${err.message}`);
    }
  };

  // Function to handle deleting a task
  const handleDeleteTask = async (id) => {
    if (!token) return; // Ensure token exists
    setError(null);
    try {
      const response = await fetch(`${TASKS_API_URL}/${id}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token, // Send the JWT token
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      setTasks(tasks.filter(task => task._id !== id));
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(`Failed to delete task: ${err.message}`);
    }
  };

  // Function to clear all completed tasks
  const handleClearCompleted = async () => {
    if (!token) return; // Ensure token exists
    setError(null);
    const completedTasksToDelete = tasks.filter(task => task.completed);
    if (completedTasksToDelete.length === 0) return;

    try {
        await Promise.all(completedTasksToDelete.map(task => handleDeleteTask(task._id)));
    }
    catch (err) {
        console.error('Error clearing completed tasks:', err);
        setError(`Failed to clear completed tasks: ${err.message}`);
    }
  };

  // Function to save edited task
  const handleSaveEdit = async (id) => {
    if (!token) return; // Ensure token exists
    const trimmedText = editingTaskText.trim();
    if (!trimmedText) {
      setError("Task text cannot be empty.");
      return;
    }
    setError(null);

    try {
      const response = await fetch(`${TASKS_API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token, // Send the JWT token
        },
        body: JSON.stringify({
          text: trimmedText,
          dueDate: editingTaskDueDate || null,
          priority: editingTaskPriority,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const updatedTask = await response.json();
      setTasks(tasks.map(task =>
        task._id === id ? updatedTask : task
      ));
      setEditingTaskId(null);
      setEditingTaskText('');
      setEditingTaskDueDate('');
      setEditingTaskPriority('');
    } catch (err) {
      console.error('Error saving edited task:', err);
      setError(`Failed to save changes: ${err.message}`);
    }
  };

  // Function to cancel editing
  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTaskText('');
    setEditingTaskDueDate('');
    setEditingTaskPriority('');
  };

  // Determine priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-500';
      case 'Medium':
        return 'bg-yellow-500';
      case 'Low':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Filtered tasks based on the current filter state
  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') {
      return !task.completed;
    } else if (filter === 'completed') {
      return task.completed;
    }
    return true; // 'all' filter
  });

  // Sorted tasks based on the current sort order
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'dueDate') {
      // Handle null due dates: tasks without a due date come last
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    } else { // sortBy === 'creationDate'
      return new Date(b.createdAt) - new Date(a.createdAt); // Newest first
    }
  });

  // Calculate task counts
  const activeTasksCount = tasks.filter(task => !task.completed).length;
  const completedTasksCount = tasks.filter(task => task.completed).length;

  return (
    // Main container with responsive padding, background, and font styling
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 font-inter relative overflow-hidden">
      {/* Background circles (existing blobs) */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-700 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-700 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob animation-delay-4000"></div>
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-indigo-700 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-blob"></div>

      {/* New Background Particles/Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-0 animate-star-fall"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 5 + 5}s`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          ></div>
        ))}
      </div>

      {/* New Large, Faint Thematic Icons */}
      <div className="absolute top-10 left-10 opacity-5 text-indigo-900 animate-slow-rotate z-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-clock">
          <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.5"/>
          <path d="M16 2v4"/>
          <path d="M8 2v4"/>
          <path d="M3 10h18"/>
          <circle cx="17" cy="17" r="3.5"/>
          <path d="M17 15.5v1.5l.5.5"/>
        </svg>
      </div>
      <div className="absolute bottom-10 right-10 opacity-5 text-purple-900 animate-slow-rotate animation-delay-2000 z-0">
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-clock">
          <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.5"/>
          <path d="M16 2v4"/>
          <path d="M8 2v4"/>
          <path d="M3 10h18"/>
          <circle cx="17" cy="17" r="3.5"/>
          <path d="M17 15.5v1.5l.5.5"/>
        </svg>
      </div>


      {/* Tailwind CSS keyframes for blob and new animations */}
      <style>
        {`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }

        @keyframes star-fall {
          0% {
            opacity: 0;
            transform: translateY(0) translateX(0);
          }
          20% {
            opacity: 1;
          }
          80% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) translateX(50vw); /* Fall downwards and slightly right */
          }
        }
        .animate-star-fall {
          animation: star-fall linear infinite;
        }

        @keyframes slow-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-slow-rotate {
          animation: slow-rotate 60s linear infinite; /* Very slow rotation */
        }

        /* Frosted glass effect */
        .frosted-glass {
          background-color: rgba(31, 41, 55, 0.7); /* gray-800 with 70% opacity */
          backdrop-filter: blur(10px); /* Blur effect */
          -webkit-backdrop-filter: blur(10px); /* Safari support */
          border: 1px solid rgba(75, 85, 99, 0.5); /* gray-700 with opacity */
        }

        /* Subtle glow on focus for inputs/selects */
        .input-glow-focus:focus {
          box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.3); /* purple-500 with opacity */
        }

        /* Custom scrollbar styling */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #374151; /* gray-700 */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #8b5cf6; /* purple-500 */
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #7c3aed; /* purple-600 */
        }
        `}
      </style>

      {/* Conditional rendering based on login status */}
      {!isLoggedIn ? (
        // Login/Register Form
        <div className="relative z-10 frosted-glass p-6 rounded-3xl shadow-2xl w-full max-w-sm transform transition-all duration-300 hover:scale-[1.01] hover:shadow-3xl">
          <div className="flex items-center justify-center mb-6 pb-4 border-b border-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-clock text-indigo-400 mr-3">
              <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.5"/>
              <path d="M16 2v4"/>
              <path d="M8 2v4"/>
              <path d="M3 10h18"/>
              <circle cx="17" cy="17" r="3.5"/>
              <path d="M17 15.5v1.5l.5.5"/>
            </svg>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 tracking-tight">
              Schedulr
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-100 mb-6 text-center">
            {isRegistering ? 'Create Account' : 'Welcome Back!'}
          </h2>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="flex flex-col gap-4">
            <input
              type="text"
              className="w-full p-3 border border-gray-600 bg-gray-700 text-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600 focus:border-purple-500 placeholder-gray-400 transition-all duration-200 ease-in-out shadow-sm input-glow-focus"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full p-3 border border-gray-600 bg-gray-700 text-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600 focus:border-purple-500 placeholder-gray-400 transition-all duration-200 ease-in-out shadow-sm input-glow-focus"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-opacity-75 active:scale-95"
            >
              {isRegistering ? 'Register' : 'Login'}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-4">
            {isRegistering ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => setIsRegistering(false)}
                  className="text-purple-400 hover:text-purple-300 font-medium focus:outline-none"
                >
                  Login
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => setIsRegistering(true)}
                  className="text-purple-400 hover:text-purple-300 font-medium focus:outline-none"
                >
                  Register
                </button>
              </>
            )}
          </p>
        </div>
      ) : (
        // Main Task Manager UI (only visible when logged in)
        <>
          {/* Top Left: Quote of the Day */}
          <div className="absolute top-8 left-8 p-4 bg-gray-800/70 backdrop-blur-md rounded-lg shadow-xl text-gray-200 max-w-xs text-center border border-gray-700 z-10 hidden md:block">
            <p className="text-sm font-medium italic">"{currentQuote}"</p>
          </div>

          {/* Top Right: User Profile and Logout */}
          <div className="absolute top-8 right-8 p-3 bg-gray-800/70 backdrop-blur-md rounded-full shadow-xl flex items-center gap-3 border border-gray-700 z-10">
            {/* User Avatar Placeholder */}
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
              {loggedInUsername ? loggedInUsername.charAt(0).toUpperCase() : '?'}
            </div>
            {/* Profile Name */}
            <span className="text-gray-200 text-lg font-semibold hidden sm:inline flex-grow">
              {loggedInUsername}
            </span>
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-gray-200 font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-600 flex-shrink-0"
            >
              Logout
            </button>
          </div>

          {/* Main Task Manager Card */}
          <div className="relative z-10 frosted-glass p-6 rounded-3xl shadow-2xl w-full max-w-md transform transition-all duration-300 hover:scale-[1.01] hover:shadow-3xl">
            {/* Header with icon and title */}
            <div className="flex items-center justify-center mb-6 pb-4 border-b border-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-clock text-indigo-400 mr-3">
                <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.5"/>
                <path d="M16 2v4"/>
                <path d="M8 2v4"/>
                <path d="M3 10h18"/>
                <circle cx="17" cy="17" r="3.5"/>
                <path d="M17 15.5v1.5l.5.5"/>
              </svg>
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 tracking-tight">
                Schedulr
              </h1>
            </div>

            {/* New Task Input Section */}
            <div className="flex flex-col gap-3 mb-6">
              <input
                type="text"
                className="w-full p-3 border border-gray-600 bg-gray-700 text-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600 focus:border-purple-500 placeholder-gray-400 transition-all duration-200 ease-in-out shadow-sm input-glow-focus"
                placeholder="Add a new task..."
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTask();
                  }
                }}
              />
              <div className="flex gap-3 flex-col sm:flex-row items-center">
                <input
                  type="date"
                  className="flex-grow p-3 border border-gray-600 bg-gray-700 text-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600 focus:border-purple-500 transition-all duration-200 ease-in-out shadow-sm input-glow-focus"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTask();
                    }
                  }}
                />
                <label htmlFor="priority-select" className="text-gray-300 text-sm font-medium sr-only sm:not-sr-only">Priority:</label>
                <select
                  id="priority-select"
                  className="p-3 border border-gray-600 bg-gray-700 text-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-600 focus:border-purple-500 transition-all duration-200 ease-in-out shadow-sm input-glow-focus"
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <button
                onClick={handleAddTask}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-opacity-75 active:scale-95"
              >
                Add Task
              </button>
            </div>

            {/* Display loading and error messages */}
            {loading && (
              <div className="text-center text-gray-400 py-4">Loading tasks...</div>
            )}
            {error && (
              <div className="text-center text-red-400 py-4">{error}</div>
            )}

            {/* Filter and Sort Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-3 pb-4 border-b border-gray-700">
              <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                <button
                  onClick={() => setFilter('all')}
                  className={`py-2 px-4 rounded-full text-sm font-medium transition duration-200 shadow-sm ${
                    filter === 'all' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:border-gray-500 border border-transparent'
                  } focus:outline-none focus:ring-2 focus:ring-purple-400`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`py-2 px-4 rounded-full text-sm font-medium transition duration-200 shadow-sm ${
                    filter === 'active' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:border-gray-500 border border-transparent'
                  } focus:outline-none focus:ring-2 focus:ring-purple-400`}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`py-2 px-4 rounded-full text-sm font-medium transition duration-200 shadow-sm ${
                    filter === 'completed' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:border-gray-500 border border-transparent'
                  } focus:outline-none focus:ring-2 focus:ring-purple-400`}
                >
                  Completed
                </button>
              </div>

              <select
                className="p-2 border border-gray-600 bg-gray-700 text-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-purple-600 focus:border-purple-500 transition-all duration-200 ease-in-out shadow-sm input-glow-focus"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="creationDate">Sort by Creation Date</option>
                <option value="dueDate">Sort by Due Date</option>
              </select>
            </div>

            {/* Task List Section */}
            {!loading && !error && sortedTasks.length === 0 && tasks.length > 0 && filter !== 'all' ? (
              <div className="text-center text-gray-400 text-lg py-8 flex flex-col items-center justify-center">
                <span className="text-6xl mb-4" role="img" aria-label="magnifying glass">🔍</span>
                <p className="font-medium">No {filter} tasks found.</p>
              </div>
            ) : !loading && !error && sortedTasks.length === 0 ? (
              <div className="text-center text-gray-400 text-lg py-8 flex flex-col items-center justify-center">
                <span className="text-6xl mb-4" role="img" aria-label="sparkles">✨</span>
                <p className="font-medium">No tasks yet! Time to add some productivity.</p>
              </div>
            ) : (
              <ul className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {sortedTasks.map(task => (
                  <li
                    key={task._id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between frosted-glass p-4 rounded-xl shadow-md border border-gray-600 transition duration-300 ease-in-out transform hover:scale-[1.02] hover:shadow-lg animate-fade-in relative group"
                    style={{ animationDelay: `${tasks.indexOf(task) * 0.05}s` }}
                  >
                    <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-purple-500 transition-all duration-200 pointer-events-none"></div>

                    {editingTaskId === task._id ? (
                      <div className="flex flex-col flex-grow w-full gap-2">
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-500 bg-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-100 input-glow-focus"
                          value={editingTaskText}
                          onChange={(e) => setEditingTaskText(e.target.value)}
                        />
                        <div className="flex gap-2 flex-col sm:flex-row">
                          <input
                            type="date"
                            className="flex-grow p-2 border border-gray-500 bg-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-100 input-glow-focus"
                            value={editingTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                          />
                          <select
                            className="p-2 border border-gray-500 bg-gray-600 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-100 input-glow-focus"
                            value={editingTaskPriority}
                            onChange={(e) => setEditingTaskPriority(e.target.value)}
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>
                        <button
                          onClick={() => handleSaveEdit(task._id)}
                          className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg active:scale-95"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-600 hover:bg-gray-500 text-gray-200 text-sm font-semibold py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg active:scale-95"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex-grow flex flex-col cursor-pointer" onClick={() => handleEditTask(task)}>
                        <span
                          className={`text-lg font-medium ${task.completed ? 'line-through text-gray-400 italic' : 'text-gray-100'}`}
                        >
                          {task.text}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          {task.dueDate && (
                            <span className="text-sm text-gray-400 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-days mr-1">
                                <path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>
                              </svg>
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) : 'N/A'}
                            </span>
                          )}
                          {task.priority && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)} text-white`}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {editingTaskId !== task._id && (
                      <div className="flex items-center gap-2 mt-3 sm:mt-0 sm:ml-4">
                        <button
                          onClick={() => handleToggleComplete(task._id)}
                          className={`p-2 rounded-full transition duration-300 ease-in-out transform hover:scale-110 ${
                            task.completed
                              ? 'bg-green-600 text-white hover:bg-green-500 focus:ring-green-400'
                              : 'bg-purple-600 text-white hover:bg-purple-500 focus:ring-purple-400'
                          } focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-90 shadow-sm hover:shadow-md`}
                          title={task.completed ? "Mark as Incomplete" : "Mark as Complete"}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
                            <path d="M20 6 9 17l-5-5"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task._id)}
                          className="p-2 rounded-full bg-red-600 text-white hover:bg-red-500 transition duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:scale-90 shadow-sm hover:shadow-md"
                          title="Delete Task"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2">
                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {/* Footer Section: Task Counter, Clear Completed */}
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-700">
              <div className="text-gray-400 text-sm mb-3 sm:mb-0">
                <span className="font-semibold">{activeTasksCount}</span> active, <span className="font-semibold">{completedTasksCount}</span> completed
              </div>

              <button
                onClick={handleClearCompleted}
                className="text-sm text-red-400 hover:text-red-300 font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
                disabled={completedTasksCount === 0}
              >
                Clear Completed
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;