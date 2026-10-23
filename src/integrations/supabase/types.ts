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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      casetta_events: {
        Row: {
          confirmed: boolean
          created_at: string
          created_by: string | null
          description: string
          ends_at: string | null
          id: string
          starts_at: string
          title: string
          visible: boolean
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          starts_at: string
          title: string
          visible?: boolean
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          created_by?: string | null
          description?: string
          ends_at?: string | null
          id?: string
          starts_at?: string
          title?: string
          visible?: boolean
        }
        Relationships: []
      }
      cash_requests: {
        Row: {
          amount_cents: number
          client_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          dedica: string | null
          expires_at: string
          firma: string | null
          id: string
          kind: string
          method: string | null
          ornament_id: string | null
          publish_consent: boolean
          status: string
          token_hash: string
        }
        Insert: {
          amount_cents: number
          client_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          dedica?: string | null
          expires_at: string
          firma?: string | null
          id?: string
          kind: string
          method?: string | null
          ornament_id?: string | null
          publish_consent?: boolean
          status?: string
          token_hash: string
        }
        Update: {
          amount_cents?: number
          client_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          dedica?: string | null
          expires_at?: string
          firma?: string | null
          id?: string
          kind?: string
          method?: string | null
          ornament_id?: string | null
          publish_consent?: boolean
          status?: string
          token_hash?: string
        }
        Relationships: []
      }
      demo_ornaments: {
        Row: {
          added_by: string | null
          amount_cents: number | null
          client_id: string
          created_at: string
          dedica: string | null
          firma: string | null
          id: string
          kind: string
          payment_method: string | null
          publish_consent: boolean
          status: string
          x: number
          y: number
        }
        Insert: {
          added_by?: string | null
          amount_cents?: number | null
          client_id: string
          created_at?: string
          dedica?: string | null
          firma?: string | null
          id?: string
          kind: string
          payment_method?: string | null
          publish_consent?: boolean
          status?: string
          x: number
          y: number
        }
        Update: {
          added_by?: string | null
          amount_cents?: number | null
          client_id?: string
          created_at?: string
          dedica?: string | null
          firma?: string | null
          id?: string
          kind?: string
          payment_method?: string | null
          publish_consent?: boolean
          status?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cash_code_hash: { Args: { _code: string }; Returns: string }
      cash_request_lookup: {
        Args: { _code: string }
        Returns: {
          amount_cents: number
          confirmed_at: string
          dedica: string
          expires_at: string
          firma: string
          kind: string
          method: string
          publish_consent: boolean
          status: string
        }[]
      }
      cash_request_result: {
        Args: { _code: string }
        Returns: {
          amount_cents: number
          kind: string
          ornament_id: string
          status: string
        }[]
      }
      cash_request_status: { Args: { _code: string }; Returns: string }
      confirm_cash_request: {
        Args: { _code: string; _method: string }
        Returns: {
          ornament_id: string
          ornament_status: string
          result: string
        }[]
      }
      create_cash_request: {
        Args: {
          _amount_cents: number
          _client: string
          _consent: boolean
          _dedica: string
          _firma: string
          _kind: string
        }
        Returns: {
          amount_cents: number
          code: string
          expires_at: string
        }[]
      }
      hang_ornament: {
        Args: {
          _amount_cents: number
          _client: string
          _consent: boolean
          _dedica: string
          _firma: string
          _kind: string
        }
        Returns: {
          id: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_moderator: { Args: never; Returns: boolean }
      is_volunteer: { Args: never; Returns: boolean }
      my_ornaments: {
        Args: { _client: string }
        Returns: {
          dedica: string
          id: string
          kind: string
          publish_consent: boolean
          status: string
        }[]
      }
      ornament_text_status: { Args: { d: string; f: string }; Returns: string }
      public_tree: {
        Args: never
        Returns: {
          created_at: string
          dedica: string
          firma: string
          id: string
          kind: string
          x: number
          y: number
        }[]
      }
      volunteer_add_ornament: {
        Args: {
          _amount_cents: number
          _consent: boolean
          _dedica: string
          _firma: string
          _kind: string
          _method: string
        }
        Returns: {
          id: string
          status: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "volunteer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "volunteer"],
    },
  },
} as const
