// storage.js - localStorage abstraction for Octo Todo

const STORAGE_KEY = 'octo_todo_data';

const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { projects: [] };
      return JSON.parse(raw);
    } catch (e) {
      console.error('Storage load error:', e);
      return { projects: [] };
    }
  },

  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Storage save error:', e);
    }
  },

  getProjects() {
    return this.load().projects || [];
  },

  saveProjects(projects) {
    const data = this.load();
    data.projects = projects;
    this.save(data);
  },

  getProject(id) {
    return this.getProjects().find(p => p.id === id) || null;
  },

  addProject(project) {
    const projects = this.getProjects();
    projects.push(project);
    this.saveProjects(projects);
  },

  updateProject(project) {
    const projects = this.getProjects();
    const idx = projects.findIndex(p => p.id === project.id);
    if (idx !== -1) {
      projects[idx] = project;
      this.saveProjects(projects);
    }
  },

  deleteProject(id) {
    const projects = this.getProjects().filter(p => p.id !== id);
    this.saveProjects(projects);
  },

  // Generate unique IDs
  genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  },

  // Deadline format helpers
  toDeadlineFormat(datetimeLocal) {
    // converts "2024-01-15T12:30" to "20240115123000"
    if (!datetimeLocal) return '';
    return datetimeLocal.replace(/[-T:]/g, '').padEnd(14, '0').slice(0, 14);
  },

  formatDeadline(deadline) {
    // formats "20240115123000" for display
    if (!deadline || deadline.length < 8) return '';
    const y = deadline.slice(0, 4);
    const mo = deadline.slice(4, 6);
    const d = deadline.slice(6, 8);
    const h = deadline.slice(8, 10) || '00';
    const mi = deadline.slice(10, 12) || '00';
    return `${y}-${mo}-${d} ${h}:${mi}`;
  },

  toDatetimeLocal(deadline) {
    // converts "20240115123000" back to "2024-01-15T12:30"
    if (!deadline || deadline.length < 12) return '';
    const y = deadline.slice(0, 4);
    const mo = deadline.slice(4, 6);
    const d = deadline.slice(6, 8);
    const h = deadline.slice(8, 10);
    const mi = deadline.slice(10, 12);
    return `${y}-${mo}-${d}T${h}:${mi}`;
  },

  // Get all tasks with deadlines across all projects (flat list)
  getAllTasksWithDeadlines() {
    const results = [];
    const projects = this.getProjects();
    projects.forEach(project => {
      (project.steps || []).forEach(step => {
        this._collectTasksWithDeadlines(step.tasks || [], results, project, step);
      });
    });
    return results;
  },

  _collectTasksWithDeadlines(tasks, results, project, step) {
    tasks.forEach(task => {
      if (task.deadline) {
        results.push({ task, project, step });
      }
      if (task.tasks && task.tasks.length > 0) {
        this._collectTasksWithDeadlines(task.tasks, results, project, step);
      }
    });
  },

  // Find task by id recursively across all projects
  findTask(taskId) {
    const projects = this.getProjects();
    for (const project of projects) {
      for (const step of (project.steps || [])) {
        const found = this._findTaskInList(taskId, step.tasks || [], project, step);
        if (found) return found;
      }
    }
    return null;
  },

  _findTaskInList(taskId, tasks, project, step, parent) {
    for (const task of tasks) {
      if (task.id === taskId) return { task, project, step, parent };
      if (task.tasks && task.tasks.length > 0) {
        const found = this._findTaskInList(taskId, task.tasks, project, step, task);
        if (found) return found;
      }
    }
    return null;
  }
};
