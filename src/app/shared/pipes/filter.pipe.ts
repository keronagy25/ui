// src/app/shared/pipes/filter.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { Recipe } from '../../core/models/recipe.model';

@Pipe({
  name: 'recipeFilter',
  standalone: true
})
export class RecipeFilterPipe implements PipeTransform {
  transform(
    recipes: Recipe[],
    searchTerm: string,
    cuisine: string,
    difficulty: string,
    maxTime: number
  ): Recipe[] {
    if (!recipes) return [];

    return recipes.filter(recipe => {
      const matchesSearch = !searchTerm ||
        recipe.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.ingredients?.some(i =>
          i.name.toLowerCase().includes(searchTerm.toLowerCase())
        ) ||
        recipe.cuisine?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCuisine = !cuisine ||
        recipe.cuisine?.toLowerCase() === cuisine.toLowerCase();

      const matchesDifficulty = !difficulty ||
        recipe.difficulty === difficulty;

      const matchesTime = !maxTime ||
        maxTime === 0 ||
        recipe.cookingTime <= maxTime;

      return matchesSearch && matchesCuisine &&
             matchesDifficulty && matchesTime;
    });
  }
}