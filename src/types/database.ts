// Gerado a partir do schema do Supabase (generate_typescript_types). Regere após cada migration.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" }
  public: {
    Tables: {
      events: {
        Row: { category: string; created_at: string; created_by: string; end_date: string; end_time: string | null; id: string; location: string | null; notes: string | null; remind_min: number | null; repeat: Json | null; repeat_until: string | null; start_date: string; start_time: string | null; title: string; updated_at: string; workspace_id: string }
        Insert: { category?: string; created_at?: string; created_by?: string; end_date: string; end_time?: string | null; id?: string; location?: string | null; notes?: string | null; remind_min?: number | null; repeat?: Json | null; repeat_until?: string | null; start_date: string; start_time?: string | null; title: string; updated_at?: string; workspace_id: string }
        Update: { category?: string; created_at?: string; created_by?: string; end_date?: string; end_time?: string | null; id?: string; location?: string | null; notes?: string | null; remind_min?: number | null; repeat?: Json | null; repeat_until?: string | null; start_date?: string; start_time?: string | null; title?: string; updated_at?: string; workspace_id?: string }
        Relationships: [{ foreignKeyName: "events_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      habit_logs: {
        Row: { created_at: string; habit_id: string; id: string; local_date: string; logged_at: string; user_id: string; value: number }
        Insert: { created_at?: string; habit_id: string; id?: string; local_date?: string; logged_at?: string; user_id?: string; value?: number }
        Update: { created_at?: string; habit_id?: string; id?: string; local_date?: string; logged_at?: string; user_id?: string; value?: number }
        Relationships: [{ foreignKeyName: "habit_logs_habit_id_fkey"; columns: ["habit_id"]; isOneToOne: false; referencedRelation: "habits"; referencedColumns: ["id"] }, { foreignKeyName: "habit_logs_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      habits: {
        Row: { archived_at: string | null; created_at: string; days: number[]; id: string; kind: string; name: string; period: string; position: number; reminder_time: string | null; target: number; tone: string; unit: string | null; user_id: string }
        Insert: { archived_at?: string | null; created_at?: string; days?: number[]; id?: string; kind?: string; name: string; period?: string; position?: number; reminder_time?: string | null; target?: number; tone?: string; unit?: string | null; user_id?: string }
        Update: { archived_at?: string | null; created_at?: string; days?: number[]; id?: string; kind?: string; name?: string; period?: string; position?: number; reminder_time?: string | null; target?: number; tone?: string; unit?: string | null; user_id?: string }
        Relationships: [{ foreignKeyName: "habits_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      invitations: {
        Row: { accepted_at: string | null; accepted_by: string | null; created_at: string; created_by: string; expires_at: string; id: string; invited_email: string; revoked_at: string | null; token_hash: string; workspace_id: string }
        Insert: { accepted_at?: string | null; accepted_by?: string | null; created_at?: string; created_by: string; expires_at?: string; id?: string; invited_email: string; revoked_at?: string | null; token_hash: string; workspace_id: string }
        Update: { accepted_at?: string | null; accepted_by?: string | null; created_at?: string; created_by?: string; expires_at?: string; id?: string; invited_email?: string; revoked_at?: string | null; token_hash?: string; workspace_id?: string }
        Relationships: [{ foreignKeyName: "invitations_accepted_by_fkey"; columns: ["accepted_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "invitations_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }, { foreignKeyName: "invitations_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      notification_jobs: {
        Row: { attempts: number; body: string; category: string; created_at: string; dedupe_key: string | null; essential: boolean; id: string; last_error: string | null; locked_at: string | null; read_at: string | null; scheduled_for: string; sent_at: string | null; source_id: string | null; source_type: string | null; status: string; title: string; url: string; user_id: string }
        Insert: { attempts?: number; body?: string; category: string; created_at?: string; dedupe_key?: string | null; essential?: boolean; id?: string; last_error?: string | null; locked_at?: string | null; read_at?: string | null; scheduled_for: string; sent_at?: string | null; source_id?: string | null; source_type?: string | null; status?: string; title: string; url?: string; user_id: string }
        Update: { attempts?: number; body?: string; category?: string; created_at?: string; dedupe_key?: string | null; essential?: boolean; id?: string; last_error?: string | null; locked_at?: string | null; read_at?: string | null; scheduled_for?: string; sent_at?: string | null; source_id?: string | null; source_type?: string | null; status?: string; title?: string; url?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "notification_jobs_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      notification_logs: {
        Row: { created_at: string; error: string | null; id: number; job_id: string; status_code: number | null; subscription_id: string | null }
        Insert: { created_at?: string; error?: string | null; id?: never; job_id: string; status_code?: number | null; subscription_id?: string | null }
        Update: { created_at?: string; error?: string | null; id?: never; job_id?: string; status_code?: number | null; subscription_id?: string | null }
        Relationships: [{ foreignKeyName: "notification_logs_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "notification_jobs"; referencedColumns: ["id"] }, { foreignKeyName: "notification_logs_subscription_id_fkey"; columns: ["subscription_id"]; isOneToOne: false; referencedRelation: "push_subscriptions"; referencedColumns: ["id"] }]
      }
      notification_preferences: {
        Row: { category: string; enabled: boolean; lead_minutes: number | null; show_details: boolean; user_id: string }
        Insert: { category: string; enabled?: boolean; lead_minutes?: number | null; show_details?: boolean; user_id: string }
        Update: { category?: string; enabled?: boolean; lead_minutes?: number | null; show_details?: boolean; user_id?: string }
        Relationships: [{ foreignKeyName: "notification_preferences_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      profiles: {
        Row: { avatar_path: string | null; created_at: string; display_name: string; id: string; tz: string; updated_at: string }
        Insert: { avatar_path?: string | null; created_at?: string; display_name?: string; id: string; tz?: string; updated_at?: string }
        Update: { avatar_path?: string | null; created_at?: string; display_name?: string; id?: string; tz?: string; updated_at?: string }
        Relationships: []
      }
      push_subscriptions: {
        Row: { auth: string; created_at: string; device_label: string; endpoint: string; id: string; last_success_at: string | null; p256dh: string; revoked_at: string | null; user_agent: string | null; user_id: string }
        Insert: { auth: string; created_at?: string; device_label?: string; endpoint: string; id?: string; last_success_at?: string | null; p256dh: string; revoked_at?: string | null; user_agent?: string | null; user_id: string }
        Update: { auth?: string; created_at?: string; device_label?: string; endpoint?: string; id?: string; last_success_at?: string | null; p256dh?: string; revoked_at?: string | null; user_agent?: string | null; user_id?: string }
        Relationships: [{ foreignKeyName: "push_subscriptions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      subtasks: {
        Row: { done: boolean; id: string; position: number; task_id: string; title: string; workspace_id: string }
        Insert: { done?: boolean; id?: string; position?: number; task_id: string; title: string; workspace_id?: string }
        Update: { done?: boolean; id?: string; position?: number; task_id?: string; title?: string; workspace_id?: string }
        Relationships: [{ foreignKeyName: "subtasks_task_id_fkey"; columns: ["task_id"]; isOneToOne: false; referencedRelation: "tasks"; referencedColumns: ["id"] }, { foreignKeyName: "subtasks_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      task_occurrences: {
        Row: { assignee_id: string | null; completed_at: string | null; completed_by: string | null; id: string; occurs_on: string; snoozed_to: string | null; status: string; task_id: string; workspace_id: string }
        Insert: { assignee_id?: string | null; completed_at?: string | null; completed_by?: string | null; id?: string; occurs_on: string; snoozed_to?: string | null; status?: string; task_id: string; workspace_id?: string }
        Update: { assignee_id?: string | null; completed_at?: string | null; completed_by?: string | null; id?: string; occurs_on?: string; snoozed_to?: string | null; status?: string; task_id?: string; workspace_id?: string }
        Relationships: [{ foreignKeyName: "task_occurrences_task_id_fkey"; columns: ["task_id"]; isOneToOne: false; referencedRelation: "tasks"; referencedColumns: ["id"] }, { foreignKeyName: "task_occurrences_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      tasks: {
        Row: { archived_at: string | null; assignee_id: string | null; category: string; completed_at: string | null; completed_by: string | null; created_at: string; created_by: string; due_date: string | null; due_time: string | null; id: string; notes: string | null; priority: number; remind: boolean; repeat: Json | null; repeat_start: string | null; rotation: string[] | null; status: string; title: string; updated_at: string; workspace_id: string }
        Insert: { archived_at?: string | null; assignee_id?: string | null; category?: string; completed_at?: string | null; completed_by?: string | null; created_at?: string; created_by?: string; due_date?: string | null; due_time?: string | null; id?: string; notes?: string | null; priority?: number; remind?: boolean; repeat?: Json | null; repeat_start?: string | null; rotation?: string[] | null; status?: string; title: string; updated_at?: string; workspace_id: string }
        Update: { archived_at?: string | null; assignee_id?: string | null; category?: string; completed_at?: string | null; completed_by?: string | null; created_at?: string; created_by?: string; due_date?: string | null; due_time?: string | null; id?: string; notes?: string | null; priority?: number; remind?: boolean; repeat?: Json | null; repeat_start?: string | null; rotation?: string[] | null; status?: string; title?: string; updated_at?: string; workspace_id?: string }
        Relationships: [{ foreignKeyName: "tasks_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      user_settings: {
        Row: { home_layout: Json; quiet_end: string; quiet_start: string; updated_at: string; user_id: string; water_every_min: number; water_from: string; water_goal_ml: number; water_presets: number[]; water_reminders: boolean; water_to: string }
        Insert: { home_layout?: Json; quiet_end?: string; quiet_start?: string; updated_at?: string; user_id: string; water_every_min?: number; water_from?: string; water_goal_ml?: number; water_presets?: number[]; water_reminders?: boolean; water_to?: string }
        Update: { home_layout?: Json; quiet_end?: string; quiet_start?: string; updated_at?: string; user_id?: string; water_every_min?: number; water_from?: string; water_goal_ml?: number; water_presets?: number[]; water_reminders?: boolean; water_to?: string }
        Relationships: [{ foreignKeyName: "user_settings_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      water_logs: {
        Row: { amount_ml: number; created_at: string; id: string; local_date: string; logged_at: string; user_id: string }
        Insert: { amount_ml: number; created_at?: string; id?: string; local_date?: string; logged_at?: string; user_id?: string }
        Update: { amount_ml?: number; created_at?: string; id?: string; local_date?: string; logged_at?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "water_logs_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      workspace_members: {
        Row: { joined_at: string; reference_income_cents: number | null; role: string; user_id: string; workspace_id: string }
        Insert: { joined_at?: string; reference_income_cents?: number | null; role?: string; user_id: string; workspace_id: string }
        Update: { joined_at?: string; reference_income_cents?: number | null; role?: string; user_id?: string; workspace_id?: string }
        Relationships: [
          { foreignKeyName: "workspace_members_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "workspace_members_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] },
        ]
      }
      workspaces: {
        Row: { created_at: string; created_by: string; id: string; kind: string; name: string }
        Insert: { created_at?: string; created_by: string; id?: string; kind: string; name: string }
        Update: { created_at?: string; created_by?: string; id?: string; kind?: string; name?: string }
        Relationships: [{ foreignKeyName: "workspaces_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      claim_notification_jobs: {
        Args: { p_limit?: number }
        Returns: Database["public"]["Tables"]["notification_jobs"]["Row"][]
        SetofOptions: { from: "*"; to: "notification_jobs"; isOneToOne: false; isSetofReturn: true }
      }
      create_shared_workspace: { Args: { p_name: string }; Returns: string }
      is_member: { Args: { ws: string }; Returns: boolean }
      is_owner: { Args: { ws: string }; Returns: boolean }
      register_push_subscription: {
        Args: { p_auth: string; p_endpoint: string; p_label: string; p_p256dh: string; p_user_agent: string }
        Returns: string
      }
      shares_workspace: { Args: { other: string }; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
