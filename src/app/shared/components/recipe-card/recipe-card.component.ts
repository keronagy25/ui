// src/app/shared/components/recipe-card/recipe-card.component.ts
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Recipe } from '../../../core/models/recipe.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-recipe-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recipe-card.component.html',
  styleUrls: ['./recipe-card.component.scss']
})
export class RecipeCardComponent {
  @Input() recipe!: Recipe;
  @Output() onLike = new EventEmitter<string>();
  @Output() onSave = new EventEmitter<string>();

  authService = inject(AuthService);

  get currentUserId(): string {
    return this.authService.getCurrentUserId() || '';
  }

  get isLiked(): boolean {
    return this.recipe?.likes?.includes(this.currentUserId) || false;
  }

  get isSaved(): boolean {
    const user = this.authService.currentUserData();
    const savedRecipes = user?.savedRecipes;
    if (!savedRecipes || !this.recipe?.id) return false;
    if (Array.isArray(savedRecipes)) return savedRecipes.includes(this.recipe.id);
    return Object.values(savedRecipes).includes(this.recipe.id);
  }

  get likesCount(): number {
    return this.recipe?.likes?.length || 0;
  }

  // FIX: safely handle comments being an object or array from Firebase
  get commentsCount(): number {
    const c = this.recipe?.comments;
    if (!c) return 0;
    if (Array.isArray(c)) return c.length;
    return Object.keys(c).length;
  }

  toggleLike(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.onLike.emit(this.recipe.id);
  }

  toggleSave(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.onSave.emit(this.recipe.id);
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'Easy':   return '#22c55e';
      case 'Medium': return '#f97316';
      case 'Hard':   return '#ef4444';
      default:       return '#6b7280';
    }
  }
}