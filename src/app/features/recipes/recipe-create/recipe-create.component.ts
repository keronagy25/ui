// src/app/features/recipes/recipe-create/recipe-create.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { RecipeService } from '../../../core/services/recipe.service';
import { AuthService } from '../../../core/services/auth.service';
import { Recipe } from '../../../core/models/recipe.model';
import {
  Storage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from '@angular/fire/storage';

@Component({
  selector: 'app-recipe-create',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './recipe-create.html',
  styleUrls: ['./recipe-create.scss']
})
export class RecipeCreateComponent implements OnInit {

  private fb            = inject(FormBuilder);
  private recipeService = inject(RecipeService);
  protected authService = inject(AuthService);
  private router        = inject(Router);
  private storage       = inject(Storage);  // ← Firebase Storage

  // ── UI state ───────────────────────────────────────────────────────────────
  isLoading    = false;
  errorMessage = '';
  currentStep  = 1;
  totalSteps   = 4;

  // ── Image state ────────────────────────────────────────────────────────────
  imagePreview      = '';
  isUploadingImage  = false;
  uploadError       = '';
  imageInputMode: 'upload' | 'url' = 'upload';  // ← tab toggle

  // ── Static data ────────────────────────────────────────────────────────────
  cuisines = [
    'Italian', 'Mexican', 'Chinese', 'Indian',
    'American', 'French', 'Japanese', 'Mediterranean',
    'Thai', 'Greek', 'Spanish', 'Middle Eastern'
  ];

  units = ['g', 'kg', 'ml', 'L', 'cup', 'tbsp', 'tsp', 'piece', 'slice'];

  categories = [
    'Vegetables', 'Fruits', 'Meat', 'Seafood',
    'Dairy', 'Grains', 'Spices', 'Other'
  ];

  // ── Form ───────────────────────────────────────────────────────────────────
  recipeForm!: FormGroup;

  ngOnInit(): void {
    const user = this.authService.currentUserData();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.recipeForm = this.fb.group({

      // ── Step 1 ─────────────────────────────────────────────────────────────
      title:       ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      cuisine:     ['', Validators.required],
      difficulty:  ['', Validators.required],
      cookingTime: [null, [Validators.required, Validators.min(1)]],
      prepTime:    [null, [Validators.required, Validators.min(1)]],
      servings:    [null, [Validators.required, Validators.min(1)]],
      tags:        [''],
      imageUrl:    [''],

      // ── Step 2 ─────────────────────────────────────────────────────────────
      ingredients: this.fb.array([this.buildIngredient()]),

      // ── Step 3 ─────────────────────────────────────────────────────────────
      steps: this.fb.array([this.buildStep(1)]),

      // ── Step 4 ─────────────────────────────────────────────────────────────
      nutrition: this.fb.group({
        calories:      [null, [Validators.required, Validators.min(0)]],
        carbohydrates: [null, [Validators.required, Validators.min(0)]],
        proteins:      [null, [Validators.required, Validators.min(0)]],
        fat:           [null, [Validators.required, Validators.min(0)]],
        fiber:         [null, [Validators.required, Validators.min(0)]]
      })
    });
  }

  // ── FormArray getters ──────────────────────────────────────────────────────
  get ingredientsArray(): FormArray {
    return this.recipeForm.get('ingredients') as FormArray;
  }

  get stepsArray(): FormArray {
    return this.recipeForm.get('steps') as FormArray;
  }

  // ── FormGroup factories ────────────────────────────────────────────────────
  private buildIngredient(): FormGroup {
    return this.fb.group({
      name:     ['', Validators.required],
      amount:   [null, [Validators.required, Validators.min(0)]],
      unit:     ['g',     Validators.required],
      category: ['Other', Validators.required]
    });
  }

  private buildStep(stepNumber: number): FormGroup {
    return this.fb.group({
      stepNumber:  [stepNumber],
      description: ['', [Validators.required, Validators.minLength(5)]],
      duration:    [null]
    });
  }

  // ── Ingredient actions ─────────────────────────────────────────────────────
  addIngredient(): void {
    this.ingredientsArray.push(this.buildIngredient());
  }

  removeIngredient(index: number): void {
    if (this.ingredientsArray.length > 1) {
      this.ingredientsArray.removeAt(index);
    }
  }

  // ── Step actions ───────────────────────────────────────────────────────────
  addStep(): void {
    this.stepsArray.push(this.buildStep(this.stepsArray.length + 1));
  }

  removeStep(index: number): void {
    if (this.stepsArray.length > 1) {
      this.stepsArray.removeAt(index);
      this.stepsArray.controls.forEach((ctrl, i) => {
        ctrl.get('stepNumber')!.setValue(i + 1);
      });
    }
  }

  // ── Image: URL mode ────────────────────────────────────────────────────────
  onImageUrlChange(url: string): void {
    this.imagePreview = url;
    this.uploadError  = '';
  }

  // ── Image: File Upload mode ────────────────────────────────────────────────
  async onImageFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    // ── Validate type ──────────────────────────────────────────────────────
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      this.uploadError = 'Please select a valid image file (jpg, png, webp, gif).';
      return;
    }

    // ── Validate size (max 5 MB) ───────────────────────────────────────────
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError = 'Image must be smaller than 5 MB.';
      return;
    }

    this.isUploadingImage = true;
    this.uploadError      = '';

    // Show local preview immediately so the user gets instant feedback
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);

    try {
      // ── Upload to Firebase Storage ─────────────────────────────────────
      const userId   = this.authService.currentUserData()?.uid || 'anonymous';
      const fileName = `recipes/${userId}/${Date.now()}_${file.name}`;
      const fileRef  = storageRef(this.storage, fileName);

      await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(fileRef);

      // Patch the form with the permanent Firebase URL
      this.recipeForm.patchValue({ imageUrl: downloadURL });
      this.imagePreview     = downloadURL;
      this.isUploadingImage = false;

    } catch (err) {
      console.error('Image upload failed:', err);
      this.uploadError      = 'Upload failed. Please try again or use a URL instead.';
      this.isUploadingImage = false;
      // Keep the local preview so the user can see what they chose
    }
  }

  // ── Clear image ────────────────────────────────────────────────────────────
  clearImage(): void {
    this.imagePreview = '';
    this.uploadError  = '';
    this.recipeForm.patchValue({ imageUrl: '' });

    // Reset native file input so the same file can be re-selected
    const input = document.getElementById('imageUpload') as HTMLInputElement;
    if (input) input.value = '';
  }

  // ── Nutrition % getters ────────────────────────────────────────────────────
  get caloriesPct(): number {
    const v = +(this.recipeForm?.get('nutrition.calories')?.value ?? 0);
    return Math.min((v / 2000) * 100, 100);
  }

  get carbsPct(): number {
    const v = +(this.recipeForm?.get('nutrition.carbohydrates')?.value ?? 0);
    return Math.min((v / 325) * 100, 100);
  }

  get proteinPct(): number {
    const v = +(this.recipeForm?.get('nutrition.proteins')?.value ?? 0);
    return Math.min((v / 75) * 100, 100);
  }

  get fatPct(): number {
    const v = +(this.recipeForm?.get('nutrition.fat')?.value ?? 0);
    return Math.min((v / 65) * 100, 100);
  }

  get fiberPct(): number {
    const v = +(this.recipeForm?.get('nutrition.fiber')?.value ?? 0);
    return Math.min((v / 28) * 100, 100);
  }

  // ── Step validation ────────────────────────────────────────────────────────
  isStepValid(step: number): boolean {
    switch (step) {
      case 1:
        return ['title', 'description', 'cuisine', 'difficulty',
                'cookingTime', 'prepTime', 'servings']
          .every(field => this.recipeForm.get(field)?.valid);
      case 2:
        return this.ingredientsArray.valid;
      case 3:
        return this.stepsArray.valid;
      case 4:
        return this.recipeForm.get('nutrition')?.valid ?? false;
      default:
        return false;
    }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  nextStep(): void {
    if (this.currentStep < this.totalSteps && this.isStepValid(this.currentStep)) {
      this.currentStep++;
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  onSubmit(): void {
    // Block submit if an upload is still in progress
    if (this.isUploadingImage) {
      this.errorMessage = 'Please wait for the image to finish uploading.';
      return;
    }

    if (this.recipeForm.invalid) {
      this.recipeForm.markAllAsTouched();
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    const user = this.authService.currentUserData();
    if (!user) {
      this.errorMessage = 'You must be logged in to create a recipe.';
      return;
    }

    this.isLoading    = true;
    this.errorMessage = '';

    const fv = this.recipeForm.value;

    const tags: string[] = fv.tags
      ? (fv.tags as string).split(',').map((t: string) => t.trim()).filter(Boolean)
      : [];

    const recipe: Recipe = {
      title:       fv.title,
      description: fv.description,
      authorId:    user.uid,
      authorName:  user.displayName ?? 'Anonymous',
      authorPhoto: user.photoURL    ?? '',
      // Use the uploaded/pasted URL, fall back to default placeholder
      images: fv.imageUrl
        ? [fv.imageUrl]
        : ['https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800'],
      ingredients: fv.ingredients,
      steps: (fv.steps as any[]).map((s, i) => ({ ...s, stepNumber: i + 1 })),
      nutrition:   fv.nutrition,
      cuisine:     fv.cuisine,
      cookingTime: Number(fv.cookingTime),
      prepTime:    Number(fv.prepTime),
      servings:    Number(fv.servings),
      difficulty:  fv.difficulty,
      tags,
      likes:     [],
      comments:  [],
      rating:    0,
      reviews:   [],
      savedBy:   [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.recipeService.createRecipe(recipe).subscribe({
      next: (id) => {
        this.isLoading = false;
        this.router.navigate(['/recipes', id]);
      },
      error: (err) => {
        this.isLoading    = false;
        this.errorMessage = 'Failed to create recipe. Please try again.';
        console.error(err);
      }
    });
  }
}