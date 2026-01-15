/**
 * API service configuration and methods.
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
    User, UserCreate, UserUpdate,
    Team, TeamCreate, TeamUpdate,
    Role, RoleCreate, RoleUpdate,
    Permission, PermissionCreate,
    Client, ClientCreate, ClientUpdate,
    ClientContact, ClientContactCreate, ClientContactUpdate,
    Token, PaginatedResponse,
    Product, ProductCreate, ProductUpdate,
    ChecklistTemplate, ChecklistTemplateCreate, ChecklistTemplateUpdate,
    ChecklistItem, ChecklistItemCreate, ChecklistItemUpdate,
    Implementation, ImplementationCreate, ImplementationUpdate,
    ImplementationListItem, ImplementationItem, ImplementationItemUpdate,
    ImplementationAttachment, GanttResponse,
    // Phase 3
    ServiceOrder, ServiceOrderCreate, ServiceOrderUpdate, ServiceOrderListResponse,
    ServiceOrderTemplate, ServiceOrderTemplateCreate, ServiceOrderTemplateUpdate, ServiceOrderTemplateListResponse,
    EquipmentEntry, EquipmentEntryCreate, EquipmentEntryUpdate,
    Task, TaskCreate, TaskUpdate, TaskListResponse,
    TaskDiary, TaskDiaryCreate, TaskBlocker, TaskBlockerCreate, TaskBlockerResolve,
    CalendarResponse,
    // Phase 4
    Sprint, SprintCreate, SprintUpdate, SprintListResponse,
    SprintTask, SprintTaskCreate, SprintAgenda, SprintSummary,
    // Phase 5
    FileCategory, FileCategoryTree, FileCategoryCreate, FileCategoryUpdate,
    RepositoryFile, RepositoryFileListResponse,
    FullDashboard, DashboardSummary
} from '../types';

// Get API URL dynamically based on current window location
const getApiUrl = (): string => {
    // If environment variable is set and not 'auto', use it
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && envUrl !== 'auto') {
        return envUrl;
    }

    // Detect based on current hostname
    if (typeof window !== 'undefined') {
        const { hostname, protocol } = window.location;

        // For localhost, use localhost
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8000';
        }

        // For any other hostname (IP or domain), use same host with port 8000
        return `${protocol}//${hostname}:8000`;
    }

    return 'http://localhost:8000';
};

// Create axios instance with dynamic baseURL
const api: AxiosInstance = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token and set dynamic baseURL
api.interceptors.request.use((config) => {
    // Set baseURL dynamically for each request
    config.baseURL = getApiUrl();

    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Try to refresh token
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const response = await axios.post(`${getApiUrl()}/auth/refresh`, null, {
                        params: { refresh_token: refreshToken }
                    });
                    const { access_token, refresh_token } = response.data;
                    localStorage.setItem('access_token', access_token);
                    localStorage.setItem('refresh_token', refresh_token);

                    // Retry original request
                    if (error.config) {
                        error.config.headers.Authorization = `Bearer ${access_token}`;
                        return axios(error.config);
                    }
                } catch {
                    // Refresh failed, logout
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                }
            } else {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    login: async (username: string, password: string): Promise<Token> => {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);
        const response = await api.post('/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return response.data;
    },

    register: async (data: UserCreate): Promise<User> => {
        const response = await api.post('/auth/register', data);
        return response.data;
    },

    getMe: async (): Promise<User> => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    refresh: async (refreshToken: string): Promise<Token> => {
        const response = await api.post('/auth/refresh', null, {
            params: { refresh_token: refreshToken }
        });
        return response.data;
    },
};

// Users API
export const usersApi = {
    list: async (page = 1, size = 20, search?: string): Promise<PaginatedResponse<User>> => {
        const response = await api.get('/users', { params: { page, size, search } });
        return response.data;
    },

    get: async (id: string): Promise<User> => {
        const response = await api.get(`/users/${id}`);
        return response.data;
    },

    create: async (data: UserCreate): Promise<User> => {
        const response = await api.post('/users', data);
        return response.data;
    },

    update: async (id: string, data: UserUpdate): Promise<User> => {
        const response = await api.put(`/users/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/users/${id}`);
    },
};

// Teams API
export const teamsApi = {
    list: async (page = 1, size = 20, search?: string): Promise<PaginatedResponse<Team>> => {
        const response = await api.get('/teams', { params: { page, size, search } });
        return response.data;
    },

    get: async (id: string): Promise<Team> => {
        const response = await api.get(`/teams/${id}`);
        return response.data;
    },

    create: async (data: TeamCreate): Promise<Team> => {
        const response = await api.post('/teams', data);
        return response.data;
    },

    update: async (id: string, data: TeamUpdate): Promise<Team> => {
        const response = await api.put(`/teams/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/teams/${id}`);
    },
};

// Roles API
export const rolesApi = {
    list: async (page = 1, size = 20, search?: string): Promise<PaginatedResponse<Role>> => {
        const response = await api.get('/roles', { params: { page, size, search } });
        return response.data;
    },

    get: async (id: string): Promise<Role> => {
        const response = await api.get(`/roles/${id}`);
        return response.data;
    },

    create: async (data: RoleCreate): Promise<Role> => {
        const response = await api.post('/roles', data);
        return response.data;
    },

    update: async (id: string, data: RoleUpdate): Promise<Role> => {
        const response = await api.put(`/roles/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/roles/${id}`);
    },
};

// Permissions API
export const permissionsApi = {
    list: async (page = 1, size = 50, resource?: string): Promise<PaginatedResponse<Permission>> => {
        const response = await api.get('/permissions', { params: { page, size, resource } });
        return response.data;
    },

    get: async (id: string): Promise<Permission> => {
        const response = await api.get(`/permissions/${id}`);
        return response.data;
    },

    create: async (data: PermissionCreate): Promise<Permission> => {
        const response = await api.post('/permissions', data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/permissions/${id}`);
    },
};

// Clients API
export const clientsApi = {
    list: async (page = 1, size = 20, search?: string): Promise<PaginatedResponse<Client>> => {
        const response = await api.get('/clients', { params: { page, size, search } });
        return response.data;
    },

    get: async (id: string): Promise<Client> => {
        const response = await api.get(`/clients/${id}`);
        return response.data;
    },

    create: async (data: ClientCreate): Promise<Client> => {
        const response = await api.post('/clients', data);
        return response.data;
    },

    update: async (id: string, data: ClientUpdate): Promise<Client> => {
        const response = await api.put(`/clients/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/clients/${id}`);
    },

    // Client Contacts
    listContacts: async (clientId: string): Promise<ClientContact[]> => {
        const response = await api.get(`/clients/${clientId}/contacts`);
        return response.data;
    },

    createContact: async (clientId: string, data: ClientContactCreate): Promise<ClientContact> => {
        const response = await api.post(`/clients/${clientId}/contacts`, data);
        return response.data;
    },

    updateContact: async (clientId: string, contactId: string, data: ClientContactUpdate): Promise<ClientContact> => {
        const response = await api.put(`/clients/${clientId}/contacts/${contactId}`, data);
        return response.data;
    },

    deleteContact: async (clientId: string, contactId: string): Promise<void> => {
        await api.delete(`/clients/${clientId}/contacts/${contactId}`);
    },
};

export default api;

// ========== Phase 2 APIs ==========

// Products API
export const productsApi = {
    list: async (page = 1, size = 20, search?: string): Promise<PaginatedResponse<Product>> => {
        const response = await api.get('/products', { params: { page, size, search } });
        return response.data;
    },

    get: async (id: string): Promise<Product> => {
        const response = await api.get(`/products/${id}`);
        return response.data;
    },

    create: async (data: ProductCreate): Promise<Product> => {
        const response = await api.post('/products', data);
        return response.data;
    },

    update: async (id: string, data: ProductUpdate): Promise<Product> => {
        const response = await api.put(`/products/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/products/${id}`);
    },

    addChecklist: async (productId: string, templateId: string, isDefault = false): Promise<Product> => {
        const response = await api.post(`/products/${productId}/checklists`, { template_id: templateId, is_default: isDefault });
        return response.data;
    },

    removeChecklist: async (productId: string, templateId: string): Promise<void> => {
        await api.delete(`/products/${productId}/checklists/${templateId}`);
    },
};

// Checklists API
export const checklistsApi = {
    list: async (page = 1, size = 20, search?: string): Promise<PaginatedResponse<ChecklistTemplate>> => {
        const response = await api.get('/checklists', { params: { page, size, search } });
        return response.data;
    },

    get: async (id: string): Promise<ChecklistTemplate> => {
        const response = await api.get(`/checklists/${id}`);
        return response.data;
    },

    create: async (data: ChecklistTemplateCreate): Promise<ChecklistTemplate> => {
        const response = await api.post('/checklists', data);
        return response.data;
    },

    update: async (id: string, data: ChecklistTemplateUpdate): Promise<ChecklistTemplate> => {
        const response = await api.put(`/checklists/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/checklists/${id}`);
    },

    addItem: async (templateId: string, data: ChecklistItemCreate): Promise<ChecklistItem> => {
        const response = await api.post(`/checklists/${templateId}/items`, data);
        return response.data;
    },

    updateItem: async (templateId: string, itemId: string, data: ChecklistItemUpdate): Promise<ChecklistItem> => {
        const response = await api.put(`/checklists/${templateId}/items/${itemId}`, data);
        return response.data;
    },

    deleteItem: async (templateId: string, itemId: string): Promise<void> => {
        await api.delete(`/checklists/${templateId}/items/${itemId}`);
    },

    reorderItems: async (templateId: string, itemIds: string[]): Promise<ChecklistTemplate> => {
        const response = await api.post(`/checklists/${templateId}/items/reorder`, { item_ids: itemIds });
        return response.data;
    },
};

// Implementations API
export const implementationsApi = {
    list: async (page = 1, size = 20, filters?: { search?: string; client_id?: string; status?: string }): Promise<PaginatedResponse<ImplementationListItem>> => {
        const response = await api.get('/implementations', { params: { page, size, ...filters } });
        return response.data;
    },

    get: async (id: string): Promise<Implementation> => {
        const response = await api.get(`/implementations/${id}`);
        return response.data;
    },

    create: async (data: ImplementationCreate): Promise<Implementation> => {
        const response = await api.post('/implementations', data);
        return response.data;
    },

    update: async (id: string, data: ImplementationUpdate): Promise<Implementation> => {
        const response = await api.put(`/implementations/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/implementations/${id}`);
    },

    getGantt: async (id: string): Promise<GanttResponse> => {
        const response = await api.get(`/implementations/${id}/gantt`);
        return response.data;
    },

    updateItem: async (implId: string, itemId: string, data: ImplementationItemUpdate): Promise<ImplementationItem> => {
        const response = await api.put(`/implementations/${implId}/items/${itemId}`, data);
        return response.data;
    },

    uploadAttachment: async (implId: string, file: File, description?: string, type = 'other'): Promise<ImplementationAttachment> => {
        const formData = new FormData();
        formData.append('file', file);
        if (description) formData.append('description', description);
        formData.append('attachment_type', type);
        const response = await api.post(`/implementations/${implId}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    deleteAttachment: async (implId: string, attachmentId: string): Promise<void> => {
        await api.delete(`/implementations/${implId}/attachments/${attachmentId}`);
    },

    getSprintProgress: async (startDate: string, endDate: string, teamId?: string) => {
        const response = await api.get('/implementations/sprint-progress', {
            params: { start_date: startDate, end_date: endDate, team_id: teamId }
        });
        return response.data;
    },
};

// ==================== Service Orders API ====================
export const serviceOrdersApi = {
    // Templates
    listTemplates: async (page = 1, size = 20, search?: string): Promise<ServiceOrderTemplateListResponse> => {
        const response = await api.get('/service-orders/templates', { params: { page, size, search } });
        return response.data;
    },

    createTemplate: async (data: ServiceOrderTemplateCreate): Promise<ServiceOrderTemplate> => {
        const response = await api.post('/service-orders/templates', data);
        return response.data;
    },

    getTemplate: async (id: string): Promise<ServiceOrderTemplate> => {
        const response = await api.get(`/service-orders/templates/${id}`);
        return response.data;
    },

    updateTemplate: async (id: string, data: ServiceOrderTemplateUpdate): Promise<ServiceOrderTemplate> => {
        const response = await api.put(`/service-orders/templates/${id}`, data);
        return response.data;
    },

    deleteTemplate: async (id: string): Promise<void> => {
        await api.delete(`/service-orders/templates/${id}`);
    },

    // Service Orders
    list: async (page = 1, size = 20, filters?: { search?: string; client_id?: string; status?: string; priority?: string }): Promise<ServiceOrderListResponse> => {
        const response = await api.get('/service-orders', { params: { page, size, ...filters } });
        return response.data;
    },

    create: async (data: ServiceOrderCreate): Promise<ServiceOrder> => {
        const response = await api.post('/service-orders', data);
        return response.data;
    },

    get: async (id: string): Promise<ServiceOrder> => {
        const response = await api.get(`/service-orders/${id}`);
        return response.data;
    },

    update: async (id: string, data: ServiceOrderUpdate): Promise<ServiceOrder> => {
        const response = await api.put(`/service-orders/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/service-orders/${id}`);
    },

    start: async (id: string): Promise<ServiceOrder> => {
        const response = await api.post(`/service-orders/${id}/start`);
        return response.data;
    },

    complete: async (id: string, resolution_notes?: string): Promise<ServiceOrder> => {
        const response = await api.post(`/service-orders/${id}/complete`, null, { params: { resolution_notes } });
        return response.data;
    },

    // Equipment
    listEquipment: async (orderId: string): Promise<EquipmentEntry[]> => {
        const response = await api.get(`/service-orders/${orderId}/equipment`);
        return response.data;
    },

    addEquipment: async (orderId: string, data: EquipmentEntryCreate): Promise<EquipmentEntry> => {
        const response = await api.post(`/service-orders/${orderId}/equipment`, data);
        return response.data;
    },

    updateEquipment: async (orderId: string, entryId: string, data: EquipmentEntryUpdate): Promise<EquipmentEntry> => {
        const response = await api.put(`/service-orders/${orderId}/equipment/${entryId}`, data);
        return response.data;
    },
};

// ==================== Tasks API ====================
export const tasksApi = {
    list: async (page = 1, size = 20, filters?: { search?: string; status?: string; assigned_user_id?: string; client_id?: string; scheduled_date?: string; completed_after?: string; completed_before?: string }): Promise<TaskListResponse> => {
        const response = await api.get('/tasks', { params: { page, size, ...filters } });
        return response.data;
    },

    create: async (data: TaskCreate): Promise<Task> => {
        const response = await api.post('/tasks', data);
        return response.data;
    },

    get: async (id: string): Promise<Task> => {
        const response = await api.get(`/tasks/${id}`);
        return response.data;
    },

    update: async (id: string, data: TaskUpdate): Promise<Task> => {
        const response = await api.put(`/tasks/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/tasks/${id}`);
    },

    getCalendar: async (start_date: string, end_date: string, filters?: { assigned_user_id?: string; team_id?: string }): Promise<CalendarResponse> => {
        const response = await api.get('/tasks/calendar', { params: { start_date, end_date, ...filters } });
        return response.data;
    },

    // Diary
    getDiary: async (taskId: string): Promise<TaskDiary[]> => {
        const response = await api.get(`/tasks/${taskId}/diary`);
        return response.data;
    },

    addDiaryEntry: async (taskId: string, data: TaskDiaryCreate): Promise<TaskDiary> => {
        const response = await api.post(`/tasks/${taskId}/diary`, data);
        return response.data;
    },

    // Blockers
    getBlockers: async (taskId: string): Promise<TaskBlocker[]> => {
        const response = await api.get(`/tasks/${taskId}/blockers`);
        return response.data;
    },

    blockTask: async (taskId: string, data: TaskBlockerCreate): Promise<TaskBlocker> => {
        const response = await api.post(`/tasks/${taskId}/block`, data);
        return response.data;
    },

    unblockTask: async (taskId: string, data: TaskBlockerResolve): Promise<Task> => {
        const response = await api.post(`/tasks/${taskId}/unblock`, data);
        return response.data;
    },
};

// ==================== Sprints API ====================
export const sprintsApi = {
    list: async (page = 1, size = 20, filters?: { status?: string; team_id?: string }): Promise<SprintListResponse> => {
        const response = await api.get('/sprints', { params: { page, size, ...filters } });
        return response.data;
    },

    create: async (data: SprintCreate): Promise<Sprint> => {
        const response = await api.post('/sprints', data);
        return response.data;
    },

    get: async (id: string): Promise<Sprint> => {
        const response = await api.get(`/sprints/${id}`);
        return response.data;
    },

    getCurrent: async (team_id?: string): Promise<Sprint> => {
        const response = await api.get('/sprints/current', { params: { team_id } });
        return response.data;
    },

    update: async (id: string, data: SprintUpdate): Promise<Sprint> => {
        const response = await api.put(`/sprints/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/sprints/${id}`);
    },

    complete: async (id: string, meeting_notes?: string): Promise<Sprint> => {
        const response = await api.post(`/sprints/${id}/complete`, null, { params: { meeting_notes } });
        return response.data;
    },

    // Tasks
    getTasks: async (sprintId: string): Promise<SprintTask[]> => {
        const response = await api.get(`/sprints/${sprintId}/tasks`);
        return response.data;
    },

    addTask: async (sprintId: string, data: SprintTaskCreate): Promise<SprintTask> => {
        const response = await api.post(`/sprints/${sprintId}/tasks`, data);
        return response.data;
    },

    removeTask: async (sprintId: string, taskId: string): Promise<void> => {
        await api.delete(`/sprints/${sprintId}/tasks/${taskId}`);
    },

    // Agenda and Summary
    getAgenda: async (sprintId: string): Promise<SprintAgenda> => {
        const response = await api.get(`/sprints/${sprintId}/agenda`);
        return response.data;
    },

    getSummary: async (sprintId: string): Promise<SprintSummary> => {
        const response = await api.get(`/sprints/${sprintId}/summary`);
        return response.data;
    },
};

// ==================== Repository API ====================
export const repositoryApi = {
    // Categories
    listCategories: async (parentId?: string): Promise<FileCategory[]> => {
        const response = await api.get('/repository/categories', { params: { parent_id: parentId } });
        return response.data;
    },

    getCategoryTree: async (): Promise<FileCategoryTree[]> => {
        const response = await api.get('/repository/categories/tree');
        return response.data;
    },

    createCategory: async (data: FileCategoryCreate): Promise<FileCategory> => {
        const response = await api.post('/repository/categories', data);
        return response.data;
    },

    updateCategory: async (id: string, data: FileCategoryUpdate): Promise<FileCategory> => {
        const response = await api.put(`/repository/categories/${id}`, data);
        return response.data;
    },

    deleteCategory: async (id: string): Promise<void> => {
        await api.delete(`/repository/categories/${id}`);
    },

    // Files
    listFiles: async (page = 1, size = 20, filters?: { category_id?: string; search?: string }): Promise<RepositoryFileListResponse> => {
        const response = await api.get('/repository/files', { params: { page, size, ...filters } });
        return response.data;
    },

    uploadFile: async (file: File, data?: { description?: string; tags?: string; category_id?: string }): Promise<RepositoryFile> => {
        const formData = new FormData();
        formData.append('file', file);
        if (data?.description) formData.append('description', data.description);
        if (data?.tags) formData.append('tags', data.tags);
        if (data?.category_id) formData.append('category_id', data.category_id);
        const response = await api.post('/repository/files', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    getFile: async (id: string): Promise<RepositoryFile> => {
        const response = await api.get(`/repository/files/${id}`);
        return response.data;
    },

    downloadFile: async (id: string): Promise<Blob> => {
        const response = await api.get(`/repository/files/${id}/download`, { responseType: 'blob' });
        return response.data;
    },

    deleteFile: async (id: string): Promise<void> => {
        await api.delete(`/repository/files/${id}`);
    },
};

// ==================== Dashboard API ====================
export const dashboardApi = {
    getSummary: async (): Promise<DashboardSummary> => {
        const response = await api.get('/dashboard/summary');
        return response.data;
    },

    getFull: async (): Promise<FullDashboard> => {
        const response = await api.get('/dashboard');
        return response.data;
    },
};

// ==================== Backup API ====================
export const backupApi = {
    createBackup: async (): Promise<Blob> => {
        const response = await api.post('/backup/create', null, { responseType: 'blob' });
        return response.data;
    },

    restoreBackup: async (file: File, adminPassword: string): Promise<{ message: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('admin_password', adminPassword);
        const response = await api.post('/backup/restore', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
};

// ==================== Document Templates API ====================
export const templatesApi = {
    list: async (filters?: { template_type?: string; product_id?: string; is_active?: boolean; search?: string }) => {
        const response = await api.get('/templates', { params: filters });
        return response.data;
    },

    get: async (id: string) => {
        const response = await api.get(`/templates/${id}`);
        return response.data;
    },

    create: async (file: File, data: { name: string; description?: string; template_type: string; product_ids?: string[] }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', data.name);
        if (data.description) formData.append('description', data.description);
        formData.append('template_type', data.template_type);
        if (data.product_ids && data.product_ids.length > 0) {
            formData.append('product_ids', data.product_ids.join(','));
        }
        const response = await api.post('/templates', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    update: async (id: string, data: { name?: string; description?: string; template_type?: string; product_ids?: string[]; is_active?: boolean }) => {
        const response = await api.put(`/templates/${id}`, data);
        return response.data;
    },

    updateFile: async (id: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.put(`/templates/${id}/file`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/templates/${id}`);
    },

    download: async (id: string): Promise<Blob> => {
        const response = await api.get(`/templates/${id}/download`, { responseType: 'blob' });
        return response.data;
    },

    getTypes: async () => {
        const response = await api.get('/templates/types');
        return response.data;
    },

    getPlaceholders: async () => {
        const response = await api.get('/templates/placeholders');
        return response.data;
    },

    getByProduct: async (productId: string, templateType?: string) => {
        const response = await api.get(`/templates/by-product/${productId}`, { params: { template_type: templateType } });
        return response.data;
    },

    generateDocument: async (templateId: string, implementationId: string, format: 'docx' | 'pdf' = 'docx'): Promise<Blob> => {
        const response = await api.post(
            `/templates/${templateId}/generate/${implementationId}`,
            null,
            { params: { format }, responseType: 'blob' }
        );
        return response.data;
    },

    previewContext: async (templateId: string, implementationId: string) => {
        const response = await api.post(`/templates/${templateId}/preview`, null, {
            params: { implementation_id: implementationId }
        });
        return response.data;
    },
};

// ==================== Chat API (WhatsApp) ====================
export interface ChatConfig {
    id: string;
    instance_name: string;
    instance_id?: string;
    connection_type: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS';
    connection_status: 'disconnected' | 'connecting' | 'connected' | 'qrcode';
    phone_number?: string;
    qrcode_base64?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface QRCodeResponse {
    code?: string;
    base64?: string;
    status: string;
}

export interface ConnectionStateResponse {
    instance: string;
    state: string;
    status: string;
}

export interface ChatContact {
    id: string;
    remote_jid: string;
    push_name?: string;
    custom_name?: string;
    phone_number?: string;
    profile_picture_url?: string;
    display_name?: string;
    first_contact_at: string;
    last_contact_at: string;
}

export interface Chat {
    id: string;
    protocol: string;
    contact?: ChatContact;
    status: 'waiting' | 'in_progress' | 'closed';
    team_id?: string;
    assigned_user_id?: string;
    classification?: string;
    rating?: number;
    closing_comments?: string;
    created_at: string;
    updated_at: string;
    closed_at?: string;
}

export interface ChatMessage {
    id: string;
    chat_id: string;
    message_id: string;
    remote_jid: string;
    from_me: boolean;
    message_type: string;
    content?: string;
    media_url?: string;
    media_mimetype?: string;
    media_filename?: string;
    quoted_message_id?: string;
    status: string;
    timestamp: string;
}

export interface QuickReply {
    id: string;
    title: string;
    content: string;
    shortcut?: string;
    team_id?: string;
    created_by_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ChatClassification {
    id: string;
    name: string;
    color: string;
    is_active: boolean;
    created_at: string;
}

export interface ChatbotConfig {
    id: string;
    is_active: boolean;
    welcome_message: string;
    menu_message: string;
    invalid_option_message: string;
    queue_message: string;
    rating_request_message: string;
    rating_thanks_message: string;
    offline_message: string;
    menu_options: Array<{ option: string; text: string; team_id?: string }>;
    business_hours: Record<string, { start: string; end: string }>;
    created_at: string;
    updated_at: string;
}

export const chatApi = {
    // Config
    getConfig: async (): Promise<ChatConfig> => {
        const response = await api.get('/chat/config');
        return response.data;
    },

    createConfig: async (data: { instance_name: string; connection_type?: string; token?: string; number?: string }): Promise<ChatConfig> => {
        const response = await api.post('/chat/config', data);
        return response.data;
    },

    connect: async (): Promise<QRCodeResponse> => {
        const response = await api.get('/chat/connect');
        return response.data;
    },

    getStatus: async (): Promise<ConnectionStateResponse> => {
        const response = await api.get('/chat/status');
        return response.data;
    },

    disconnect: async (): Promise<{ message: string }> => {
        const response = await api.delete('/chat/disconnect');
        return response.data;
    },

    deleteConfig: async (): Promise<void> => {
        await api.delete('/chat/config');
    },

    // Conversations
    listConversations: async (page = 1, size = 20, filters?: { status?: string; team_id?: string; assigned_to_me?: boolean }): Promise<PaginatedResponse<Chat>> => {
        const response = await api.get('/chat/conversations', { params: { page, size, ...filters } });
        return response.data;
    },

    getConversation: async (id: string): Promise<Chat> => {
        const response = await api.get(`/chat/conversations/${id}`);
        return response.data;
    },

    getMessages: async (chatId: string, limit = 50, beforeId?: string): Promise<ChatMessage[]> => {
        const response = await api.get(`/chat/conversations/${chatId}/messages`, { params: { limit, before_id: beforeId } });
        return response.data;
    },

    sendMessage: async (chatId: string, text: string, quotedMessageId?: string): Promise<{ status: string; message_id: string }> => {
        const response = await api.post(`/chat/conversations/${chatId}/send`, { text, quoted_message_id: quotedMessageId });
        return response.data;
    },

    sendMedia: async (chatId: string, file: File, caption?: string): Promise<{ status: string; message_id: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        if (caption) formData.append('caption', caption);
        const response = await api.post(`/chat/conversations/${chatId}/send-media`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    transferChat: async (chatId: string, targetTeamId: string, targetUserId?: string): Promise<{ message: string }> => {
        const response = await api.post(`/chat/conversations/${chatId}/transfer`, { target_team_id: targetTeamId, target_user_id: targetUserId });
        return response.data;
    },

    getMessageMedia: async (messageId: string): Promise<{ base64: string; error?: string }> => {
        const response = await api.get(`/chat/messages/${messageId}/media`);
        return response.data;
    },

    closeChat: async (chatId: string, data: { classification?: string; rating?: number; closing_comments?: string }): Promise<{ message: string }> => {
        const response = await api.post(`/chat/conversations/${chatId}/close`, data);
        return response.data;
    },

    reopenChat: async (chatId: string): Promise<{ message: string }> => {
        const response = await api.post(`/chat/conversations/${chatId}/reopen`);
        return response.data;
    },

    // Contacts
    listContacts: async (page = 1, size = 20, search?: string): Promise<ChatContact[]> => {
        const response = await api.get('/chat/contacts', { params: { page, size, search } });
        return response.data;
    },

    updateContact: async (id: string, data: { custom_name?: string }): Promise<ChatContact> => {
        const response = await api.put(`/chat/contacts/${id}`, data);
        return response.data;
    },

    // Quick Replies
    listQuickReplies: async (teamId?: string): Promise<QuickReply[]> => {
        const response = await api.get('/chat/quick-replies', { params: { team_id: teamId } });
        return response.data;
    },

    createQuickReply: async (data: { title: string; content: string; shortcut?: string; team_id?: string }): Promise<QuickReply> => {
        const response = await api.post('/chat/quick-replies', data);
        return response.data;
    },

    updateQuickReply: async (id: string, data: { title?: string; content?: string; shortcut?: string; team_id?: string; is_active?: boolean }): Promise<QuickReply> => {
        const response = await api.put(`/chat/quick-replies/${id}`, data);
        return response.data;
    },

    deleteQuickReply: async (id: string): Promise<void> => {
        await api.delete(`/chat/quick-replies/${id}`);
    },

    // Classifications
    listClassifications: async (): Promise<ChatClassification[]> => {
        const response = await api.get('/chat/classifications');
        return response.data;
    },

    createClassification: async (data: { name: string; color?: string }): Promise<ChatClassification> => {
        const response = await api.post('/chat/classifications', data);
        return response.data;
    },

    deleteClassification: async (id: string): Promise<void> => {
        await api.delete(`/chat/classifications/${id}`);
    },

    // Chatbot Config
    getChatbotConfig: async (): Promise<ChatbotConfig> => {
        const response = await api.get('/chat/chatbot/config');
        return response.data;
    },

    updateChatbotConfig: async (data: Partial<Omit<ChatbotConfig, 'id' | 'created_at' | 'updated_at'>>): Promise<ChatbotConfig> => {
        const response = await api.put('/chat/chatbot/config', data);
        return response.data;
    },
};


