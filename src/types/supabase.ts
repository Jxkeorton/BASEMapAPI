export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  public: {
    Tables: {
      location_images: {
        Row: {
          caption: string | null;
          created_at: string | null;
          display_order: number | null;
          id: string;
          image_url: string;
          location_id: number;
        };
        Insert: {
          caption?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          image_url: string;
          location_id: number;
        };
        Update: {
          caption?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          image_url?: string;
          location_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "location_images_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      location_audit_log: {
        Row: {
          id: string;
          location_id: number;
          action: string;
          performed_by: string;
          performed_at: string;
          location_snapshot: Json;
          undone: boolean;
          undone_by: string | null;
          undone_at: string | null;
          source: string | null;
          submission_id: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          location_id: number;
          action: string;
          performed_by: string;
          performed_at?: string;
          location_snapshot: Json;
          undone?: boolean;
          undone_by?: string | null;
          undone_at?: string | null;
          source?: string | null;
          submission_id?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          location_id?: number;
          action?: string;
          performed_by?: string;
          performed_at?: string;
          location_snapshot?: Json;
          undone?: boolean;
          undone_by?: string | null;
          undone_at?: string | null;
          source?: string | null;
          submission_id?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "location_audit_log_performed_by_fkey";
            columns: ["performed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "location_audit_log_undone_by_fkey";
            columns: ["undone_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "location_audit_log_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "location_submission_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      location_submission_images: {
        Row: {
          created_at: string | null;
          id: string;
          image_url: string;
          submission_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          image_url: string;
          submission_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          image_url?: string;
          submission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "location_submission_images_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "location_submission_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      location_submission_requests: {
        Row: {
          access_info: string | null;
          admin_notes: string | null;
          anchor_info: string | null;
          cliff_aspect: string | null;
          country: string | null;
          created_at: string | null;
          existing_location_id: number | null;
          id: string;
          latitude: number;
          longitude: number;
          name: string;
          notes: string | null;
          opened_by_name: string | null;
          opened_date: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          rock_drop_ft: number | null;
          status: string;
          submission_type: string;
          total_height_ft: number | null;
          updated_at: string | null;
          user_id: string;
          video_link: string | null;
        };
        Insert: {
          access_info?: string | null;
          admin_notes?: string | null;
          anchor_info?: string | null;
          cliff_aspect?: string | null;
          country?: string | null;
          created_at?: string | null;
          existing_location_id?: number | null;
          id?: string;
          latitude: number;
          longitude: number;
          name: string;
          notes?: string | null;
          opened_by_name?: string | null;
          opened_date?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          rock_drop_ft?: number | null;
          status?: string;
          submission_type?: string;
          total_height_ft?: number | null;
          updated_at?: string | null;
          user_id: string;
          video_link?: string | null;
        };
        Update: {
          access_info?: string | null;
          admin_notes?: string | null;
          anchor_info?: string | null;
          cliff_aspect?: string | null;
          country?: string | null;
          created_at?: string | null;
          existing_location_id?: number | null;
          id?: string;
          latitude?: number;
          longitude?: number;
          name?: string;
          notes?: string | null;
          opened_by_name?: string | null;
          opened_date?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          rock_drop_ft?: number | null;
          status?: string;
          submission_type?: string;
          total_height_ft?: number | null;
          updated_at?: string | null;
          user_id?: string;
          video_link?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "location_submission_requests_existing_location_id_fkey";
            columns: ["existing_location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "location_submission_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "location_submission_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          access_info: string | null;
          anchor_info: string | null;
          cliff_aspect: string | null;
          country: string | null;
          created_at: string | null;
          created_by: string | null;
          id: number;
          is_hidden: boolean;
          latitude: number;
          longitude: number;
          name: string;
          notes: string | null;
          opened_by_name: string | null;
          opened_date: string | null;
          rock_drop_ft: number | null;
          total_height_ft: number | null;
          updated_at: string | null;
          updated_by: string | null;
          video_link: string | null;
        };
        Insert: {
          access_info?: string | null;
          anchor_info?: string | null;
          cliff_aspect?: string | null;
          country?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: number;
          is_hidden?: boolean;
          latitude: number;
          longitude: number;
          name: string;
          notes?: string | null;
          opened_by_name?: string | null;
          opened_date?: string | null;
          rock_drop_ft?: number | null;
          total_height_ft?: number | null;
          updated_at?: string | null;
          updated_by?: string | null;
          video_link?: string | null;
        };
        Update: {
          access_info?: string | null;
          anchor_info?: string | null;
          cliff_aspect?: string | null;
          country?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: number;
          is_hidden?: boolean;
          latitude?: number;
          longitude?: number;
          name?: string;
          notes?: string | null;
          opened_by_name?: string | null;
          opened_date?: string | null;
          rock_drop_ft?: number | null;
          total_height_ft?: number | null;
          updated_at?: string | null;
          updated_by?: string | null;
          video_link?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "locations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "locations_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      logbook_entries: {
        Row: {
          created_at: string | null;
          delay_seconds: number | null;
          details: string | null;
          exit_type: string | null;
          id: string;
          jump_date: string | null;
          location_name: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          delay_seconds?: number | null;
          details?: string | null;
          exit_type?: string | null;
          id?: string;
          jump_date?: string | null;
          location_name: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          delay_seconds?: number | null;
          details?: string | null;
          exit_type?: string | null;
          id?: string;
          jump_date?: string | null;
          location_name?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "logbook_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      logbook_images: {
        Row: {
          caption: string | null;
          created_at: string | null;
          display_order: number | null;
          id: string;
          image_url: string;
          logbook_entry_id: string;
        };
        Insert: {
          caption?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          image_url: string;
          logbook_entry_id: string;
        };
        Update: {
          caption?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          image_url?: string;
          logbook_entry_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "logbook_images_logbook_entry_id_fkey";
            columns: ["logbook_entry_id"];
            isOneToOne: false;
            referencedRelation: "logbook_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_images: {
        Row: {
          created_at: string | null;
          id: string;
          image_url: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          image_url: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          image_url?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string | null;
          distance_unit: string;
          email: string | null;
          id: string;
          jump_number: number | null;
          name: string | null;
          role: string | null;
          subscription_expires_at: string | null;
          subscription_status: string | null;
          subscription_updated_at: string | null;
          updated_at: string | null;
          username: string | null;
        };
        Insert: {
          created_at?: string | null;
          distance_unit?: string;
          email?: string | null;
          id: string;
          jump_number?: number | null;
          name?: string | null;
          role?: string | null;
          subscription_expires_at?: string | null;
          subscription_status?: string | null;
          subscription_updated_at?: string | null;
          updated_at?: string | null;
          username?: string | null;
        };
        Update: {
          created_at?: string | null;
          distance_unit?: string;
          email?: string | null;
          id?: string;
          jump_number?: number | null;
          name?: string | null;
          role?: string | null;
          subscription_expires_at?: string | null;
          subscription_status?: string | null;
          subscription_updated_at?: string | null;
          updated_at?: string | null;
          username?: string | null;
        };
        Relationships: [];
      };
      user_saved_locations: {
        Row: {
          created_at: string | null;
          id: string;
          location_id: number;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          location_id: number;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          location_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_saved_locations_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_saved_locations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_manage_locations: { Args: { user_id?: string }; Returns: boolean };
      get_current_user_role: { Args: never; Returns: string };
      get_user_role: { Args: { user_id?: string }; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    Enums: {},
  },
} as const;
