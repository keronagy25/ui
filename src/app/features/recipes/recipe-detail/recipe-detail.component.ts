// src/app/features/recipes/recipe-detail/recipe-detail.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { RecipeService } from '../../../core/services/recipe.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { Recipe, RecipeComment, Review } from '../../../core/models/recipe.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './recipe-detail.html',
  styleUrls: ['./recipe-detail.scss']
})
export class RecipeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recipeService = inject(RecipeService);
  protected authService = inject(AuthService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);

  recipe: Recipe | null = null;
  isLoading = true;
  activeTab: 'ingredients' | 'steps' | 'nutrition' | 'reviews' = 'ingredients';
  selectedImage = 0;

  // Follow feature properties
  recipeAuthor: User | null = null;
  authorIsFollowing = false;
  isLoadingAuthor = false;

  // Comment Form
  commentForm: FormGroup = this.fb.group({
    text: ['', [Validators.required, Validators.minLength(3)]]
  });

  // Review Form
  reviewForm: FormGroup = this.fb.group({
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comment: ['', [Validators.required, Validators.minLength(10)]]
  });

  isSubmittingComment = false;
  isSubmittingReview = false;
  isDeleting = false;
  hoveredStar = 0;

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.loadRecipe(params['id']);
      }
    });
  }

  loadRecipe(id: string) {
    this.isLoading = true;
    this.recipeService.getRecipeById(id).subscribe({
      next: (recipe) => {
        this.recipe = recipe;
        this.isLoading = false;
        
        // Load author data for follow button
        if (recipe?.authorId) {
          this.loadAuthorData(recipe.authorId);
        }
      },
      error: () => {
        this.isLoading = false;
        this.router.navigate(['/recipes']);
      }
    });
  }

  // Load author data for follow button
  loadAuthorData(authorId: string) {
    this.isLoadingAuthor = true;
    this.userService.getUserById(authorId).subscribe({
      next: (user) => {
        this.recipeAuthor = user;
        this.checkIfFollowingAuthor();
        this.isLoadingAuthor = false;
      },
      error: () => {
        this.isLoadingAuthor = false;
      }
    });
  }

  // Check if current user follows the recipe author
  checkIfFollowingAuthor() {
    const currentUser = this.authService.currentUserData();
    if (currentUser && this.recipeAuthor) {
      this.authorIsFollowing = currentUser.following?.includes(
        this.recipeAuthor.uid
      ) || false;
    }
  }

  // Toggle follow/unfollow the recipe author
  toggleFollowAuthor() {
    if (!this.recipeAuthor || !this.currentUserId) return;
    
    this.userService.toggleFollow(
      this.currentUserId,
      this.recipeAuthor.uid
    ).subscribe({
      next: () => {
        this.authorIsFollowing = !this.authorIsFollowing;
        // Refresh author data to update follower count
        if (this.recipeAuthor) {
          this.loadAuthorData(this.recipeAuthor.uid);
        }
        // Refresh current user data
        this.authService.refreshUserData();
      },
      error: (err) => {
        console.error('Error toggling follow:', err);
      }
    });
  }

  // ─── GETTERS ───────────────────────────────────────────
  get currentUserId(): string {
    return this.authService.getCurrentUserId() || '';
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get isAuthor(): boolean {
    return this.recipe?.authorId === this.currentUserId;
  }

  get isOwnRecipe(): boolean {
    return this.recipe?.authorId === this.currentUserId;
  }

  get isLiked(): boolean {
    return this.recipe?.likes?.includes(this.currentUserId) || false;
  }

  get isSaved(): boolean {
    return this.authService.currentUserData()
      ?.savedRecipes?.includes(this.recipe?.id || '') || false;
  }

  get likesCount(): number {
    return this.recipe?.likes?.length || 0;
  }

  get commentsArray(): RecipeComment[] {
    if (!this.recipe?.comments) return [];
    if (Array.isArray(this.recipe.comments)) return this.recipe.comments;
    return Object.values(this.recipe.comments);
  }

  get reviewsArray(): Review[] {
    if (!this.recipe?.reviews) return [];
    if (Array.isArray(this.recipe.reviews)) return this.recipe.reviews;
    return Object.values(this.recipe.reviews);
  }

  get averageRating(): number {
    if (!this.reviewsArray.length) return 0;
    const sum = this.reviewsArray.reduce((acc, r) => acc + r.rating, 0);
    return sum / this.reviewsArray.length;
  }

  // ─── ACTIONS ───────────────────────────────────────────
  toggleLike() {
    if (!this.isLoggedIn || !this.recipe?.id) return;
    this.recipeService.toggleLike(this.recipe.id, this.currentUserId)
      .subscribe(() => this.loadRecipe(this.recipe!.id!));
  }

  toggleSave() {
    if (!this.isLoggedIn || !this.recipe?.id) return;
    this.recipeService.toggleSaveRecipe(this.currentUserId, this.recipe.id)
      .subscribe();
  }

  submitComment() {
    if (this.commentForm.invalid || !this.recipe?.id) return;
    const user = this.authService.currentUserData();
    if (!user) return;

    this.isSubmittingComment = true;

    const comment: RecipeComment = {
      id: Date.now().toString(),
      userId: this.currentUserId,
      username: user.displayName,
      userPhoto: user.photoURL || '',
      text: this.commentForm.value.text,
      createdAt: new Date().toISOString()
    };

    this.recipeService.addComment(this.recipe.id, comment).subscribe({
      next: () => {
        this.commentForm.reset();
        this.isSubmittingComment = false;
        this.loadRecipe(this.recipe!.id!);
      },
      error: () => { this.isSubmittingComment = false; }
    });
  }

  submitReview() {
    if (this.reviewForm.invalid || !this.recipe?.id) return;
    const user = this.authService.currentUserData();
    if (!user) return;

    this.isSubmittingReview = true;

    const review: Review = {
      id: Date.now().toString(),
      userId: this.currentUserId,
      username: user.displayName,
      rating: this.reviewForm.value.rating,
      comment: this.reviewForm.value.comment,
      createdAt: new Date().toISOString()
    };

    this.recipeService.addReview(this.recipe.id, review).subscribe({
      next: () => {
        this.reviewForm.reset({ rating: 5, comment: '' });
        this.isSubmittingReview = false;
        this.loadRecipe(this.recipe!.id!);
      },
      error: () => { this.isSubmittingReview = false; }
    });
  }

  deleteRecipe() {
    if (!this.recipe?.id || !this.isAuthor) return;
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    this.isDeleting = true;
    this.recipeService.deleteRecipe(this.recipe.id).subscribe({
      next: () => this.router.navigate(['/recipes']),
      error: () => { this.isDeleting = false; }
    });
  }

  setRating(star: number) {
    this.reviewForm.patchValue({ rating: star });
  }

  getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'Easy': return '#22c55e';
      case 'Medium': return '#f97316';
      case 'Hard': return '#ef4444';
      default: return '#6b7280';
    }
  }

  getStars(rating: number): number[] {
    return Array(5).fill(0).map((_, i) => i + 1);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}