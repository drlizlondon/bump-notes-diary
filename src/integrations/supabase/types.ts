export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      bumpnotes_state: {
        Row: {
          created_at: string;
          state: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          state?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          state?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      feedback_responses: {
        Row: {
          access_code_id: string | null;
          created_at: string;
          feedback_route: string;
          id: string;
          improvement_text: string | null;
          pregnancy_identity_answer: string;
          professional_identity_answer: string;
          q1_answer: string | null;
          q2_answer: string | null;
          q3_answer: string | null;
          tester_session_id: string | null;
        };
        Insert: {
          access_code_id?: string | null;
          created_at?: string;
          feedback_route: string;
          id?: string;
          improvement_text?: string | null;
          pregnancy_identity_answer: string;
          professional_identity_answer: string;
          q1_answer?: string | null;
          q2_answer?: string | null;
          q3_answer?: string | null;
          tester_session_id?: string | null;
        };
        Update: {
          access_code_id?: string | null;
          created_at?: string;
          feedback_route?: string;
          id?: string;
          improvement_text?: string | null;
          pregnancy_identity_answer?: string;
          professional_identity_answer?: string;
          q1_answer?: string | null;
          q2_answer?: string | null;
          q3_answer?: string | null;
          tester_session_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_responses_access_code_id_fkey";
            columns: ["access_code_id"];
            isOneToOne: false;
            referencedRelation: "tester_access_codes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_responses_tester_session_id_fkey";
            columns: ["tester_session_id"];
            isOneToOne: false;
            referencedRelation: "tester_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback_submissions: {
        Row: {
          app_version: string | null;
          category: string;
          context: Json | null;
          created_at: string;
          id: string;
          is_tester: boolean;
          message: string;
          page_path: string | null;
          reply_email: string | null;
          tester_session_id: string | null;
          user_agent: string | null;
          user_id: string | null;
          viewport: string | null;
        };
        Insert: {
          app_version?: string | null;
          category: string;
          context?: Json | null;
          created_at?: string;
          id?: string;
          is_tester?: boolean;
          message: string;
          page_path?: string | null;
          reply_email?: string | null;
          tester_session_id?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
          viewport?: string | null;
        };
        Update: {
          app_version?: string | null;
          category?: string;
          context?: Json | null;
          created_at?: string;
          id?: string;
          is_tester?: boolean;
          message?: string;
          page_path?: string | null;
          reply_email?: string | null;
          tester_session_id?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
          viewport?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          accepted_privacy_at: string | null;
          accepted_terms_at: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          is_tester: boolean;
          updated_at: string;
        };
        Insert: {
          accepted_privacy_at?: string | null;
          accepted_terms_at?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          is_tester?: boolean;
          updated_at?: string;
        };
        Update: {
          accepted_privacy_at?: string | null;
          accepted_terms_at?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          is_tester?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      tester_access_codes: {
        Row: {
          code: string;
          created_at: string;
          created_by: string | null;
          feedback_submitted_at: string | null;
          first_used_at: string | null;
          id: string;
          label: string | null;
          last_used_at: string | null;
          notes: string | null;
          status: string;
          updated_at: string;
          use_count: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by?: string | null;
          feedback_submitted_at?: string | null;
          first_used_at?: string | null;
          id?: string;
          label?: string | null;
          last_used_at?: string | null;
          notes?: string | null;
          status?: string;
          updated_at?: string;
          use_count?: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string | null;
          feedback_submitted_at?: string | null;
          first_used_at?: string | null;
          id?: string;
          label?: string | null;
          last_used_at?: string | null;
          notes?: string | null;
          status?: string;
          updated_at?: string;
          use_count?: number;
        };
        Relationships: [];
      };
      tester_sessions: {
        Row: {
          access_code_id: string;
          browser: string | null;
          created_at: string;
          device_type: string | null;
          feedback_completed_at: string | null;
          feedback_started_at: string | null;
          id: string;
          last_seen_at: string;
          pages_viewed_count: number;
          started_at: string;
        };
        Insert: {
          access_code_id: string;
          browser?: string | null;
          created_at?: string;
          device_type?: string | null;
          feedback_completed_at?: string | null;
          feedback_started_at?: string | null;
          id?: string;
          last_seen_at?: string;
          pages_viewed_count?: number;
          started_at?: string;
        };
        Update: {
          access_code_id?: string;
          browser?: string | null;
          created_at?: string;
          device_type?: string | null;
          feedback_completed_at?: string | null;
          feedback_started_at?: string | null;
          id?: string;
          last_seen_at?: string;
          pages_viewed_count?: number;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tester_sessions_access_code_id_fkey";
            columns: ["access_code_id"];
            isOneToOne: false;
            referencedRelation: "tester_access_codes";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const;
