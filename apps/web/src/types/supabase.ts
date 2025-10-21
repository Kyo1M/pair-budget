/**
 * Supabase Database型定義
 * 
 * データベーススキーマの型定義を提供します。
 * 将来的にはSupabase CLIで自動生成することを推奨します。
 */

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      households: {
        Row: {
          id: string;
          name: string;
          owner_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          role: 'owner' | 'member';
          joined_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          role: 'owner' | 'member';
          joined_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          role?: 'owner' | 'member';
          joined_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          household_id: string;
          type: 'expense' | 'income' | 'advance';
          amount: number;
          occurred_on: string;
          category: string | null;
          note: string | null;
          payer_user_id: string | null;
          advance_to_user_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          type: 'expense' | 'income' | 'advance';
          amount: number;
          occurred_on?: string;
          category?: string | null;
          note?: string | null;
          payer_user_id?: string | null;
          advance_to_user_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          type?: 'expense' | 'income' | 'advance';
          amount?: number;
          occurred_on?: string;
          category?: string | null;
          note?: string | null;
          payer_user_id?: string | null;
          advance_to_user_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      settlements: {
        Row: {
          id: string;
          household_id: string;
          from_user_id: string | null;
          to_user_id: string | null;
          amount: number;
          settled_on: string;
          note: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          from_user_id?: string | null;
          to_user_id?: string | null;
          amount: number;
          settled_on?: string;
          note?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          from_user_id?: string | null;
          to_user_id?: string | null;
          amount?: number;
          settled_on?: string;
          note?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };
      household_join_codes: {
        Row: {
          id: string;
          household_id: string;
          code: string;
          status: 'active' | 'used' | 'expired' | 'revoked';
          expires_at: string;
          created_by: string;
          used_by: string | null;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          code: string;
          status?: 'active' | 'used' | 'expired' | 'revoked';
          expires_at: string;
          created_by: string;
          used_by?: string | null;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          code?: string;
          status?: 'active' | 'used' | 'expired' | 'revoked';
          expires_at?: string;
          created_by?: string;
          used_by?: string | null;
          used_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_household_member: {
        Args: {
          target_household: string;
        };
        Returns: boolean;
      };
      is_household_owner: {
        Args: {
          target_household: string;
        };
        Returns: boolean;
      };
      get_household_balances: {
        Args: {
          target_household: string;
        };
        Returns: Array<{
          user_id: string;
          user_name: string | null;
          balance_amount: number;
        }>;
      };
    };
    Enums: {
      transaction_type: 'expense' | 'income' | 'advance';
    };
  };
};
