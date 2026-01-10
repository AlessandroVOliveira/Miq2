/**
 * TypeScript type definitions for the Miq2 application.
 */

// User types
export interface User {
    id: string;
    email: string;
    name: string;
    is_active: boolean;
    is_superuser: boolean;
    created_at: string;
    updated_at: string;
    teams: TeamBasic[];
    roles: RoleBasic[];
}

export interface UserCreate {
    email: string;
    name: string;
    password: string;
    is_active?: boolean;
    is_superuser?: boolean;
    team_ids?: string[];
    role_ids?: string[];
}

export interface UserUpdate {
    email?: string;
    name?: string;
    password?: string;
    is_active?: boolean;
    is_superuser?: boolean;
    team_ids?: string[];
    role_ids?: string[];
}

// Team types
export interface Team {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
    members?: UserBasic[];
}

export interface TeamBasic {
    id: string;
    name: string;
}

export interface TeamCreate {
    name: string;
    description?: string;
}

export interface TeamUpdate {
    name?: string;
    description?: string;
}

// Role types
export interface Role {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
    permissions: PermissionBasic[];
}

export interface RoleBasic {
    id: string;
    name: string;
    permissions?: { resource: string; action: string }[];
}

export interface RoleCreate {
    name: string;
    description?: string;
    permission_ids?: string[];
}

export interface RoleUpdate {
    name?: string;
    description?: string;
    permission_ids?: string[];
}

// Permission types
export interface Permission {
    id: string;
    resource: string;
    action: string;
    description?: string;
    created_at: string;
}

export interface PermissionBasic {
    id: string;
    resource: string;
    action: string;
}

export interface PermissionCreate {
    resource: string;
    action: string;
    description?: string;
}

// Client types
export interface Client {
    id: string;
    company_name: string;
    cnpj?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    phone?: string;
    email?: string;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    contacts: ClientContact[];
}

export interface ClientCreate {
    company_name: string;
    cnpj?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    phone?: string;
    email?: string;
    notes?: string;
    is_active?: boolean;
    contacts?: ClientContactCreate[];
}

export interface ClientUpdate {
    company_name?: string;
    cnpj?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    phone?: string;
    email?: string;
    notes?: string;
    is_active?: boolean;
}

// Client Contact types
export interface ClientContact {
    id: string;
    client_id: string;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

export interface ClientContactCreate {
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    is_primary?: boolean;
}

export interface ClientContactUpdate {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    is_primary?: boolean;
}

// Auth types
export interface LoginRequest {
    username: string;
    password: string;
}

export interface Token {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

// Pagination types
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
}

// ========== Phase 2: Products and Implementations ==========

// Product types
export interface Product {
    id: string;
    name: string;
    description?: string;
    version?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    checklists: ProductChecklist[];
}

export interface ProductCreate {
    name: string;
    description?: string;
    version?: string;
    is_active?: boolean;
}

export interface ProductUpdate {
    name?: string;
    description?: string;
    version?: string;
    is_active?: boolean;
}

export interface ProductChecklist {
    id: string;
    template: ChecklistTemplateBasic;
    is_default: boolean;
}

export interface ChecklistTemplateBasic {
    id: string;
    name: string;
    version?: string;
}

// Checklist Template types
export interface ChecklistTemplate {
    id: string;
    name: string;
    description?: string;
    version: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    items: ChecklistItem[];
}

export interface ChecklistTemplateCreate {
    name: string;
    description?: string;
    version?: string;
    is_active?: boolean;
    items?: ChecklistItemCreate[];
}

export interface ChecklistTemplateUpdate {
    name?: string;
    description?: string;
    version?: string;
    is_active?: boolean;
}

export interface ChecklistItem {
    id: string;
    template_id: string;
    category?: string;
    title: string;
    description?: string;
    order: number;
    estimated_hours: number;
    created_at: string;
    updated_at: string;
}

export interface ChecklistItemCreate {
    category?: string;
    title: string;
    description?: string;
    order?: number;
    estimated_hours?: number;
}

export interface ChecklistItemUpdate {
    category?: string;
    title?: string;
    description?: string;
    order?: number;
    estimated_hours?: number;
}

// Implementation types
export type ImplementationStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type AttachmentType = 'acceptance_term' | 'initial_report' | 'final_report' | 'other';

export interface ClientBasic {
    id: string;
    company_name: string;
}

export interface ProductBasic {
    id: string;
    name: string;
}

export interface UserBasic {
    id: string;
    name: string;
}

export interface Implementation {
    id: string;
    title: string;
    description?: string;
    client: ClientBasic;
    product?: ProductBasic;
    responsible_user?: UserBasic;
    status: ImplementationStatus;
    start_date?: string;
    estimated_end_date?: string;
    actual_end_date?: string;
    notes?: string;
    progress_percentage: number;
    items: ImplementationItem[];
    attachments: ImplementationAttachment[];
    created_at: string;
    updated_at: string;
}

export interface ImplementationListItem {
    id: string;
    title: string;
    client: ClientBasic;
    product?: ProductBasic;
    responsible_user?: UserBasic;
    status: ImplementationStatus;
    start_date?: string;
    estimated_end_date?: string;
    progress_percentage: number;
    created_at: string;
}

export interface ImplementationCreate {
    title: string;
    description?: string;
    client_id: string;
    product_id?: string;
    responsible_user_id?: string;
    checklist_template_id?: string;
    start_date?: string;
    estimated_end_date?: string;
    notes?: string;
}

export interface ImplementationUpdate {
    title?: string;
    description?: string;
    product_id?: string;
    responsible_user_id?: string;
    status?: ImplementationStatus;
    start_date?: string;
    estimated_end_date?: string;
    actual_end_date?: string;
    notes?: string;
}

export interface ImplementationItem {
    id: string;
    implementation_id: string;
    category?: string;
    title: string;
    description?: string;
    status: ItemStatus;
    order: number;
    start_date?: string;
    end_date?: string;
    estimated_hours: number;
    completed_at?: string;
    completed_by?: UserBasic;
    cancelled_at?: string;
    cancelled_by?: UserBasic;
    cancelled_reason?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface ImplementationItemUpdate {
    category?: string;
    title?: string;
    description?: string;
    status?: ItemStatus;
    order?: number;
    start_date?: string;
    end_date?: string;
    estimated_hours?: number;
    notes?: string;
}

export interface ImplementationAttachment {
    id: string;
    implementation_id: string;
    filename: string;
    file_path: string;
    file_type?: string;
    file_size: number;
    description?: string;
    attachment_type: AttachmentType;
    uploaded_by?: UserBasic;
    created_at: string;
}

// Gantt chart types
export interface GanttItem {
    id: string;
    title: string;
    category?: string;
    start_date?: string;
    end_date?: string;
    status: ItemStatus;
    progress: number;
    estimated_hours: number;
}

export interface GanttResponse {
    implementation_id: string;
    title: string;
    start_date?: string;
    estimated_end_date?: string;
    items: GanttItem[];
}

// ==================== Phase 3: Service Orders ====================

export type ServiceOrderStatus = 'open' | 'in_progress' | 'waiting_parts' | 'completed' | 'cancelled';
export type ServiceOrderPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ServiceOrderCategory = 'maintenance' | 'installation' | 'repair' | 'upgrade' | 'other';

export interface ServiceOrderTemplate {
    id: string;
    name: string;
    description?: string;
    category: ServiceOrderCategory;
    default_steps?: string;
    estimated_duration_hours: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ServiceOrderTemplateCreate {
    name: string;
    description?: string;
    category?: ServiceOrderCategory;
    default_steps?: string;
    estimated_duration_hours?: number;
}

export interface ServiceOrderTemplateUpdate {
    name?: string;
    description?: string;
    category?: ServiceOrderCategory;
    default_steps?: string;
    estimated_duration_hours?: number;
    is_active?: boolean;
}

export interface EquipmentEntry {
    id: string;
    service_order_id: string;
    serial_number?: string;
    description: string;
    condition_on_entry?: string;
    condition_on_exit?: string;
    entry_date: string;
    exit_date?: string;
    received_by?: UserBasic;
    released_to?: string;
    created_at: string;
}

export interface EquipmentEntryCreate {
    serial_number?: string;
    description: string;
    condition_on_entry?: string;
}

export interface EquipmentEntryUpdate {
    condition_on_exit?: string;
    exit_date?: string;
    released_to?: string;
}

export interface ServiceOrder {
    id: string;
    title: string;
    description?: string;
    client: ClientBasic;
    template?: ServiceOrderTemplate;
    assigned_user?: UserBasic;
    team?: TeamBasic;
    status: ServiceOrderStatus;
    priority: ServiceOrderPriority;
    equipment_serial?: string;
    equipment_description?: string;
    opened_at: string;
    started_at?: string;
    completed_at?: string;
    resolution_notes?: string;
    equipment_entries: EquipmentEntry[];
    created_at: string;
    updated_at: string;
}

export interface ServiceOrderCreate {
    title: string;
    description?: string;
    client_id: string;
    template_id?: string;
    assigned_user_id?: string;
    team_id?: string;
    priority?: ServiceOrderPriority;
    equipment_serial?: string;
    equipment_description?: string;
}

export interface ServiceOrderUpdate {
    title?: string;
    description?: string;
    assigned_user_id?: string;
    team_id?: string;
    status?: ServiceOrderStatus;
    priority?: ServiceOrderPriority;
    equipment_serial?: string;
    equipment_description?: string;
    resolution_notes?: string;
}

export interface ServiceOrderListItem {
    id: string;
    title: string;
    client: ClientBasic;
    assigned_user?: UserBasic;
    status: ServiceOrderStatus;
    priority: ServiceOrderPriority;
    opened_at: string;
    created_at: string;
}

export interface ServiceOrderListResponse {
    items: ServiceOrderListItem[];
    total: number;
    page: number;
    size: number;
}

export interface ServiceOrderTemplateListResponse {
    items: ServiceOrderTemplate[];
    total: number;
    page: number;
    size: number;
}

// ==================== Phase 3: Tasks ====================

export type TaskStatus = 'scheduled' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface TaskDiary {
    id: string;
    task_id: string;
    user: UserBasic;
    content: string;
    created_at: string;
}

export interface TaskDiaryCreate {
    content: string;
}

export interface TaskBlocker {
    id: string;
    task_id: string;
    reason: string;
    blocked_by: UserBasic;
    blocked_at: string;
    resolved_at?: string;
    resolution_notes?: string;
}

export interface TaskBlockerCreate {
    reason: string;
}

export interface TaskBlockerResolve {
    resolution_notes?: string;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    assigned_user?: UserBasic;
    team?: TeamBasic;
    client?: ClientBasic;
    related_implementation_id?: string;
    related_service_order_id?: string;
    scheduled_date?: string;
    scheduled_time?: string;
    duration_minutes: number;
    is_all_day: boolean;
    status: TaskStatus;
    priority: TaskPriority;
    recurrence: TaskRecurrence;
    completed_at?: string;
    completed_by?: UserBasic;
    diary_entries: TaskDiary[];
    blockers: TaskBlocker[];
    created_at: string;
    updated_at: string;
}

export interface TaskCreate {
    title: string;
    description?: string;
    assigned_user_id?: string;
    team_id?: string;
    client_id?: string;
    related_implementation_id?: string;
    related_service_order_id?: string;
    scheduled_date?: string;
    scheduled_time?: string;
    duration_minutes?: number;
    is_all_day?: boolean;
    priority?: TaskPriority;
    recurrence?: TaskRecurrence;
}

export interface TaskUpdate {
    title?: string;
    description?: string;
    assigned_user_id?: string;
    team_id?: string;
    client_id?: string;
    scheduled_date?: string;
    scheduled_time?: string;
    duration_minutes?: number;
    is_all_day?: boolean;
    status?: TaskStatus;
    priority?: TaskPriority;
    recurrence?: TaskRecurrence;
}

export interface TaskListItem {
    id: string;
    title: string;
    assigned_user?: UserBasic;
    client?: ClientBasic;
    scheduled_date?: string;
    scheduled_time?: string;
    duration_minutes: number;
    is_all_day: boolean;
    status: TaskStatus;
    priority: TaskPriority;
}

export interface TaskListResponse {
    items: TaskListItem[];
    total: number;
    page: number;
    size: number;
}

export interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    color: string;
    status: TaskStatus;
    priority: TaskPriority;
    client_name?: string;
}

export interface CalendarResponse {
    events: CalendarEvent[];
    start_date: string;
    end_date: string;
}

// ==================== Phase 4: Sprints ====================

export type SprintStatus = 'active' | 'completed' | 'archived';

export interface TaskBasic {
    id: string;
    title: string;
    status: string;
    priority: string;
    scheduled_date?: string;
}

export interface SprintTask {
    id: string;
    sprint_id: string;
    task: TaskBasic;
    carried_over: boolean;
    notes?: string;
    created_at: string;
}

export interface SprintTaskCreate {
    task_id: string;
    carried_over?: boolean;
    notes?: string;
}

export interface Sprint {
    id: string;
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    team?: TeamBasic;
    status: SprintStatus;
    meeting_notes?: string;
    meeting_date?: string;
    sprint_tasks: SprintTask[];
    created_at: string;
    updated_at: string;
}

export interface SprintCreate {
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    team_id?: string;
}

export interface SprintUpdate {
    title?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    team_id?: string;
    status?: SprintStatus;
    meeting_notes?: string;
    meeting_date?: string;
}

export interface SprintListItem {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    status: SprintStatus;
    team?: TeamBasic;
    task_count: number;
    completed_count: number;
    created_at: string;
}

export interface SprintListResponse {
    items: SprintListItem[];
    total: number;
    page: number;
    size: number;
}

export interface SprintAgenda {
    sprint_id: string;
    sprint_title: string;
    period: string;
    generated_at: string;
    completed_tasks: TaskBasic[];
    pending_tasks: TaskBasic[];
    blocked_tasks: TaskBasic[];
    carried_over: TaskBasic[];
}

export interface SprintSummary {
    sprint_id: string;
    total_tasks: number;
    completed: number;
    in_progress: number;
    pending: number;
    blocked: number;
    completion_percentage: number;
}

// ==================== Phase 5: Repository ====================

export interface FileCategory {
    id: string;
    name: string;
    description?: string;
    parent_id?: string;
    team_id?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface FileCategoryTree extends FileCategory {
    children: FileCategoryTree[];
    file_count: number;
}

export interface FileCategoryCreate {
    name: string;
    description?: string;
    parent_id?: string;
    team_id?: string;
}

export interface FileCategoryUpdate {
    name?: string;
    description?: string;
    parent_id?: string;
    team_id?: string;
    is_active?: boolean;
}

export interface RepositoryFile {
    id: string;
    filename: string;
    original_filename: string;
    file_size: number;
    mime_type?: string;
    category_id?: string;
    description?: string;
    tags?: string;
    version: number;
    uploaded_by: UserBasic;
    download_count: number;
    created_at: string;
    updated_at: string;
}

export interface RepositoryFileListItem {
    id: string;
    filename: string;
    original_filename: string;
    file_size: number;
    mime_type?: string;
    category_id?: string;
    description?: string;
    tags?: string;
    version: number;
    uploaded_by: UserBasic;
    download_count: number;
    created_at: string;
}

export interface RepositoryFileListResponse {
    items: RepositoryFileListItem[];
    total: number;
    page: number;
    size: number;
}

// ==================== Phase 5: Dashboard ====================

export interface DashboardSummary {
    total_clients: number;
    active_clients: number;
    total_implementations: number;
    implementations_in_progress: number;
    implementations_completed: number;
    total_service_orders: number;
    service_orders_open: number;
    service_orders_in_progress: number;
    total_tasks: number;
    tasks_pending: number;
    tasks_blocked: number;
}

export interface ImplementationStats {
    total: number;
    by_status: Record<string, number>;
    average_progress: number;
}

export interface ServiceOrderStats {
    total: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
}

export interface TaskStats {
    total: number;
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
}

export interface RecentActivity {
    type: string;
    title: string;
    status: string;
    created_at: string;
}

export interface FullDashboard {
    summary: DashboardSummary;
    implementations: ImplementationStats;
    service_orders: ServiceOrderStats;
    tasks: TaskStats;
    recent_activities: RecentActivity[];
}

// ==================== Document Templates ====================

export type TemplateType = 'opening_term' | 'closing_term' | 'progress_report' | 'other';

export interface PlaceholderInfo {
    name: string;
    description: string;
    example?: string;
}

export interface DocumentTemplate {
    id: string;
    name: string;
    description?: string;
    template_type: TemplateType;
    file_path: string;
    original_filename: string;
    placeholders: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
    products: ProductBasic[];
}

export interface DocumentTemplateListItem {
    id: string;
    name: string;
    description?: string;
    template_type: TemplateType;
    original_filename: string;
    placeholders: string[];
    is_active: boolean;
    created_at: string;
    product_count: number;
}

export interface DocumentTemplateCreate {
    name: string;
    description?: string;
    template_type: TemplateType;
    product_ids: string[];
}

export interface DocumentTemplateUpdate {
    name?: string;
    description?: string;
    template_type?: TemplateType;
    product_ids?: string[];
    is_active?: boolean;
}

export interface TemplateTypeOption {
    value: TemplateType;
    label: string;
}

