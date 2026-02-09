export interface RoutineStep {
  order: number;
  name_en: string;
  name_ko: string;
  description_en: string;
  description_ko: string;
  product_category: string;
  estimated_time_minutes: number;
  tips_en: string;
  tips_ko: string;
}

export interface Product {
  id: string;
  brand: string;
  name_en: string;
  name_ko: string;
  category: string;
  price_usd: number;
  rating: number;
  image_url: string;
  main_ingredients: string[];
  skin_type_suitable: string[];
  texture_en: string;
  texture_ko: string;
}

export interface SkinLogEntry {
  id: string;
  timestamp: string;
  hydration_level: number;
  sensitivity_level: number;
  notes_en?: string;
  notes_ko?: string;
}

export interface Ingredient {
  name: string;
  benefit_en: string;
  benefit_ko: string;
  concentration_typical: string;
  skin_type_suitable: string[];
}

export interface UserProfile {
  skin_type: string;
  age_range: string;
  main_concerns: string[];
}
