# 🚀 Implémentation Complète Frontend - Toutes les Fonctionnalités

**Date :** 21 janvier 2026  
**État :** Fonctionnalités manquantes + corrections nécessaires  
**Audience :** Développeurs Frontend

---

## 📊 État Actuel vs À Faire

| Fonctionnalité | État | Priorité |
|---|---|---|
| Login/Register | ✅ De base | Haute |
| JWT Token Management | ⚠️ Basique | Haute |
| Refresh Token | ❌ Manquant | **CRITIQUE** |
| Logout | ⚠️ Basique | Haute |
| Courses CRUD | ⚠️ Partial | Haute |
| Tasks CRUD | ⚠️ Partial | Haute |
| Events (Schedule) CRUD | ⚠️ Partial | Haute |
| Grades CRUD | ⚠️ Partial | Haute |
| Risk Analysis | ❌ Manquant | Moyenne |
| Sync (PUSH/PULL) | ⚠️ À corriger | Haute |
| Error Handling | ⚠️ Basique | Moyenne |
| Loading States | ⚠️ Partiel | Basse |

---

## 🔐 PRIORITÉ 1: Refresh Token + Refresh Logic

### Problème
Le token access expire après 15 min. Il faut implémenter un refresh automatique.

### Code: `src/store/authStore.ts` (REWRITE)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/axios';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  timezone?: string;
  language?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isRefreshing: boolean;
  expiresAt: number | null;
  
  // Actions
  setAuth: (accessToken: string, refreshToken: string, user: User, expiresIn?: number) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  checkTokenExpiry: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isRefreshing: false,
      expiresAt: null,

      setAuth: (accessToken, refreshToken, user, expiresIn = 900) => {
        // expiresIn = 15 min (900 sec) par défaut
        const expiresAt = Date.now() + expiresIn * 1000;
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          expiresAt,
        });
        // Start refresh check
        get().scheduleTokenRefresh();
      },

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          expiresAt: null,
        });
        // Clear interceptor cache
        localStorage.removeItem('auth-storage');
      },

      checkTokenExpiry: () => {
        const { expiresAt } = get();
        if (!expiresAt) return false;
        
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        
        // Refresh si moins de 2 min avant expiry
        return timeUntilExpiry < 120000;
      },

      refreshAccessToken: async () => {
        const { refreshToken, isRefreshing } = get();
        
        if (!refreshToken) {
          console.warn('No refresh token available');
          get().logout();
          return false;
        }

        // Éviter refresh concurrent
        if (isRefreshing) {
          return true; // Déjà en cours
        }

        set({ isRefreshing: true });

        try {
          console.log('🔄 Refreshing access token...');
          const response = await api.post('/api/auth/refresh-token', {
            refreshToken,
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

          if (newAccessToken && newRefreshToken) {
            const expiresAt = Date.now() + 900000; // 15 min
            set({
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
              expiresAt,
              isRefreshing: false,
            });
            console.log('✅ Token refreshed successfully');
            return true;
          } else {
            throw new Error('Invalid refresh response');
          }
        } catch (error: any) {
          console.error('❌ Token refresh failed:', error);
          get().logout();
          set({ isRefreshing: false });
          return false;
        }
      },

      // Planifier refresh automatique
      scheduleTokenRefresh: () => {
        const { expiresAt, refreshAccessToken } = get();
        if (!expiresAt) return;

        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        // Refresh à 2 min avant expiry
        const delayUntilRefresh = Math.max(timeUntilExpiry - 120000, 0);

        setTimeout(() => {
          refreshAccessToken();
        }, delayUntilRefresh);
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

### Code: `src/lib/axios.ts` (UPDATED)

```typescript
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const state = useAuthStore.getState();
  const token = state.accessToken;

  // Vérifier si token expire dans les 2 prochaines min
  if (state.checkTokenExpiry()) {
    console.log('⚠️ Token expiring soon, refreshing...');
    state.refreshAccessToken();
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401: Token expiré, try refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const success = await useAuthStore.getState().refreshAccessToken();
        
        if (success) {
          // Retry la requête originale avec nouveau token
          const token = useAuthStore.getState().accessToken;
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 🏢 PRIORITÉ 2: Courses Complet CRUD

### Code: `src/services/courseService.ts` (NEW)

```typescript
import { api } from '../lib/axios';

export interface Course {
  id: string;
  code: string;
  name: string;
  description?: string;
  color: string;
  credits?: number;
  createdAt: string;
  updatedAt: string;
}

export const courseService = {
  // Récupérer tous les courses
  async getCourses(): Promise<Course[]> {
    try {
      const response = await api.get('/api/courses');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      throw error;
    }
  },

  // Créer un course
  async createCourse(data: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course> {
    try {
      const response = await api.post('/api/courses', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create course:', error);
      throw error;
    }
  },

  // Mettre à jour un course
  async updateCourse(id: string, data: Partial<Course>): Promise<Course> {
    try {
      const response = await api.put(`/api/courses/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to update course:', error);
      throw error;
    }
  },

  // Supprimer un course
  async deleteCourse(id: string): Promise<void> {
    try {
      await api.delete(`/api/courses/${id}`);
    } catch (error) {
      console.error('Failed to delete course:', error);
      throw error;
    }
  },
};
```

### Code: `src/pages/Courses.tsx` (NEW - FULL PAGE)

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Loader } from 'lucide-react';
import { courseService, Course } from '../services/courseService';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

export default function Courses() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    color: COLORS[0],
    credits: 3,
  });

  // Query: Get courses
  const { data: courses, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: courseService.getCourses,
    enabled: isAuthenticated,
  });

  // Mutation: Create course
  const createMutation = useMutation({
    mutationFn: (data) => courseService.createCourse(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      resetForm();
      setShowModal(false);
    },
    onError: (error: any) => {
      alert('Failed to create course: ' + error.response?.data?.error);
    },
  });

  // Mutation: Update course
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      courseService.updateCourse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      resetForm();
      setShowModal(false);
    },
    onError: (error: any) => {
      alert('Failed to update course: ' + error.response?.data?.error);
    },
  });

  // Mutation: Delete course
  const deleteMutation = useMutation({
    mutationFn: (id: string) => courseService.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (error: any) => {
      alert('Failed to delete course: ' + error.response?.data?.error);
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      color: COLORS[0],
      credits: 3,
    });
    setEditingCourse(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name) {
      alert('Code and name are required');
      return;
    }

    if (editingCourse) {
      updateMutation.mutate({ id: editingCourse.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      code: course.code,
      name: course.name,
      description: course.description || '',
      color: course.color,
      credits: course.credits || 3,
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this course?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader className="animate-spin" /></div>;
  }

  if (error) {
    return <div className="alert alert-error">Failed to load courses</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Courses</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-sm bg-gray-900 text-white hover:bg-gray-800"
        >
          <Plus size={16} /> New Course
        </button>
      </div>

      {/* Grid of courses */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses?.map((course) => (
          <div
            key={course.id}
            className="bg-white p-4 rounded-lg shadow border-l-4"
            style={{ borderLeftColor: course.color }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">{course.code}</p>
                <h3 className="text-lg font-bold">{course.name}</h3>
                {course.description && <p className="text-sm text-gray-600 mt-1">{course.description}</p>}
                {course.credits && <p className="text-xs text-gray-400 mt-2">{course.credits} credits</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(course)}
                  className="btn btn-ghost btn-xs"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(course.id)}
                  className="btn btn-ghost btn-xs text-error"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {courses?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No courses yet. Create your first one!</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-96 overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">{editingCourse ? 'Edit Course' : 'New Course'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Course Code (ex: CS101)</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="CS101"
                  required
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Course Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Introduction to CS"
                  required
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Description (optional)</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Course description..."
                  rows={3}
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Credits</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                  min={1}
                  max={12}
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Color</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="w-8 h-8 rounded border-2"
                      style={{
                        backgroundColor: color,
                        borderColor: formData.color === color ? '#000' : 'transparent',
                      }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn bg-gray-900 text-white"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingCourse ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## ✅ PRIORITÉ 3: Tasks Complet CRUD

### Code: `src/services/taskService.ts` (NEW)

```typescript
import { api } from '../lib/axios';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: string;
  courseId?: string;
  createdAt: string;
  updatedAt: string;
}

export const taskService = {
  async getTasks(): Promise<Task[]> {
    const response = await api.get('/api/tasks');
    return response.data;
  },

  async getTasksByCourse(courseId: string): Promise<Task[]> {
    const response = await api.get(`/api/tasks/course/${courseId}`);
    return response.data;
  },

  async createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const response = await api.post('/api/tasks', data);
    return response.data;
  },

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const response = await api.put(`/api/tasks/${id}`, data);
    return response.data;
  },

  async deleteTask(id: string): Promise<void> {
    await api.delete(`/api/tasks/${id}`);
  },
};
```

### Code: `src/pages/Tasks.tsx` (UPDATED - FULL VERSION)

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, CheckCircle, Circle, AlertCircle } from 'lucide-react';
import { taskService, Task } from '../services/taskService';
import { courseService } from '../services/courseService';
import { useAuthStore } from '../store/authStore';

const PRIORITY_COLORS = {
  LOW: '#4ECDC4',
  MEDIUM: '#45B7D1',
  HIGH: '#FFA07A',
  CRITICAL: '#FF6B6B',
};

const STATUS_ICONS = {
  PENDING: <Circle size={16} className="text-gray-400" />,
  IN_PROGRESS: <AlertCircle size={16} className="text-yellow-500" />,
  COMPLETED: <CheckCircle size={16} className="text-green-500" />,
};

export default function Tasks() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'PENDING' as const,
    priority: 'MEDIUM' as const,
    dueDate: '',
    courseId: '',
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: taskService.getTasks,
    enabled: isAuthenticated,
  });

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: courseService.getCourses,
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (data) => taskService.createTask(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      resetForm();
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => taskService.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      resetForm();
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taskService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'PENDING',
      priority: 'MEDIUM',
      dueDate: '',
      courseId: '',
    });
    setEditingTask(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      alert('Task title is required');
      return;
    }

    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      courseId: task.courseId || '',
    });
    setShowModal(true);
  };

  const handleStatusChange = async (task: Task, newStatus: Task['status']) => {
    await updateMutation.mutateAsync({
      id: task.id,
      data: { status: newStatus },
    });
  };

  const filteredTasks = tasks?.filter((task) => {
    if (filterStatus === 'ALL') return true;
    return task.status === filterStatus;
  }) || [];

  if (tasksLoading) {
    return <div className="text-center p-6">Loading tasks...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-sm bg-gray-900 text-white hover:bg-gray-800"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`btn btn-sm ${filterStatus === status ? 'btn-primary' : 'btn-ghost'}`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="bg-white p-4 rounded-lg shadow border-l-4 hover:shadow-md transition"
            style={{ borderLeftColor: PRIORITY_COLORS[task.priority] }}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => {
                  const nextStatus: Record<string, Task['status']> = {
                    PENDING: 'IN_PROGRESS',
                    IN_PROGRESS: 'COMPLETED',
                    COMPLETED: 'PENDING',
                  };
                  handleStatusChange(task, nextStatus[task.status]);
                }}
                className="mt-1 hover:opacity-70"
              >
                {STATUS_ICONS[task.status]}
              </button>

              <div className="flex-1">
                <h3 className={`font-semibold ${task.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>
                  {task.title}
                </h3>
                {task.description && <p className="text-sm text-gray-600 mt-1">{task.description}</p>}
                <div className="flex gap-2 mt-2 text-xs text-gray-500">
                  {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                  {task.courseId && (
                    <span>
                      Course: {courses?.find((c) => c.id === task.courseId)?.code || task.courseId}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(task)}
                  className="btn btn-ghost btn-xs"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(task.id)}
                  className="btn btn-ghost btn-xs text-error"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No tasks found. Create your first task!
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-96 overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">{editingTask ? 'Edit Task' : 'New Task'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Title *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">
                    <span className="label-text">Status</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text">Priority</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Due Date</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Course (optional)</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                >
                  <option value="">-- No Course --</option>
                  {courses?.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn bg-gray-900 text-white"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingTask ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 📅 PRIORITÉ 4: Events (Schedule) Complet CRUD

### Code: `src/services/eventService.ts` (NEW)

```typescript
import { api } from '../lib/axios';

export interface Event {
  id: string;
  title: string;
  type: 'EXAM' | 'LECTURE' | 'LAB' | 'TUTORIAL' | 'ASSIGNMENT' | 'OTHER';
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  courseId?: string;
  createdAt: string;
  updatedAt: string;
}

export const eventService = {
  async getEvents(): Promise<Event[]> {
    const response = await api.get('/api/events');
    return response.data;
  },

  async createEvent(data: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
    const response = await api.post('/api/events', data);
    return response.data;
  },

  async updateEvent(id: string, data: Partial<Event>): Promise<Event> {
    const response = await api.put(`/api/events/${id}`, data);
    return response.data;
  },

  async deleteEvent(id: string): Promise<void> {
    await api.delete(`/api/events/${id}`);
  },
};
```

### Code: `src/pages/Schedule.tsx` (UPDATE - SIMPLIFIED)

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Loader } from 'lucide-react';
import { eventService, Event } from '../services/eventService';
import { courseService } from '../services/courseService';
import { useAuthStore } from '../store/authStore';

const EVENT_TYPES = ['EXAM', 'LECTURE', 'LAB', 'TUTORIAL', 'ASSIGNMENT', 'OTHER'];

export default function Schedule() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    type: 'LECTURE' as const,
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
    courseId: '',
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: eventService.getEvents,
    enabled: isAuthenticated,
  });

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: courseService.getCourses,
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      eventService.createEvent({
        title: data.title,
        type: data.type,
        description: data.description,
        startDate: `${data.startDate}T${data.startTime}`,
        endDate: `${data.endDate}T${data.endTime}`,
        location: data.location,
        courseId: data.courseId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      resetForm();
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) =>
      eventService.updateEvent(id, {
        title: data.title,
        type: data.type,
        description: data.description,
        startDate: `${data.startDate}T${data.startTime}`,
        endDate: `${data.endDate}T${data.endTime}`,
        location: data.location,
        courseId: data.courseId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      resetForm();
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventService.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'LECTURE',
      description: '',
      startDate: '',
      startTime: '08:00',
      endDate: '',
      endTime: '09:00',
      location: '',
      courseId: '',
    });
    setEditingEvent(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate || !formData.endDate) {
      alert('Title and dates are required');
      return;
    }

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (event: Event) => {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    setEditingEvent(event);
    setFormData({
      title: event.title,
      type: event.type,
      description: event.description || '',
      startDate: startDate.toISOString().split('T')[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endDate: endDate.toISOString().split('T')[0],
      endTime: endDate.toTimeString().slice(0, 5),
      location: event.location || '',
      courseId: event.courseId || '',
    });
    setShowModal(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader className="animate-spin" /></div>;
  }

  const upcomingEvents = events?.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Schedule</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-sm bg-gray-900 text-white hover:bg-gray-800"
        >
          <Plus size={16} /> New Event
        </button>
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {upcomingEvents.map((event) => (
          <div key={event.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-sm">{event.type}</span>
                  <h3 className="font-bold text-lg">{event.title}</h3>
                </div>
                {event.description && <p className="text-sm text-gray-600 mt-1">{event.description}</p>}
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  <span>📅 {new Date(event.startDate).toLocaleDateString()}</span>
                  <span>🕐 {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {event.location && <span>📍 {event.location}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(event)}
                  className="btn btn-ghost btn-xs"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(event.id)}
                  className="btn btn-ghost btn-xs text-error"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {upcomingEvents.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No events scheduled. Create your first event!
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-96 overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">{editingEvent ? 'Edit Event' : 'New Event'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Title *</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Type</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">
                    <span className="label-text">Start Date *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Start Time</span>
                  </label>
                  <input
                    type="time"
                    className="input input-bordered w-full"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">
                    <span className="label-text">End Date *</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">End Time</span>
                  </label>
                  <input
                    type="time"
                    className="input input-bordered w-full"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Location</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Room, Building, etc."
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Course (optional)</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                >
                  <option value="">-- No Course --</option>
                  {courses?.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn bg-gray-900 text-white"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingEvent ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 📊 PRIORITÉ 5: Grades Complet CRUD

### Code: `src/services/gradeService.ts` (NEW)

```typescript
import { api } from '../lib/axios';

export interface Grade {
  id: string;
  score: number;
  maxScore: number;
  weight?: number;
  feedback?: string;
  courseId: string;
  createdAt: string;
  updatedAt: string;
}

export const gradeService = {
  async getGrades(): Promise<Grade[]> {
    const response = await api.get('/api/grades');
    return response.data;
  },

  async createGrade(data: Omit<Grade, 'id' | 'createdAt' | 'updatedAt'>): Promise<Grade> {
    const response = await api.post('/api/grades', data);
    return response.data;
  },

  async updateGrade(id: string, data: Partial<Grade>): Promise<Grade> {
    const response = await api.put(`/api/grades/${id}`, data);
    return response.data;
  },

  async deleteGrade(id: string): Promise<void> {
    await api.delete(`/api/grades/${id}`);
  },
};
```

### Code: `src/pages/Grades.tsx` (SIMPLIFIED VERSION)

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, TrendingUp, BarChart3 } from 'lucide-react';
import { gradeService, Grade } from '../services/gradeService';
import { courseService } from '../services/courseService';
import { useAuthStore } from '../store/authStore';

export default function Grades() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const [formData, setFormData] = useState({
    score: '',
    maxScore: '20',
    weight: '1',
    feedback: '',
    courseId: '',
  });

  const { data: grades } = useQuery({
    queryKey: ['grades'],
    queryFn: gradeService.getGrades,
    enabled: isAuthenticated,
  });

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: courseService.getCourses,
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      gradeService.createGrade({
        score: parseFloat(data.score),
        maxScore: parseFloat(data.maxScore),
        weight: data.weight ? parseFloat(data.weight) : 1,
        feedback: data.feedback,
        courseId: data.courseId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      resetForm();
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) =>
      gradeService.updateGrade(id, {
        score: parseFloat(data.score),
        maxScore: parseFloat(data.maxScore),
        weight: data.weight ? parseFloat(data.weight) : 1,
        feedback: data.feedback,
        courseId: data.courseId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      resetForm();
      setShowModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gradeService.deleteGrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
    },
  });

  const resetForm = () => {
    setFormData({
      score: '',
      maxScore: '20',
      weight: '1',
      feedback: '',
      courseId: '',
    });
    setEditingGrade(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.score || !formData.courseId) {
      alert('Score and course are required');
      return;
    }

    if (editingGrade) {
      updateMutation.mutate({ id: editingGrade.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (grade: Grade) => {
    setEditingGrade(grade);
    setFormData({
      score: grade.score.toString(),
      maxScore: grade.maxScore.toString(),
      weight: (grade.weight || 1).toString(),
      feedback: grade.feedback || '',
      courseId: grade.courseId,
    });
    setShowModal(true);
  };

  const courseGrades = grades?.filter((g) => g.courseId === selectedCourseId) || [];
  const courseAverage =
    courseGrades.length > 0
      ? (
          courseGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / courseGrades.length
        ).toFixed(1)
      : 'N/A';

  const globalAverage =
    grades && grades.length > 0
      ? ((grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / grades.length) * 0.2).toFixed(1)
      : 'N/A';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Grades</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-sm bg-gray-900 text-white hover:bg-gray-800"
        >
          <Plus size={16} /> New Grade
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Overall Average</p>
              <p className="text-2xl font-bold">{globalAverage}%</p>
            </div>
            <TrendingUp className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Grades</p>
              <p className="text-2xl font-bold">{grades?.length || 0}</p>
            </div>
            <BarChart3 className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div>
            <p className="text-gray-500 text-sm">Select Course</p>
            <select
              className="select select-bordered w-full mt-2"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">-- All Courses --</option>
              {courses?.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grades List */}
      <div className="space-y-3">
        {(selectedCourseId ? courseGrades : grades)?.map((grade) => {
          const percentage = ((grade.score / grade.maxScore) * 100).toFixed(1);
          const course = courses?.find((c) => c.id === grade.courseId);
          return (
            <div key={grade.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-500">{course?.code} - {course?.name}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="text-2xl font-bold">{grade.score}/{grade.maxScore}</div>
                    <div className="flex-1">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{percentage}%</p>
                    </div>
                  </div>
                  {grade.feedback && <p className="text-sm text-gray-600 mt-2">Feedback: {grade.feedback}</p>}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(grade)}
                    className="btn btn-ghost btn-xs"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(grade.id)}
                    className="btn btn-ghost btn-xs text-error"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {grades?.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No grades yet. Add your first grade!
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md max-h-96 overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">{editingGrade ? 'Edit Grade' : 'New Grade'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">Course *</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  required
                >
                  <option value="">-- Select Course --</option>
                  {courses?.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">
                    <span className="label-text">Score *</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    className="input input-bordered w-full"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Max Score</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    className="input input-bordered w-full"
                    value={formData.maxScore}
                    onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Weight</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input input-bordered w-full"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>

              <div>
                <label className="label">
                  <span className="label-text">Feedback</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  value={formData.feedback}
                  onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn bg-gray-900 text-white"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingGrade ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## ⚠️ PRIORITÉ 6: Risk Analysis Dashboard

### Code: `src/pages/Risk.tsx` (NEW)

```typescript
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '../lib/axios';
import { courseService } from '../services/courseService';
import { useAuthStore } from '../store/authStore';

interface RiskAnalysis {
  courseId: string;
  courseName: string;
  overallScore: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: {
    performance: number;
    procrastination: number;
    pressure: number;
  };
}

async function getRiskAnalysis(courseId: string): Promise<RiskAnalysis> {
  const response = await api.get(`/api/risk/course/${courseId}`);
  return response.data;
}

const RISK_COLORS = {
  LOW: '#4ECDC4',
  MEDIUM: '#FFA07A',
  HIGH: '#FF8C42',
  CRITICAL: '#FF6B6B',
};

export default function Risk() {
  const { isAuthenticated } = useAuthStore();
  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: courseService.getCourses,
    enabled: isAuthenticated,
  });

  const courseRisks = useQuery({
    queryKey: ['risks', courses],
    queryFn: async () => {
      if (!courses || courses.length === 0) return [];
      const risks = await Promise.all(
        courses.map((course) => getRiskAnalysis(course.id).catch(() => null))
      );
      return risks.filter(Boolean) as RiskAnalysis[];
    },
    enabled: isAuthenticated && !!courses && courses.length > 0,
  });

  const risks = courseRisks.data || [];
  const criticalCount = risks.filter((r) => r.level === 'CRITICAL').length;
  const highCount = risks.filter((r) => r.level === 'HIGH').length;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Risk Analysis</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Critical Risk</p>
              <p className="text-3xl font-bold text-red-600">{criticalCount}</p>
            </div>
            <AlertTriangle className="text-red-500" size={32} />
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">High Risk</p>
              <p className="text-3xl font-bold text-yellow-600">{highCount}</p>
            </div>
            <TrendingUp className="text-yellow-500" size={32} />
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">On Track</p>
              <p className="text-3xl font-bold text-green-600">{risks.length - criticalCount - highCount}</p>
            </div>
            <TrendingDown className="text-green-500" size={32} />
          </div>
        </div>
      </div>

      {/* Risk Details */}
      <div className="space-y-4">
        {risks.map((risk) => (
          <div
            key={risk.courseId}
            className="bg-white p-4 rounded-lg shadow border-l-4"
            style={{ borderLeftColor: RISK_COLORS[risk.level] }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold">{risk.courseName}</h3>
                <span
                  className="inline-block px-3 py-1 rounded-full text-sm font-semibold text-white mt-1"
                  style={{ backgroundColor: RISK_COLORS[risk.level] }}
                >
                  {risk.level}
                </span>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{risk.overallScore}</p>
                <p className="text-sm text-gray-500">/ 100</p>
              </div>
            </div>

            {/* Risk Factors */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Performance</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(risk.details.performance, 100)}%` }}
                  />
                </div>
                <p className="text-sm font-semibold mt-1">{risk.details.performance}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Procrastination</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${Math.min(risk.details.procrastination, 100)}%` }}
                  />
                </div>
                <p className="text-sm font-semibold mt-1">{risk.details.procrastination}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Pressure</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${Math.min(risk.details.pressure, 100)}%` }}
                  />
                </div>
                <p className="text-sm font-semibold mt-1">{risk.details.pressure}</p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mt-4 p-3 bg-gray-50 rounded">
              {risk.level === 'CRITICAL' && (
                <p className="text-sm text-red-700">
                  ⚠️ <strong>Critical!</strong> Immediate action needed. Review grades, complete pending tasks, and focus on upcoming exams.
                </p>
              )}
              {risk.level === 'HIGH' && (
                <p className="text-sm text-orange-700">
                  📌 <strong>High Risk.</strong> Increase study time and task completion rate.
                </p>
              )}
              {risk.level === 'MEDIUM' && (
                <p className="text-sm text-yellow-700">
                  ⚡ <strong>Medium Risk.</strong> Stay consistent with your studies.
                </p>
              )}
              {risk.level === 'LOW' && (
                <p className="text-sm text-green-700">
                  ✅ <strong>On Track!</strong> Keep up the good work and maintain your progress.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {risks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No courses to analyze yet. Create some courses first!
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 Package.json Dependencies

Ajouter à `package.json`:

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "uuid": "^9.0.0",
    "dexie": "^3.2.0",
    "dexie-react-hooks": "^1.1.0",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "lucide-react": "^0.263.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  }
}
```

Installer: `npm install`

---

## 📱 Router Configuration

### Code: `src/App.tsx` (UPDATE)

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Tasks from './pages/Tasks';
import Schedule from './pages/Schedule';
import Grades from './pages/Grades';
import Risk from './pages/Risk';
import Profile from './pages/Profile';
import AppLayout from './layouts/AppLayout';
import RequireAuth from './components/RequireAuth';
import { useSync } from './hooks/useSync';

export default function App() {
  const { isAuthenticated } = useAuthStore();
  
  // Initialize sync
  useSync();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="courses" element={<Courses />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="grades" element={<Grades />} />
          <Route path="risk" element={<Risk />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="/" element={<Navigate to={isAuthenticated ? '/app/dashboard' : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## ✅ Checklist d'implémentation

- [ ] **Phase 1 (Jour 1-2): Auth**
  - [ ] Installer dependencies
  - [ ] Implémenter refresh token logic
  - [ ] Corriger axios interceptor
  - [ ] Tester login → refresh → stay logged in

- [ ] **Phase 2 (Jour 3-4): CRUD**
  - [ ] Courses (new page)
  - [ ] Tasks (update existing)
  - [ ] Events/Schedule (update existing)
  - [ ] Grades (update existing)

- [ ] **Phase 3 (Jour 5-6): Advanced**
  - [ ] Risk Analysis page
  - [ ] React Query setup
  - [ ] Error boundaries
  - [ ] Loading states

- [ ] **Phase 4 (Jour 7): Sync**
  - [ ] Implémenter useSync.ts (corrigée)
  - [ ] Tester offline → online
  - [ ] Tester PUSH/PULL complet

- [ ] **Phase 5 (Jour 8): Polish**
  - [ ] Error messages user-friendly
  - [ ] Validations formulaires
  - [ ] Tests E2E

---

**Document prêt à être implémenté! 🚀**

Le code peut être copié directement dans les fichiers correspondants.
