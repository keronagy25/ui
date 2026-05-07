import { NutritionFacts } from './nutrition.model';

export interface MealPlan {
  id?: string;
  userId: string;
  weekStart: string;
  days: MealDay[];
  createdAt: string;
}

export interface MealDay {
  date: string;
  dayName: string;
  breakfast: MealSlot[];
  lunch: MealSlot[];
  dinner: MealSlot[];
  snacks: MealSlot[];
}

export interface MealSlot {
  recipeId: string;
  recipeName: string;
  recipeImage: string;
  servings: number;
  nutrition: NutritionFacts;
}