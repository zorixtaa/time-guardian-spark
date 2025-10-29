export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_read: boolean
          message: string | null
          overage_minutes: number
          read_at: string | null
          read_by: string | null
          threshold_minutes: number
          type: string
          user_id: string
          value_minutes: number
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          overage_minutes?: number
          read_at?: string | null
          read_by?: string | null
          threshold_minutes: number
          type: string
          user_id: string
          value_minutes: number
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          message?: string | null
          overage_minutes?: number
          read_at?: string | null
          read_by?: string | null
          threshold_minutes?: number
          type?: string
          user_id?: string
          value_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_read_by_fkey"
            columns: ["read_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          id?: string
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          clock_in_at: string
          clock_out_at: string | null
          created_at: string
          device_fingerprint: string | null
          id: string
          notes: string | null
          shift_id: string | null
          source_ip: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clock_in_at?: string
          clock_out_at?: string | null
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          notes?: string | null
          shift_id?: string | null
          source_ip?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clock_in_at?: string
          clock_out_at?: string | null
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          notes?: string | null
          shift_id?: string | null
          source_ip?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          points: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          points?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          points?: number
        }
        Relationships: []
      }
      bonus_payouts: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          month: string
          reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          month: string
          reason: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          month?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      breaks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attendance_id: string | null
          created_at: string
          denial_reason: string | null
          denied_at: string | null
          denied_by: string | null
          emergency_reason: string | null
          ended_at: string | null
          id: string
          reason: string | null
          shift_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["break_status"]
          team_id: string | null
          type: Database["public"]["Enums"]["break_type_enum"]
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_id?: string | null
          created_at?: string
          denial_reason?: string | null
          denied_at?: string | null
          denied_by?: string | null
          emergency_reason?: string | null
          ended_at?: string | null
          id?: string
          reason?: string | null
          shift_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["break_status"]
          team_id?: string | null
          type?: Database["public"]["Enums"]["break_type_enum"]
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attendance_id?: string | null
          created_at?: string
          denial_reason?: string | null
          denied_at?: string | null
          denied_by?: string | null
          emergency_reason?: string | null
          ended_at?: string | null
          id?: string
          reason?: string | null
          shift_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["break_status"]
          team_id?: string | null
          type?: Database["public"]["Enums"]["break_type_enum"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breaks_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breaks_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breaks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      company_policies: {
        Row: {
          created_at: string | null
          effective_from: string
          emergency_break_cooldown_minutes: number
          emergency_break_daily_limit_minutes: number
          id: string
          lunch_break_daily_limit_minutes: number
          microbreak_daily_limit_minutes: number
          min_minutes_before_break: number
        }
        Insert: {
          created_at?: string | null
          effective_from?: string
          emergency_break_cooldown_minutes?: number
          emergency_break_daily_limit_minutes?: number
          id?: string
          lunch_break_daily_limit_minutes?: number
          microbreak_daily_limit_minutes?: number
          min_minutes_before_break?: number
        }
        Update: {
          created_at?: string | null
          effective_from?: string
          emergency_break_cooldown_minutes?: number
          emergency_break_daily_limit_minutes?: number
          id?: string
          lunch_break_daily_limit_minutes?: number
          microbreak_daily_limit_minutes?: number
          min_minutes_before_break?: number
        }
        Relationships: []
      }
      files: {
        Row: {
          created_at: string
          id: string
          kind: string
          path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          path?: string
          user_id?: string
        }
        Relationships: []
      }
      gamification_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      metrics_daily: {
        Row: {
          avg_handle_time: number | null
          break_compliance_pct: number | null
          created_at: string
          date: string
          id: string
          occupancy_pct: number | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          avg_handle_time?: number | null
          break_compliance_pct?: number | null
          created_at?: string
          date: string
          id?: string
          occupancy_pct?: number | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          avg_handle_time?: number | null
          break_compliance_pct?: number | null
          created_at?: string
          date?: string
          id?: string
          occupancy_pct?: number | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metrics_daily_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string
          id: string
          name: string
          required_occupancy: number
          starts_at: string
          team_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at: string
          id?: string
          name: string
          required_occupancy?: number
          starts_at: string
          team_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string
          id?: string
          name?: string
          required_occupancy?: number
          starts_at?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      xp_ledger: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acknowledge_entitlement_notification: {
        Args: { p_admin_id: string; p_notification_id: string }
        Returns: boolean
      }
      approve_break: {
        Args: { p_admin_id: string; p_break_id: string }
        Returns: Json
      }
      can_request_break: {
        Args: {
          p_attendance_id: string
          p_break_type: Database["public"]["Enums"]["break_type_enum"]
          p_date?: string
          p_user_id: string
        }
        Returns: Json
      }
      create_admin_notification: {
        Args: {
          _category: string
          _message?: string
          _overage_minutes?: number
          _threshold_minutes: number
          _type: string
          _user_id: string
          _value_minutes: number
        }
        Returns: string
      }
      deny_break: {
        Args: { p_admin_id: string; p_break_id: string; p_reason?: string }
        Returns: Json
      }
      get_break_statistics: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_team_id?: string
          p_user_id?: string
        }
        Returns: {
          avg_daily_hours: number
          coffee_break_count: number
          effective_work_hours: number
          lunch_break_count: number
          total_break_hours: number
          total_days_worked: number
          total_hours_clocked: number
          wc_break_count: number
        }[]
      }
      get_current_policy: {
        Args: never
        Returns: {
          emergency_break_cooldown_minutes: number
          emergency_break_daily_limit_minutes: number
          lunch_break_daily_limit_minutes: number
          microbreak_daily_limit_minutes: number
          min_minutes_before_break: number
        }[]
      }
      get_daily_break_entitlements: {
        Args: { p_date?: string; p_user_id: string }
        Returns: {
          lunch_break_limit: number
          lunch_break_remaining: number
          lunch_break_used: number
          micro_break_limit: number
          micro_break_remaining: number
          micro_break_used: number
        }[]
      }
      get_department_productivity: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          attendance_rate: number
          avg_effective_hours: number
          avg_hours_per_member: number
          team_id: string
          team_name: string
          total_breaks: number
          total_members: number
        }[]
      }
      get_emergency_break_minutes: {
        Args: { _date?: string; _user_id: string }
        Returns: number
      }
      get_entitlement_notifications: {
        Args: { p_admin_team_id?: string }
        Returns: {
          created_at: string
          entitlement_date: string
          exceeded_amount: number
          notification_id: string
          notification_type: string
          team_name: string
          user_id: string
          user_name: string
        }[]
      }
      get_lunch_break_minutes: {
        Args: { _date?: string; _user_id: string }
        Returns: number
      }
      get_micro_break_minutes: {
        Args: { _date?: string; _user_id: string }
        Returns: number
      }
      get_minutes_since_last_work: {
        Args: { _user_id: string }
        Returns: number
      }
      get_pending_break_requests: {
        Args: { p_admin_team_id?: string }
        Returns: {
          break_id: string
          break_type: Database["public"]["Enums"]["break_type_enum"]
          created_at: string
          team_id: string
          user_id: string
          user_name: string
        }[]
      }
      get_recent_activity: {
        Args: { p_limit?: number; p_team_id?: string }
        Returns: {
          activity_description: string
          activity_id: string
          activity_type: string
          metadata: Json
          occurred_at: string
          user_id: string
          user_name: string
        }[]
      }
      get_streak_leaderboard: {
        Args: { p_limit?: number; p_team_id?: string }
        Returns: {
          current_streak: number
          display_name: string
          rank: number
          team_name: string
          user_id: string
        }[]
      }
      get_team_daily_stats: {
        Args: { p_date?: string; p_team_id?: string }
        Returns: {
          avg_hours_per_person: number
          currently_active: number
          on_coffee_break: number
          on_lunch_break: number
          on_wc_break: number
          total_hours_worked: number
          total_members_checked_in: number
        }[]
      }
      get_user_daily_breakdown: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          break_hours: number
          clock_in_time: string
          clock_out_time: string
          coffee_breaks: number
          effective_hours: number
          lunch_breaks: number
          total_hours: number
          wc_breaks: number
          work_date: string
        }[]
      }
      get_user_team: { Args: { _user_id: string }; Returns: string }
      get_user_work_summary: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: {
          avg_daily_hours: number
          coffee_break_count: number
          effective_work_hours: number
          lunch_break_count: number
          total_break_hours: number
          total_days_worked: number
          total_hours_clocked: number
          wc_break_count: number
        }[]
      }
      get_xp_leaderboard: {
        Args: { p_limit?: number; p_team_id?: string }
        Returns: {
          display_name: string
          level: number
          rank: number
          team_name: string
          total_xp: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_emergency_break_available: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_user_on_shift: { Args: { _user_id: string }; Returns: boolean }
      request_break: {
        Args: {
          p_attendance_id: string
          p_break_type: Database["public"]["Enums"]["break_type_enum"]
          p_team_id?: string
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "employee"
      break_status: "pending" | "approved" | "denied" | "active" | "completed"
      break_type: "coffee" | "wc" | "lunch" | "emergency"
      break_type_enum: "coffee" | "wc" | "lunch" | "emergency"
      session_status: "active" | "ended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "employee"],
      break_status: ["pending", "approved", "denied", "active", "completed"],
      break_type: ["coffee", "wc", "lunch", "emergency"],
      break_type_enum: ["coffee", "wc", "lunch", "emergency"],
      session_status: ["active", "ended"],
    },
  },
} as const
