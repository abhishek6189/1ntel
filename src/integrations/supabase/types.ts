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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      chat_conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string | null
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id?: string | null
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          approved_by: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_approved: boolean | null
          sender_id: string
        }
        Insert: {
          approved_by?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          sender_id: string
        }
        Update: {
          approved_by?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_reports: {
        Row: {
          brakes_condition: string | null
          created_at: string
          engine_condition: string | null
          exterior_condition: string | null
          id: string
          inspection_request_id: string
          inspector_id: string
          interior_condition: string | null
          media_urls: string[] | null
          overall_notes: string | null
          tires_condition: string | null
          transmission_condition: string | null
        }
        Insert: {
          brakes_condition?: string | null
          created_at?: string
          engine_condition?: string | null
          exterior_condition?: string | null
          id?: string
          inspection_request_id: string
          inspector_id: string
          interior_condition?: string | null
          media_urls?: string[] | null
          overall_notes?: string | null
          tires_condition?: string | null
          transmission_condition?: string | null
        }
        Update: {
          brakes_condition?: string | null
          created_at?: string
          engine_condition?: string | null
          exterior_condition?: string | null
          id?: string
          inspection_request_id?: string
          inspector_id?: string
          interior_condition?: string | null
          media_urls?: string[] | null
          overall_notes?: string | null
          tires_condition?: string | null
          transmission_condition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_reports_inspection_request_id_fkey"
            columns: ["inspection_request_id"]
            isOneToOne: false
            referencedRelation: "inspection_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_requests: {
        Row: {
          buyer_id: string
          completed_at: string | null
          created_at: string
          id: string
          inspector_id: string | null
          listing_id: string
          notes: string | null
          payment_amount: number | null
          result: Database["public"]["Enums"]["inspection_status"] | null
          scheduled_date: string | null
          status: string
          stripe_payment_id: string | null
          updated_at: string
        }
        Insert: {
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          inspector_id?: string | null
          listing_id: string
          notes?: string | null
          payment_amount?: number | null
          result?: Database["public"]["Enums"]["inspection_status"] | null
          scheduled_date?: string | null
          status?: string
          stripe_payment_id?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          inspector_id?: string | null
          listing_id?: string
          notes?: string | null
          payment_amount?: number | null
          result?: Database["public"]["Enums"]["inspection_status"] | null
          scheduled_date?: string | null
          status?: string
          stripe_payment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          body_type: string
          created_at: string
          description: string | null
          fuel_type: string
          id: string
          images: string[] | null
          inspection_status: Database["public"]["Enums"]["inspection_status"]
          location: string
          make: string
          mileage: number
          model: string
          price: number
          seller_id: string
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          transmission: string
          updated_at: string
          vin: string | null
          year: number
        }
        Insert: {
          body_type: string
          created_at?: string
          description?: string | null
          fuel_type?: string
          id?: string
          images?: string[] | null
          inspection_status?: Database["public"]["Enums"]["inspection_status"]
          location: string
          make: string
          mileage: number
          model: string
          price: number
          seller_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          transmission?: string
          updated_at?: string
          vin?: string | null
          year: number
        }
        Update: {
          body_type?: string
          created_at?: string
          description?: string | null
          fuel_type?: string
          id?: string
          images?: string[] | null
          inspection_status?: Database["public"]["Enums"]["inspection_status"]
          location?: string
          make?: string
          mileage?: number
          model?: string
          price?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          transmission?: string
          updated_at?: string
          vin?: string | null
          year?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_cars: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_cars_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          max_listings: number
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_listings?: number
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          max_listings?: number
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "buyer" | "seller" | "inspector" | "admin"
      inspection_status:
        | "none"
        | "pending"
        | "in_progress"
        | "passed"
        | "passed_with_issues"
        | "failed"
      listing_status: "draft" | "active" | "sold" | "removed"
      subscription_plan: "individual" | "garage" | "dealer"
      subscription_status: "active" | "cancelled" | "past_due" | "trialing"
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
      app_role: ["buyer", "seller", "inspector", "admin"],
      inspection_status: [
        "none",
        "pending",
        "in_progress",
        "passed",
        "passed_with_issues",
        "failed",
      ],
      listing_status: ["draft", "active", "sold", "removed"],
      subscription_plan: ["individual", "garage", "dealer"],
      subscription_status: ["active", "cancelled", "past_due", "trialing"],
    },
  },
} as const
