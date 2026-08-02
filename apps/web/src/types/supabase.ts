
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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      household_join_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          expires_at: string
          household_id: string
          id: string
          status: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by: string
          expires_at: string
          household_id: string
          id?: string
          status?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string
          household_id?: string
          id?: string
          status?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_join_codes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          household_id: string
          id?: string
          joined_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          household_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_user_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_user_id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string
          day_of_month: number
          household_id: string
          id: string
          is_active: boolean
          note: string | null
          payer_user_id: string
          updated_at: string | null
          expense_type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by: string
          day_of_month: number
          household_id: string
          id?: string
          is_active?: boolean
          note?: string | null
          payer_user_id: string
          updated_at?: string | null
          expense_type?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string
          day_of_month?: number
          household_id?: string
          id?: string
          is_active?: boolean
          note?: string | null
          payer_user_id?: string
          updated_at?: string | null
          expense_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_expenses_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_reminder_dismissals: {
        Row: {
          created_at: string
          dismissed_by: string
          id: string
          period_month: string
          recurring_expense_id: string | null
          recurring_income_id: string | null
        }
        Insert: {
          created_at?: string
          dismissed_by: string
          id?: string
          period_month: string
          recurring_expense_id?: string | null
          recurring_income_id?: string | null
        }
        Update: {
          created_at?: string
          dismissed_by?: string
          id?: string
          period_month?: string
          recurring_expense_id?: string | null
          recurring_income_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_reminder_dismissals_recurring_expense_id_fkey"
            columns: ["recurring_expense_id"]
            isOneToOne: false
            referencedRelation: "recurring_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_reminder_dismissals_recurring_income_id_fkey"
            columns: ["recurring_income_id"]
            isOneToOne: false
            referencedRelation: "recurring_incomes"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_incomes: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string
          day_of_month: number
          household_id: string
          id: string
          is_active: boolean
          note: string | null
          recipient_user_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by: string
          day_of_month: number
          household_id: string
          id?: string
          is_active?: boolean
          note?: string | null
          recipient_user_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string
          day_of_month?: number
          household_id?: string
          id?: string
          is_active?: boolean
          note?: string | null
          recipient_user_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_incomes_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_scans: {
        Row: {
          created_at: string
          created_by: string
          household_id: string
          id: string
          mime_type: string
          ocr_error: string | null
          ocr_result: Json | null
          size_bytes: number
          status: string
          storage_path: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          household_id: string
          id?: string
          mime_type: string
          ocr_error?: string | null
          ocr_result?: Json | null
          size_bytes: number
          status?: string
          storage_path: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          household_id?: string
          id?: string
          mime_type?: string
          ocr_error?: string | null
          ocr_result?: Json | null
          size_bytes?: number
          status?: string
          storage_path?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_scans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_scans_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string
          from_user_id: string | null
          household_id: string
          id: string
          note: string | null
          settled_on: string
          to_user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by: string
          from_user_id?: string | null
          household_id: string
          id?: string
          note?: string | null
          settled_on?: string
          to_user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string
          from_user_id?: string | null
          household_id?: string
          id?: string
          note?: string | null
          settled_on?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          advance_to_user_id: string | null
          amount: number
          category: string | null
          created_at: string | null
          created_by: string
          household_id: string
          id: string
          note: string | null
          occurred_on: string
          payer_user_id: string | null
          place: string | null
          recurring_expense_id: string | null
          recurring_income_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
        }
        Insert: {
          advance_to_user_id?: string | null
          amount: number
          category?: string | null
          created_at?: string | null
          created_by: string
          household_id: string
          id?: string
          note?: string | null
          occurred_on?: string
          payer_user_id?: string | null
          place?: string | null
          recurring_expense_id?: string | null
          recurring_income_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Update: {
          advance_to_user_id?: string | null
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string
          household_id?: string
          id?: string
          note?: string | null
          occurred_on?: string
          payer_user_id?: string | null
          place?: string | null
          recurring_expense_id?: string | null
          recurring_income_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_default_categories: {
        Args: { household_uuid: string }
        Returns: undefined
      }
      create_household_with_owner: {
        Args: { household_name: string; owner_user_id?: string }
        Returns: string
      }
      generate_recurring_transactions: {
        Args: { target_household: string; target_month: string }
        Returns: number
      }
      register_receipt_scan: {
        Args: {
          target_advance_to_user_id?: string | null
          target_amount: number
          target_category: string
          target_note?: string | null
          target_occurred_on: string
          target_payer_user_id?: string | null
          target_place?: string | null
          target_scan_id: string
          target_type: Database["public"]["Enums"]["transaction_type"]
        }
        Returns: Database["public"]["Tables"]["transactions"]["Row"][]
      }
      get_income_reminders: {
        Args: { target_household: string; target_date?: string }
        Returns: {
          id: string
          amount: number
          day_of_month: number
          category: string
          note: string | null
          recipient_user_id: string
        }[]
      }
      get_household_balances: {
        Args: { target_household: string }
        Returns: {
          balance_amount: number
          user_id: string
          user_name: string
        }[]
      }
      get_household_balance_breakdown: {
        Args: { target_household: string }
        Returns: {
          subject_user_id: string
          subject_user_name: string | null
          counterparty_user_id: string | null
          counterparty_user_name: string | null
          balance_amount: number
          is_over_settled: boolean
        }[]
      }
      create_balance_settlement: {
        Args: {
          target_household: string
          target_subject_user: string
          target_counterparty_user: string | null
          target_amount: number
          target_settled_on: string
          target_note?: string | null
        }
        Returns: Database["public"]["Tables"]["settlements"]["Row"][]
      }
      get_ranked_place_suggestions: {
        Args: { target_household: string }
        Returns: {
          place: string
          use_count: number
          last_used_on: string
        }[]
      }
      is_household_member: {
        Args: { target_household: string }
        Returns: boolean
      }
      is_household_owner: {
        Args: { target_household: string }
        Returns: boolean
      }
    }
    Enums: {
      transaction_type: "expense" | "income" | "advance"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      transaction_type: ["expense", "income", "advance"],
    },
  },
} as const
