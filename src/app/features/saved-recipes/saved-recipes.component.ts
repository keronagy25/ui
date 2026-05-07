// src/app/features/saved-recipes/saved-recipes.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RecipeService } from '../../core/services/recipe.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { Recipe } from '../../core/models/recipe.model';
import { RecipeCardComponent } from '../../shared/components/recipe-card/recipe-card.component';
import { RecipeFilterPipe } from '../../shared/pipes/filter.pipe';

@Component({
  selector: 'app-saved-recipes',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    RecipeCardComponent,
    RecipeFilterPipe
  ],
  templateUrl: './saved-recipes.html',
  styleUrls: ['./saved-recipes.scss']
})
export class SavedRecipesComponent implements OnInit {
  private recipeService = inject(RecipeService);
  authService = inject(AuthService);
  private userService = inject(UserService);

  allRecipes: Recipe[] = [];
  savedRecipes: Recipe[] = [];
  isLoading = true;
  searchTerm = '';
  selectedCuisine = '';
  selectedDifficulty = '';
  maxCookingTime = 0;

  cuisines = [
    'Italian', 'Mexican', 'Chinese', 'Indian',
    'American', 'French', 'Japanese', 'Mediterranean'
  ];

  ngOnInit() {
    this.loadAllRecipes();
  }

  loadAllRecipes() {
    this.isLoading = true;

    // Load all recipes first
    this.recipeService.getAllRecipes().subscribe({
      next: (recipes) => {
        this.allRecipes = recipes;
        this.filterSavedRecipes();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });

    // Also watch for user data changes
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.userService.getUserById(userId).subscribe(user => {
        if (user) {
          // Update current user data signal
          this.authService.currentUserData.set(user);
          this.filterSavedRecipes();
        }
      });
    }
  }

  filterSavedRecipes() {
    const user = this.authService.currentUserData();
    const savedIds = user?.savedRecipes || [];

    if (!savedIds.length) {
      this.savedRecipes = [];
      return;
    }

    this.savedRecipes = this.allRecipes.filter(r =>
      r.id && savedIds.includes(r.id)
    );
  }

  toggleLike(recipeId: string | undefined) {
    if (!recipeId) return;
    const userId = this.authService.getCurrentUserId() || '';
    this.recipeService.toggleLike(recipeId, userId).subscribe(() => {
      this.loadAllRecipes();
    });
  }

  toggleSave(recipeId: string | undefined) {
    if (!recipeId) return;
    const userId = this.authService.getCurrentUserId() || '';

    this.recipeService.toggleSaveRecipe(userId, recipeId).subscribe(() => {
      // Reload user data to get updated saved list
      this.userService.getUserById(userId).subscribe(user => {
        if (user) {
          this.authService.currentUserData.set(user);
          this.filterSavedRecipes();
        }
      });
    });
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCuisine = '';
    this.selectedDifficulty = '';
    this.maxCookingTime = 0;
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.selectedCuisine ||
      this.selectedDifficulty ||
      this.maxCookingTime
    );
  }
}