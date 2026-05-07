// src/app/core/models/recipe.model.ts
import type { NutritionFacts } from './nutrition.model';

export type { NutritionFacts };

export interface Recipe {
  id?:          string;        // optional — assigned by Firestore after creation
  title:        string;
  description:  string;
  authorId:     string;
  authorName:   string;
  authorPhoto:  string;
  images?:      string[];      // optional — fixes NG8107 for images?.[0]
  ingredients:  Ingredient[];
  steps:        CookingStep[];
  nutrition:    NutritionFacts; // required — remove all nutrition?. in templates
  cuisine:      string;
  cookingTime:  number;
  prepTime?:    number;         // optional — not always provided
  servings:     number;
  difficulty:   'Easy' | 'Medium' | 'Hard';
  tags?:        string[];       // optional — not always provided
  likes:        string[];
  comments:     RecipeComment[];
  rating:       number;
  reviews:      Review[];
  savedBy?:     string[];       // optional — not always provided
  createdAt:    string;
  updatedAt?:   string;         // optional — not set on initial create
}

export interface Ingredient {
  name:      string;
  amount:    number;
  unit:      string;
  category:  string;
}

export interface CookingStep {
  stepNumber:  number;
  description: string;
  duration?:   number;
  image?:      string;
}

export interface RecipeComment {
  id:        string;
  userId:    string;
  username:  string;
  userPhoto: string;
  text:      string;
  createdAt: string;
}

export interface Review {
  id:        string;
  userId:    string;
  username:  string;
  rating:    number;
  comment:   string;
  createdAt: string;
}