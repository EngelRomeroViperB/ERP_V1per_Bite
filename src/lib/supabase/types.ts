export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          timezone: string;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          timezone?: string;
          preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      areas: {
        Row: {
          id: string;
          user_id: string;
          parent_id: string | null;
          name: string;
          icon: string | null;
          color: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          parent_id?: string | null;
          name: string;
          icon?: string | null;
          color?: string | null;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          parent_id?: string | null;
          name?: string;
          icon?: string | null;
          color?: string | null;
          order_index?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          area_id: string | null;
          title: string;
          description: string | null;
          status: string;
          start_date: string | null;
          end_date: string | null;
          completion_pct: number;
          template_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          area_id?: string | null;
          title: string;
          description?: string | null;
          status?: string;
          start_date?: string | null;
          end_date?: string | null;
          completion_pct?: number;
          template_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          area_id?: string | null;
          title?: string;
          description?: string | null;
          status?: string;
          start_date?: string | null;
          end_date?: string | null;
          completion_pct?: number;
          template_config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          project_id: string | null;
          area_id: string | null;
          title: string;
          description: string | null;
          priority: "P1" | "P2" | "P3";
          status: "todo" | "in_progress" | "done" | "cancelled";
          due_date: string | null;
          completed_at: string | null;
          estimated_minutes: number | null;
          actual_minutes: number | null;
          tags: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id?: string | null;
          area_id?: string | null;
          title: string;
          description?: string | null;
          priority?: "P1" | "P2" | "P3";
          status?: "todo" | "in_progress" | "done" | "cancelled";
          due_date?: string | null;
          completed_at?: string | null;
          estimated_minutes?: number | null;
          actual_minutes?: number | null;
          tags?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string | null;
          area_id?: string | null;
          title?: string;
          description?: string | null;
          priority?: "P1" | "P2" | "P3";
          status?: "todo" | "in_progress" | "done" | "cancelled";
          due_date?: string | null;
          completed_at?: string | null;
          estimated_minutes?: number | null;
          actual_minutes?: number | null;
          tags?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      habits: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string | null;
          frequency: string;
          target_streak: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string | null;
          frequency?: string;
          target_streak?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string | null;
          frequency?: string;
          target_streak?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          habit_id: string;
          user_id: string;
          log_date: string;
          completed: boolean;
          notes: string | null;
        };
        Insert: {
          id?: string;
          habit_id: string;
          user_id: string;
          log_date: string;
          completed?: boolean;
          notes?: string | null;
        };
        Update: {
          id?: string;
          habit_id?: string;
          user_id?: string;
          log_date?: string;
          completed?: boolean;
          notes?: string | null;
        };
        Relationships: [];
      };
      daily_metrics: {
        Row: {
          id: string;
          user_id: string;
          metric_date: string;
          mood_score: number | null;
          weight_kg: number | null;
          calories_kcal: number | null;
          sleep_hours: number | null;
          sleep_quality: number | null;
          energy_level: number | null;
          stress_level: number | null;
          journal_entry: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          metric_date: string;
          mood_score?: number | null;
          weight_kg?: number | null;
          calories_kcal?: number | null;
          sleep_hours?: number | null;
          sleep_quality?: number | null;
          energy_level?: number | null;
          stress_level?: number | null;
          journal_entry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          metric_date?: string;
          mood_score?: number | null;
          weight_kg?: number | null;
          calories_kcal?: number | null;
          sleep_hours?: number | null;
          sleep_quality?: number | null;
          energy_level?: number | null;
          stress_level?: number | null;
          journal_entry?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      brain_notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          type: "snippet" | "note" | "resource";
          language: string | null;
          tags: Json;
          area_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content: string;
          type?: "snippet" | "note" | "resource";
          language?: string | null;
          tags?: Json;
          area_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          type?: "snippet" | "note" | "resource";
          language?: string | null;
          tags?: Json;
          area_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      finances: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          title: string;
          amount: number;
          type: "income" | "expense";
          source: string | null;
          transaction_date: string;
          is_shopify: boolean;
          shopify_meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          title: string;
          amount: number;
          type: "income" | "expense";
          source?: string | null;
          transaction_date?: string;
          is_shopify?: boolean;
          shopify_meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          title?: string;
          amount?: number;
          type?: "income" | "expense";
          source?: string | null;
          transaction_date?: string;
          is_shopify?: boolean;
          shopify_meta?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      finance_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "income" | "expense" | "both";
          icon: string | null;
          color: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: "income" | "expense" | "both";
          icon?: string | null;
          color?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: "income" | "expense" | "both";
          icon?: string | null;
          color?: string | null;
        };
        Relationships: [];
      };
      crm_contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          relationship_type: string | null;
          trust_score: number;
          last_contact: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          relationship_type?: string | null;
          trust_score?: number;
          last_contact?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          relationship_type?: string | null;
          trust_score?: number;
          last_contact?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      crm_interactions: {
        Row: {
          id: string;
          contact_id: string;
          user_id: string;
          type: string;
          notes: string | null;
          interaction_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          user_id: string;
          type: string;
          notes?: string | null;
          interaction_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact_id?: string;
          user_id?: string;
          type?: string;
          notes?: string | null;
          interaction_date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      skill_nodes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string | null;
          status: "pending" | "learning" | "mastered";
          mastery_level: number;
          description: string | null;
          x_pos: number;
          y_pos: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category?: string | null;
          status?: "pending" | "learning" | "mastered";
          mastery_level?: number;
          description?: string | null;
          x_pos?: number;
          y_pos?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          category?: string | null;
          status?: "pending" | "learning" | "mastered";
          mastery_level?: number;
          description?: string | null;
          x_pos?: number;
          y_pos?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      skill_edges: {
        Row: {
          id: string;
          user_id: string;
          source_id: string;
          target_id: string;
          relationship: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_id: string;
          target_id: string;
          relationship?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_id?: string;
          target_id?: string;
          relationship?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: string;
          is_read: boolean;
          action_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          type: string;
          is_read?: boolean;
          action_data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string;
          type?: string;
          is_read?: boolean;
          action_data?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_insights: {
        Row: {
          id: string;
          user_id: string;
          insight_type: string;
          content: string;
          data_snapshot: Json;
          confidence_score: number;
          insight_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          insight_type: string;
          content: string;
          data_snapshot?: Json;
          confidence_score?: number;
          insight_date?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          insight_type?: string;
          content?: string;
          data_snapshot?: Json;
          confidence_score?: number;
          insight_date?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      webhook_logs: {
        Row: {
          id: string;
          user_id: string;
          source: string;
          payload: Json;
          status: string;
          received_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: string;
          payload: Json;
          status?: string;
          received_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source?: string;
          payload?: Json;
          status?: string;
          received_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

