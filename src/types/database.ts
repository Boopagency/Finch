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
      fin_accounts: {
        Row: { archived_at: string | null; card_limit_cents: number | null; closing_day: number | null; created_at: string; due_day: number | null; id: string; kind: string; name: string; opening_balance_cents: number; owner_id: string | null; workspace_id: string }
        Insert: { archived_at?: string | null; card_limit_cents?: number | null; closing_day?: number | null; created_at?: string; due_day?: number | null; id?: string; kind: string; name: string; opening_balance_cents?: number; owner_id?: string | null; workspace_id: string }
        Update: { archived_at?: string | null; card_limit_cents?: number | null; closing_day?: number | null; created_at?: string; due_day?: number | null; id?: string; kind?: string; name?: string; opening_balance_cents?: number; owner_id?: string | null; workspace_id?: string }
        Relationships: [{ foreignKeyName: "fin_accounts_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      fin_budgets: {
        Row: { category_id: string; limit_cents: number; workspace_id: string }
        Insert: { category_id: string; limit_cents: number; workspace_id: string }
        Update: { category_id?: string; limit_cents?: number; workspace_id?: string }
        Relationships: [{ foreignKeyName: "fin_budgets_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "fin_categories"; referencedColumns: ["id"] }]
      }
      fin_categories: {
        Row: { archived_at: string | null; id: string; kind: string; name: string; workspace_id: string }
        Insert: { archived_at?: string | null; id?: string; kind: string; name: string; workspace_id: string }
        Update: { archived_at?: string | null; id?: string; kind?: string; name?: string; workspace_id?: string }
        Relationships: []
      }
      fin_entries: {
        Row: { category_id: string | null; created_at: string; created_by: string | null; description: string; group_id: string | null; id: string; installment_no: number | null; installments: number | null; kind: string; month: string; occurred_on: string; purchase_id: string | null; status: string; voided_at: string | null; workspace_id: string }
        Insert: { category_id?: string | null; created_at?: string; created_by?: string | null; description?: string; group_id?: string | null; id: string; installment_no?: number | null; installments?: number | null; kind: string; month: string; occurred_on: string; purchase_id?: string | null; status?: string; voided_at?: string | null; workspace_id: string }
        Update: { category_id?: string | null; created_at?: string; created_by?: string | null; description?: string; group_id?: string | null; id?: string; installment_no?: number | null; installments?: number | null; kind?: string; month?: string; occurred_on?: string; purchase_id?: string | null; status?: string; voided_at?: string | null; workspace_id?: string }
        Relationships: [{ foreignKeyName: "fin_entries_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "fin_categories"; referencedColumns: ["id"] }]
      }
      fin_postings: {
        Row: { account_id: string; amount_cents: number; entry_id: string; id: number }
        Insert: { account_id: string; amount_cents: number; entry_id: string; id?: number }
        Update: { account_id?: string; amount_cents?: number; entry_id?: string; id?: number }
        Relationships: [{ foreignKeyName: "fin_postings_entry_id_fkey"; columns: ["entry_id"]; isOneToOne: false; referencedRelation: "fin_entries"; referencedColumns: ["id"] }, { foreignKeyName: "fin_postings_account_id_fkey"; columns: ["account_id"]; isOneToOne: false; referencedRelation: "fin_accounts"; referencedColumns: ["id"] }]
      }
      fin_settlements: {
        Row: { amount_cents: number; created_at: string; created_by: string | null; from_user: string; id: string; note: string | null; occurred_on: string; to_user: string; voided_at: string | null; workspace_id: string }
        Insert: { amount_cents: number; created_at?: string; created_by?: string | null; from_user: string; id?: string; note?: string | null; occurred_on: string; to_user: string; voided_at?: string | null; workspace_id: string }
        Update: { amount_cents?: number; created_at?: string; created_by?: string | null; from_user?: string; id?: string; note?: string | null; occurred_on?: string; to_user?: string; voided_at?: string | null; workspace_id?: string }
        Relationships: []
      }
      fin_splits: {
        Row: { entry_id: string; method: string; paid_by: string; shares: Json; total_cents: number; workspace_id: string }
        Insert: { entry_id: string; method: string; paid_by: string; shares: Json; total_cents: number; workspace_id: string }
        Update: { entry_id?: string; method?: string; paid_by?: string; shares?: Json; total_cents?: number; workspace_id?: string }
        Relationships: [{ foreignKeyName: "fin_splits_entry_id_fkey"; columns: ["entry_id"]; isOneToOne: false; referencedRelation: "fin_entries"; referencedColumns: ["id"] }]
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
      products: {
        Row: { category: string; favorite: boolean; id: string; last_price_cents: number | null; name: string; times_bought: number; unit: string | null; updated_at: string; workspace_id: string }
        Insert: { category?: string; favorite?: boolean; id?: string; last_price_cents?: number | null; name: string; times_bought?: number; unit?: string | null; updated_at?: string; workspace_id: string }
        Update: { category?: string; favorite?: boolean; id?: string; last_price_cents?: number | null; name?: string; times_bought?: number; unit?: string | null; updated_at?: string; workspace_id?: string }
        Relationships: [{ foreignKeyName: "products_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      purchases: {
        Row: { created_at: string; created_by: string; id: string; items_count: number; list_id: string | null; paid_by: string | null; payment: string; purchased_on: string; store: string | null; total_cents: number; workspace_id: string }
        Insert: { created_at?: string; created_by?: string; id?: string; items_count?: number; list_id?: string | null; paid_by?: string | null; payment?: string; purchased_on: string; store?: string | null; total_cents: number; workspace_id: string }
        Update: { created_at?: string; created_by?: string; id?: string; items_count?: number; list_id?: string | null; paid_by?: string | null; payment?: string; purchased_on?: string; store?: string | null; total_cents?: number; workspace_id?: string }
        Relationships: [{ foreignKeyName: "purchases_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      shopping_items: {
        Row: { category: string; checked: boolean; checked_at: string | null; checked_by: string | null; created_at: string; added_by: string | null; est_price_cents: number | null; id: string; list_id: string; name: string; note: string | null; qty: number; unit: string | null; workspace_id: string }
        Insert: { category?: string; checked?: boolean; checked_at?: string | null; checked_by?: string | null; created_at?: string; added_by?: string | null; est_price_cents?: number | null; id?: string; list_id: string; name: string; note?: string | null; qty?: number; unit?: string | null; workspace_id?: string }
        Update: { category?: string; checked?: boolean; checked_at?: string | null; checked_by?: string | null; created_at?: string; added_by?: string | null; est_price_cents?: number | null; id?: string; list_id?: string; name?: string; note?: string | null; qty?: number; unit?: string | null; workspace_id?: string }
        Relationships: [{ foreignKeyName: "shopping_items_list_id_fkey"; columns: ["list_id"]; isOneToOne: false; referencedRelation: "shopping_lists"; referencedColumns: ["id"] }, { foreignKeyName: "shopping_items_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      shopping_lists: {
        Row: { budget_cents: number | null; created_at: string; created_by: string; done_at: string | null; id: string; name: string; status: string; workspace_id: string }
        Insert: { budget_cents?: number | null; created_at?: string; created_by?: string; done_at?: string | null; id?: string; name: string; status?: string; workspace_id: string }
        Update: { budget_cents?: number | null; created_at?: string; created_by?: string; done_at?: string | null; id?: string; name?: string; status?: string; workspace_id?: string }
        Relationships: [{ foreignKeyName: "shopping_lists_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      push_subscriptions: {
        Row: { auth: string; created_at: string; device_label: string; endpoint: string; id: string; last_success_at: string | null; p256dh: string; revoked_at: string | null; user_agent: string | null; user_id: string }
        Insert: { auth: string; created_at?: string; device_label?: string; endpoint: string; id?: string; last_success_at?: string | null; p256dh: string; revoked_at?: string | null; user_agent?: string | null; user_id: string }
        Update: { auth?: string; created_at?: string; device_label?: string; endpoint?: string; id?: string; last_success_at?: string | null; p256dh?: string; revoked_at?: string | null; user_agent?: string | null; user_id?: string }
        Relationships: [{ foreignKeyName: "push_subscriptions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      sticker_items: {
        Row: { created_at: string; id: string; owner_id: string; pack_id: string | null; pasted_at: string | null; slot: number | null; sticker_code: string }
        Insert: { created_at?: string; id?: string; owner_id: string; pack_id?: string | null; pasted_at?: string | null; slot?: number | null; sticker_code: string }
        Update: { created_at?: string; id?: string; owner_id?: string; pack_id?: string | null; pasted_at?: string | null; slot?: number | null; sticker_code?: string }
        Relationships: [{ foreignKeyName: "sticker_items_sticker_code_fkey"; columns: ["sticker_code"]; isOneToOne: false; referencedRelation: "stickers"; referencedColumns: ["code"] }]
      }
      sticker_packs: {
        Row: { created_at: string; id: string; opened_at: string | null; reason: string; user_id: string }
        Insert: { created_at?: string; id?: string; opened_at?: string | null; reason: string; user_id: string }
        Update: { created_at?: string; id?: string; opened_at?: string | null; reason?: string; user_id?: string }
        Relationships: []
      }
      sticker_pages: {
        Row: { code: string; name: string; position: number; season: number; tone: string }
        Insert: { code: string; name: string; position: number; season?: number; tone: string }
        Update: { code?: string; name?: string; position?: number; season?: number; tone?: string }
        Relationships: []
      }
      sticker_trades: {
        Row: { created_at: string; decided_at: string | null; from_user: string; give_item: string; id: string; status: string; to_user: string; want_item: string | null }
        Insert: { created_at?: string; decided_at?: string | null; from_user: string; give_item: string; id?: string; status?: string; to_user: string; want_item?: string | null }
        Update: { created_at?: string; decided_at?: string | null; from_user?: string; give_item?: string; id?: string; status?: string; to_user?: string; want_item?: string | null }
        Relationships: []
      }
      stickers: {
        Row: { achievement: string | null; code: string; icon: string; name: string; page_code: string; position: number; rarity: string }
        Insert: { achievement?: string | null; code: string; icon: string; name: string; page_code: string; position: number; rarity: string }
        Update: { achievement?: string | null; code?: string; icon?: string; name?: string; page_code?: string; position?: number; rarity?: string }
        Relationships: []
      }
      xp_events: {
        Row: { created_at: string; id: string; period_key: string; points: number; revoked_at: string | null; rule_key: string; source_id: string; user_id: string }
        Insert: { created_at?: string; id?: string; period_key?: string; points: number; revoked_at?: string | null; rule_key: string; source_id?: string; user_id: string }
        Update: { created_at?: string; id?: string; period_key?: string; points?: number; revoked_at?: string | null; rule_key?: string; source_id?: string; user_id?: string }
        Relationships: []
      }
      xp_rules: {
        Row: { daily_cap: number; key: string; label: string; points: number }
        Insert: { daily_cap: number; key: string; label: string; points: number }
        Update: { daily_cap?: number; key?: string; label?: string; points?: number }
        Relationships: []
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
      body_logs: {
        Row: { id: string; user_id: string; logged_at: string; local_date: string; weight_g: number | null; waist_mm: number | null; sleep_min: number | null; mood: number | null; note: string | null }
        Insert: { id?: string; user_id?: string; logged_at?: string; local_date?: string; weight_g?: number | null; waist_mm?: number | null; sleep_min?: number | null; mood?: number | null; note?: string | null }
        Update: { id?: string; user_id?: string; logged_at?: string; local_date?: string; weight_g?: number | null; waist_mm?: number | null; sleep_min?: number | null; mood?: number | null; note?: string | null }
        Relationships: [{ foreignKeyName: "body_logs_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      exercises: {
        Row: { id: string; user_id: string | null; name: string; muscle: string; kind: string; created_at: string }
        Insert: { id?: string; user_id?: string | null; name: string; muscle?: string; kind?: string; created_at?: string }
        Update: { id?: string; user_id?: string | null; name?: string; muscle?: string; kind?: string; created_at?: string }
        Relationships: [{ foreignKeyName: "exercises_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      workouts: {
        Row: { id: string; user_id: string; name: string; position: number; archived_at: string | null; created_at: string }
        Insert: { id?: string; user_id?: string; name: string; position?: number; archived_at?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; name?: string; position?: number; archived_at?: string | null; created_at?: string }
        Relationships: [{ foreignKeyName: "workouts_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      workout_exercises: {
        Row: { id: string; workout_id: string; user_id: string; exercise_id: string; position: number; sets: number; reps: number; rest_s: number }
        Insert: { id?: string; workout_id: string; user_id?: string; exercise_id: string; position?: number; sets?: number; reps?: number; rest_s?: number }
        Update: { id?: string; workout_id?: string; user_id?: string; exercise_id?: string; position?: number; sets?: number; reps?: number; rest_s?: number }
        Relationships: [{ foreignKeyName: "workout_exercises_workout_id_fkey"; columns: ["workout_id"]; isOneToOne: false; referencedRelation: "workouts"; referencedColumns: ["id"] }, { foreignKeyName: "workout_exercises_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "exercises"; referencedColumns: ["id"] }, { foreignKeyName: "workout_exercises_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      workout_sessions: {
        Row: { id: string; user_id: string; workout_id: string | null; name: string; logged_at: string; local_date: string; finished_at: string | null; created_at: string }
        Insert: { id?: string; user_id?: string; workout_id?: string | null; name: string; logged_at?: string; local_date?: string; finished_at?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; workout_id?: string | null; name?: string; logged_at?: string; local_date?: string; finished_at?: string | null; created_at?: string }
        Relationships: [{ foreignKeyName: "workout_sessions_workout_id_fkey"; columns: ["workout_id"]; isOneToOne: false; referencedRelation: "workouts"; referencedColumns: ["id"] }, { foreignKeyName: "workout_sessions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      workout_sets: {
        Row: { id: string; session_id: string; user_id: string; exercise_id: string; weight_g: number | null; reps: number | null; duration_s: number | null; done_at: string }
        Insert: { id?: string; session_id: string; user_id?: string; exercise_id: string; weight_g?: number | null; reps?: number | null; duration_s?: number | null; done_at?: string }
        Update: { id?: string; session_id?: string; user_id?: string; exercise_id?: string; weight_g?: number | null; reps?: number | null; duration_s?: number | null; done_at?: string }
        Relationships: [{ foreignKeyName: "workout_sets_session_id_fkey"; columns: ["session_id"]; isOneToOne: false; referencedRelation: "workout_sessions"; referencedColumns: ["id"] }, { foreignKeyName: "workout_sets_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "exercises"; referencedColumns: ["id"] }, { foreignKeyName: "workout_sets_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }]
      }
      pantry_items: {
        Row: { id: string; workspace_id: string; name: string; qty: number; unit: string | null; min_qty: number; category: string; expires_on: string | null; updated_at: string }
        Insert: { id?: string; workspace_id: string; name: string; qty?: number; unit?: string | null; min_qty?: number; category?: string; expires_on?: string | null; updated_at?: string }
        Update: { id?: string; workspace_id?: string; name?: string; qty?: number; unit?: string | null; min_qty?: number; category?: string; expires_on?: string | null; updated_at?: string }
        Relationships: [{ foreignKeyName: "pantry_items_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      recipes: {
        Row: { id: string; workspace_id: string; created_by: string; title: string; servings: number; prep_min: number | null; ingredients: string; steps: string; created_at: string }
        Insert: { id?: string; workspace_id: string; created_by?: string; title: string; servings?: number; prep_min?: number | null; ingredients?: string; steps?: string; created_at?: string }
        Update: { id?: string; workspace_id?: string; created_by?: string; title?: string; servings?: number; prep_min?: number | null; ingredients?: string; steps?: string; created_at?: string }
        Relationships: [{ foreignKeyName: "recipes_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      meal_plan: {
        Row: { id: string; workspace_id: string; day: string; slot: string; recipe_id: string | null; title: string; created_by: string }
        Insert: { id?: string; workspace_id: string; day: string; slot: string; recipe_id?: string | null; title: string; created_by?: string }
        Update: { id?: string; workspace_id?: string; day?: string; slot?: string; recipe_id?: string | null; title?: string; created_by?: string }
        Relationships: [{ foreignKeyName: "meal_plan_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }, { foreignKeyName: "meal_plan_recipe_id_fkey"; columns: ["recipe_id"]; isOneToOne: false; referencedRelation: "recipes"; referencedColumns: ["id"] }]
      }
      special_dates: {
        Row: { id: string; workspace_id: string; title: string; on_date: string; yearly: boolean; created_by: string; created_at: string }
        Insert: { id?: string; workspace_id: string; title: string; on_date: string; yearly?: boolean; created_by?: string; created_at?: string }
        Update: { id?: string; workspace_id?: string; title?: string; on_date?: string; yearly?: boolean; created_by?: string; created_at?: string }
        Relationships: [{ foreignKeyName: "special_dates_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      places: {
        Row: { id: string; workspace_id: string; name: string; kind: string; status: string; rating: number | null; note: string | null; visited_on: string | null; created_by: string; created_at: string }
        Insert: { id?: string; workspace_id: string; name: string; kind?: string; status?: string; rating?: number | null; note?: string | null; visited_on?: string | null; created_by?: string; created_at?: string }
        Update: { id?: string; workspace_id?: string; name?: string; kind?: string; status?: string; rating?: number | null; note?: string | null; visited_on?: string | null; created_by?: string; created_at?: string }
        Relationships: [{ foreignKeyName: "places_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      memories: {
        Row: { id: string; workspace_id: string; title: string; body: string; happened_on: string; created_by: string; created_at: string }
        Insert: { id?: string; workspace_id: string; title: string; body?: string; happened_on?: string; created_by?: string; created_at?: string }
        Update: { id?: string; workspace_id?: string; title?: string; body?: string; happened_on?: string; created_by?: string; created_at?: string }
        Relationships: [{ foreignKeyName: "memories_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      goals: {
        Row: { id: string; workspace_id: string; title: string; target: number; current: number; unit: string | null; due_on: string | null; done_at: string | null; created_by: string; created_at: string }
        Insert: { id?: string; workspace_id: string; title: string; target: number; current?: number; unit?: string | null; due_on?: string | null; done_at?: string | null; created_by?: string; created_at?: string }
        Update: { id?: string; workspace_id?: string; title?: string; target?: number; current?: number; unit?: string | null; due_on?: string | null; done_at?: string | null; created_by?: string; created_at?: string }
        Relationships: [{ foreignKeyName: "goals_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }]
      }
      fin_recurring: {
        Row: { id: string; workspace_id: string; kind: string; description: string; amount_cents: number; account_id: string; category_id: string | null; day_of_month: number; start_month: string; active: boolean; created_by: string; created_at: string }
        Insert: { id?: string; workspace_id: string; kind: string; description: string; amount_cents: number; account_id: string; category_id?: string | null; day_of_month: number; start_month?: string; active?: boolean; created_by?: string; created_at?: string }
        Update: { id?: string; workspace_id?: string; kind?: string; description?: string; amount_cents?: number; account_id?: string; category_id?: string | null; day_of_month?: number; start_month?: string; active?: boolean; created_by?: string; created_at?: string }
        Relationships: [{ foreignKeyName: "fin_recurring_workspace_id_fkey"; columns: ["workspace_id"]; isOneToOne: false; referencedRelation: "workspaces"; referencedColumns: ["id"] }, { foreignKeyName: "fin_recurring_account_id_fkey"; columns: ["account_id"]; isOneToOne: false; referencedRelation: "fin_accounts"; referencedColumns: ["id"] }, { foreignKeyName: "fin_recurring_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "fin_categories"; referencedColumns: ["id"] }]
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
    Views: {
      fin_account_balances: { Row: { account_id: string; balance_cents: number }; Relationships: [] }
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      album_answer_trade: { Args: { p_trade: string; p_accept: boolean }; Returns: undefined }
      album_gift: { Args: { p_item: string; p_to: string }; Returns: undefined }
      album_open_pack: { Args: { p_pack: string }; Returns: { created_at: string; id: string; owner_id: string; pack_id: string | null; pasted_at: string | null; slot: number | null; sticker_code: string }[]; SetofOptions: { from: "*"; to: "sticker_items"; isOneToOne: false; isSetofReturn: true } }
      album_paste: { Args: { p_item: string }; Returns: undefined }
      album_propose_trade: { Args: { p_give: string; p_want: string }; Returns: string }
      album_refresh: { Args: never; Returns: undefined }
      claim_notification_jobs: {
        Args: { p_limit?: number }
        Returns: Database["public"]["Tables"]["notification_jobs"]["Row"][]
        SetofOptions: { from: "*"; to: "notification_jobs"; isOneToOne: false; isSetofReturn: true }
      }
      create_shared_workspace: { Args: { p_name: string }; Returns: string }
      goal_add: { Args: { p_goal: string; p_delta: number }; Returns: Database["public"]["Tables"]["goals"]["Row"] }
      fin_materialize: { Args: { p_month: string }; Returns: number }
      fin_confirm: { Args: { p_id: string }; Returns: undefined }
      fin_ensure_categories: { Args: { p_workspace: string }; Returns: undefined }
      fin_record: {
        Args: {
          p_id: string; p_kind: string; p_workspace: string; p_account: string; p_amount_cents: number; p_category?: string | null; p_description?: string;
          p_occurred_on?: string; p_status?: string; p_to_account?: string | null; p_installments?: number; p_split_method?: string | null;
          p_split_weights?: Json | null; p_paid_by?: string | null; p_purchase?: string | null
        }
        Returns: string
      }
      fin_settle: { Args: { p_workspace: string; p_to: string; p_amount: number; p_on: string; p_note?: string | null }; Returns: string }
      fin_void: { Args: { p_id: string }; Returns: undefined }
      finish_shopping: {
        Args: { p_list_id: string; p_store: string; p_total_cents: number; p_purchased_on: string; p_paid_by: string | null; p_payment: string; p_carry_over: boolean }
        Returns: string
      }
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
