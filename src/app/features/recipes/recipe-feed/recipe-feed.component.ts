// src/app/features/recipes/recipe-feed/recipe-feed.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RecipeService } from '../../../core/services/recipe.service';
import { AuthService } from '../../../core/services/auth.service';
import { Recipe } from '../../../core/models/recipe.model';
import { RecipeCardComponent } from '../../../shared/components/recipe-card/recipe-card.component';
import { RecipeFilterPipe } from '../../../shared/pipes/filter.pipe';

@Component({
  selector: 'app-recipe-feed',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    RecipeCardComponent,
    RecipeFilterPipe
  ],
  templateUrl: './recipe-feed.html',
  styleUrls: ['./recipe-feed.scss']
})
export class RecipeFeedComponent implements OnInit {
  private recipeService = inject(RecipeService);
  private authService = inject(AuthService);

  recipes: Recipe[] = [];
  isLoading = true;

  // Filters
  searchTerm = '';
  selectedCuisine = '';
  selectedDifficulty = '';
  maxCookingTime = 0;
  sortBy = 'newest';
  viewMode: 'grid' | 'list' = 'grid';

  cuisines = [
    'Italian', 'Mexican', 'Chinese', 'Indian',
    'American', 'French', 'Japanese', 'Mediterranean'
  ];

  difficulties = ['Easy', 'Medium', 'Hard'];

  timeRanges = [
    { label: 'Any Time', value: 0 },
    { label: 'Under 15 min', value: 15 },
    { label: 'Under 30 min', value: 30 },
    { label: 'Under 60 min', value: 60 },
    { label: 'Under 120 min', value: 120 }
  ];

  ngOnInit() {
    this.loadRecipes();
  }

  loadRecipes() {
    this.isLoading = true;
    this.recipeService.getAllRecipes().subscribe({
      next: (recipes) => {
        this.recipes = this.sortRecipes(recipes);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  sortRecipes(recipes: Recipe[]): Recipe[] {
    switch (this.sortBy) {
      case 'newest':
        return [...recipes].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'popular':
        return [...recipes].sort((a, b) =>
          (b.likes?.length || 0) - (a.likes?.length || 0)
        );
      case 'rating':
        return [...recipes].sort((a, b) =>
          (b.rating || 0) - (a.rating || 0)
        );
      case 'quickest':
        return [...recipes].sort((a, b) =>
          (a.cookingTime || 0) - (b.cookingTime || 0)
        );
      default:
        return recipes;
    }
  }

  onSortChange() {
    this.recipes = this.sortRecipes(this.recipes);
  }

  toggleLike(recipeId: string | undefined) {
    if (!recipeId) return;
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    this.recipeService.toggleLike(recipeId, userId).subscribe();
  }

  toggleSave(recipeId: string | undefined) {
    if (!recipeId) return;
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    this.recipeService.toggleSaveRecipe(userId, recipeId).subscribe();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCuisine = '';
    this.selectedDifficulty = '';
    this.maxCookingTime = 0;
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.selectedCuisine ||
              this.selectedDifficulty || this.maxCookingTime);
  }

  get filteredCount(): number {
    return this.recipes.filter(r => {
      const matchesSearch = !this.searchTerm ||
        r.title?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        r.ingredients?.some(i =>
          i.name.toLowerCase().includes(this.searchTerm.toLowerCase())
        );
      const matchesCuisine = !this.selectedCuisine ||
        r.cuisine === this.selectedCuisine;
      const matchesDifficulty = !this.selectedDifficulty ||
        r.difficulty === this.selectedDifficulty;
      const matchesTime = !this.maxCookingTime ||
        r.cookingTime <= this.maxCookingTime;
      return matchesSearch && matchesCuisine &&
             matchesDifficulty && matchesTime;
    }).length;
  }
}