// src/app/features/profile/user-profile/user-profile.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { RecipeService } from '../../../core/services/recipe.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import { Recipe } from '../../../core/models/recipe.model';
import { RecipeCardComponent } from '../../../shared/components/recipe-card/recipe-card.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, RecipeCardComponent],
  templateUrl: './user-profile.html',
  styleUrls: ['./user-profile.scss']
})
export class UserProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);
  private recipeService = inject(RecipeService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  profileUser: User | null = null;
  userRecipes: Recipe[] = [];
  savedRecipes: Recipe[] = [];
  isLoading = true;
  activeTab: 'recipes' | 'saved' | 'edit' = 'recipes';
  isFollowing = false;

  editForm: FormGroup = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    bio: ['', Validators.maxLength(200)],
    photoURL: ['']
  });

  isSavingProfile = false;
  editSuccess = false;

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['username']) {
        this.loadProfile(params['username']);
      }
    });
  }

  loadProfile(username: string) {
    this.isLoading = true;
    this.userService.getUserByUsername(username).subscribe({
      next: (user) => {
        if (user) {
          this.profileUser = user;
          this.checkFollowing();
          this.loadUserRecipes(user.uid);
          this.editForm.patchValue({
            displayName: user.displayName,
            bio: user.bio || '',
            photoURL: user.photoURL || ''
          });
        }
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  loadUserRecipes(userId: string) {
    this.recipeService.getAllRecipes().subscribe(recipes => {
      this.userRecipes = recipes.filter(r => r.authorId === userId);
    });
  }

  checkFollowing() {
    const currentUser = this.authService.currentUserData();
    if (currentUser && this.profileUser) {
      this.isFollowing = currentUser.following?.includes(
        this.profileUser.uid
      ) || false;
    }
  }

  get isOwnProfile(): boolean {
    return this.authService.getCurrentUserId() === this.profileUser?.uid;
  }

  get currentUserId(): string {
    return this.authService.getCurrentUserId() || '';
  }

  toggleFollow() {
    if (!this.profileUser) return;
    this.userService.toggleFollow(
      this.currentUserId,
      this.profileUser.uid
    ).subscribe(() => {
      this.isFollowing = !this.isFollowing;
      this.loadProfile(this.profileUser!.username);
    });
  }

  toggleLike(recipeId: string | undefined) {
    if (!recipeId) return;
    this.recipeService.toggleLike(recipeId, this.currentUserId).subscribe();
  }

  toggleSave(recipeId: string | undefined) {
    if (!recipeId) return;
    this.recipeService.toggleSaveRecipe(
      this.currentUserId, recipeId
    ).subscribe();
  }

  saveProfile() {
    if (this.editForm.invalid) return;
    this.isSavingProfile = true;

    this.userService.updateUser(
      this.currentUserId,
      this.editForm.value
    ).subscribe({
      next: () => {
        this.isSavingProfile = false;
        this.editSuccess = true;
        setTimeout(() => this.editSuccess = false, 3000);
        this.loadProfile(this.profileUser!.username);
      },
      error: () => { this.isSavingProfile = false; }
    });
  }

  get followersCount(): number {
    return this.profileUser?.followers?.length || 0;
  }

  get followingCount(): number {
    return this.profileUser?.following?.length || 0;
  }
}