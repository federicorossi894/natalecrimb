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
      kindness_doors: {
        Row: {
          day: number
          message: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          day: number
          message: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          day?: number
          message?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      live_donations: {
        Row: {
          access_hash: string
          amount_cents: number
          capture_claimed_at: string | null
          checkout_url: string | null
          created_at: string
          currency: string
          dedica: string | null
          donor_email_attempts: number
          donor_email_audit: Json
          donor_email_claim: string | null
          donor_email_private: string | null
          donor_email_requested: boolean
          donor_email_state: string
          firma: string | null
          gift_email_attempts: number
          gift_email_audit: Json
          gift_email_claim: string | null
          gift_email_data: Json | null
          gift_email_due_at: string | null
          gift_email_private: string | null
          gift_email_state: string
          id: string
          kind: string
          paid_at: string | null
          provider: string
          provider_id: string | null
          provider_payment_id: string | null
          publish_consent: boolean
          recovery_after: string
          recovery_attempts: number
          recovery_lease_until: string | null
          recovery_note: string | null
          settlement_state: string
          status: string
        }
        Insert: {
          access_hash: string
          amount_cents: number
          capture_claimed_at?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string
          dedica?: string | null
          donor_email_attempts?: number
          donor_email_audit?: Json
          donor_email_claim?: string | null
          donor_email_private?: string | null
          donor_email_requested?: boolean
          donor_email_state?: string
          firma?: string | null
          gift_email_attempts?: number
          gift_email_audit?: Json
          gift_email_claim?: string | null
          gift_email_data?: Json | null
          gift_email_due_at?: string | null
          gift_email_private?: string | null
          gift_email_state?: string
          id?: string
          kind: string
          paid_at?: string | null
          provider: string
          provider_id?: string | null
          provider_payment_id?: string | null
          publish_consent?: boolean
          recovery_after?: string
          recovery_attempts?: number
          recovery_lease_until?: string | null
          recovery_note?: string | null
          settlement_state?: string
          status?: string
        }
        Update: {
          access_hash?: string
          amount_cents?: number
          capture_claimed_at?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string
          dedica?: string | null
          donor_email_attempts?: number
          donor_email_audit?: Json
          donor_email_claim?: string | null
          donor_email_private?: string | null
          donor_email_requested?: boolean
          donor_email_state?: string
          firma?: string | null
          gift_email_attempts?: number
          gift_email_audit?: Json
          gift_email_claim?: string | null
          gift_email_data?: Json | null
          gift_email_due_at?: string | null
          gift_email_private?: string | null
          gift_email_state?: string
          id?: string
          kind?: string
          paid_at?: string | null
          provider?: string
          provider_id?: string | null
          provider_payment_id?: string | null
          publish_consent?: boolean
          recovery_after?: string
          recovery_attempts?: number
          recovery_lease_until?: string | null
          recovery_note?: string | null
          settlement_state?: string
          status?: string
        }
        Relationships: []
      }
      live_ornaments: {
        Row: {
          created_at: string
          dedica: string | null
          donation_id: string
          firma: string | null
          id: string
          kind: string
          publish_consent: boolean
          status: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          dedica?: string | null
          donation_id: string
          firma?: string | null
          id?: string
          kind: string
          publish_consent?: boolean
          status?: string
          x?: number
          y?: number
        }
        Update: {
          created_at?: string
          dedica?: string | null
          donation_id?: string
          firma?: string | null
          id?: string
          kind?: string
          publish_consent?: boolean
          status?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_ornaments_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: true
            referencedRelation: "live_donations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_qa_attempts: {
        Row: {
          actor_id: string
          created_at: string
          finished_at: string | null
          id: string
          kind: string
          provider_message_id: string | null
          provider_status: number | null
          request_id: string
          state: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          kind: string
          provider_message_id?: string | null
          provider_status?: number | null
          request_id: string
          state?: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          kind?: string
          provider_message_id?: string | null
          provider_status?: number | null
          request_id?: string
          state?: string
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
      volunteer_audit: {
        Row: {
          action: string
          created_at: string
          display_name: string
          id: number
          ornament_id: string | null
          result: string | null
          session_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          display_name: string
          id?: number
          ornament_id?: string | null
          result?: string | null
          session_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          display_name?: string
          id?: number
          ornament_id?: string | null
          result?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      volunteer_login_attempts: {
        Row: {
          client_key: string
          created_at: string
          id: number
          ok: boolean
        }
        Insert: {
          client_key: string
          created_at?: string
          id?: number
          ok: boolean
        }
        Update: {
          client_key?: string
          created_at?: string
          id?: number
          ok?: boolean
        }
        Relationships: []
      }
      volunteer_password_cache: {
        Row: {
          created_at: string
          source: string
          verifier: string
        }
        Insert: {
          created_at?: string
          source: string
          verifier: string
        }
        Update: {
          created_at?: string
          source?: string
          verifier?: string
        }
        Relationships: []
      }
      volunteer_sessions: {
        Row: {
          created_at: string
          display_name: string
          expires_at: string
          id: string
          last_seen_at: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          display_name: string
          expires_at: string
          id?: string
          last_seen_at?: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          display_name?: string
          expires_at?: string
          id?: string
          last_seen_at?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: []
      }
      wish_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
          wish_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
          wish_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          wish_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wish_tokens_wish_id_fkey"
            columns: ["wish_id"]
            isOneToOne: false
            referencedRelation: "wishes"
            referencedColumns: ["id"]
          },
        ]
      }
      wishes: {
        Row: {
          auto_flags: string[]
          body: string
          created_at: string
          id: string
          moderated_at: string | null
          moderated_by: string | null
          nickname: string | null
          publish_consent: boolean
          status: string
        }
        Insert: {
          auto_flags?: string[]
          body: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          nickname?: string | null
          publish_consent: boolean
          status?: string
        }
        Update: {
          auto_flags?: string[]
          body?: string
          created_at?: string
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          nickname?: string | null
          publish_consent?: boolean
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      campaign_demo_dispatch: {
        Args: { _actor?: string; _args: Json; _name: string }
        Returns: Json
      }
      campaign_volunteer_dispatch: {
        Args: { _args: Json; _name: string; _token_hash: string }
        Returns: Json
      }
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
      claim_donation_email: {
        Args: { _id: string; _kind: string; _retry?: boolean }
        Returns: string
      }
      claim_live_capture: {
        Args: { _id: string; _provider_id: string }
        Returns: boolean
      }
      claim_live_recovery: {
        Args: never
        Returns: {
          access_hash: string
          amount_cents: number
          capture_claimed_at: string | null
          checkout_url: string | null
          created_at: string
          currency: string
          dedica: string | null
          donor_email_attempts: number
          donor_email_audit: Json
          donor_email_claim: string | null
          donor_email_private: string | null
          donor_email_requested: boolean
          donor_email_state: string
          firma: string | null
          gift_email_attempts: number
          gift_email_audit: Json
          gift_email_claim: string | null
          gift_email_data: Json | null
          gift_email_due_at: string | null
          gift_email_private: string | null
          gift_email_state: string
          id: string
          kind: string
          paid_at: string | null
          provider: string
          provider_id: string | null
          provider_payment_id: string | null
          publish_consent: boolean
          recovery_after: string
          recovery_attempts: number
          recovery_lease_until: string | null
          recovery_note: string | null
          settlement_state: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "live_donations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_staff_gmail_qa: {
        Args: { p_actor: string; p_kind: string; p_request: string }
        Returns: string
      }
      confirm_cash_request: {
        Args: { _code: string; _method: string }
        Returns: {
          ornament_id: string
          ornament_status: string
          result: string
        }[]
      }
      confirm_live_donation: {
        Args: {
          _amount_cents: number
          _currency: string
          _id: string
          _payment_id: string
          _provider: string
          _provider_id: string
        }
        Returns: string
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
      create_wish_token: {
        Args: never
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      finish_donation_email: {
        Args: { _claim: string; _id: string; _kind: string; _state: string }
        Returns: boolean
      }
      finish_staff_gmail_qa: {
        Args: {
          p_id: string
          p_message?: string
          p_state: string
          p_status?: number
        }
        Returns: undefined
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
      kindness_calendar: {
        Args: never
        Returns: {
          day: number
          message: string
          server_now: string
          title: string
        }[]
      }
      kindness_unlocked_day: { Args: { _at: string }; Returns: number }
      live_public_tree: {
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
      moderate_wish: { Args: { _id: string; _status: string }; Returns: string }
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
      public_wishes: {
        Args: never
        Returns: {
          approved_at: string
          body: string
          id: string
          nickname: string
        }[]
      }
      submit_wish: {
        Args: {
          _body: string
          _code: string
          _consent: boolean
          _nickname: string
        }
        Returns: {
          result: string
          wish_status: string
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
      volunteer_login_allowed: {
        Args: { _client_key: string }
        Returns: boolean
      }
      volunteer_login_record: {
        Args: { _client_key: string; _ok: boolean }
        Returns: undefined
      }
      volunteer_session_close: {
        Args: { _token_hash: string }
        Returns: undefined
      }
      volunteer_session_get: {
        Args: { _token_hash: string }
        Returns: {
          display_name: string
          expires_at: string
          session_id: string
        }[]
      }
      volunteer_session_open: {
        Args: { _display_name: string; _hours: number; _token_hash: string }
        Returns: {
          display_name: string
          expires_at: string
          session_id: string
        }[]
      }
      wish_flags: { Args: { _body: string; _nick: string }; Returns: string[] }
      wish_lookup: {
        Args: { _code: string }
        Returns: {
          body: string
          expires_at: string
          nickname: string
          state: string
          wish_status: string
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
