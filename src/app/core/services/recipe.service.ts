// src/app/core/services/recipe.service.ts
import { Injectable, inject } from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue
} from '@angular/fire/database';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Recipe, RecipeComment, Review } from '../models/recipe.model';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private db = inject(Database);

  // ─── CREATE ───────────────────────────────────────────
  createRecipe(recipe: Recipe): Observable<string> {
    const recipesRef = ref(this.db, 'recipes');
    const newRef = push(recipesRef);
    const recipeWithId = {
      ...recipe,
      id: newRef.key,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return from(set(newRef, recipeWithId)).pipe(
      map(() => newRef.key as string)
    );
  }

  // ─── READ ALL ─────────────────────────────────────────
  // FIX: Use onValue properly with unsubscribe + complete(),
  //      AND normalise each recipe so comments/reviews are always arrays.
  getAllRecipes(): Observable<Recipe[]> {
    return new Observable(observer => {
      const recipesRef = ref(this.db, 'recipes');

      // onValue returns an unsubscribe function
      const unsubscribe = onValue(
        recipesRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const recipes = (Object.values(data) as Recipe[])
              .map(r => this.normaliseRecipe(r))
              .reverse();
            observer.next(recipes);
          } else {
            observer.next([]);
          }
          // Complete after first emission so isLoading
          // gets set to false reliably
          observer.complete();
        },
        (error) => observer.error(error)
      );

      // Cleanup when the Observable is unsubscribed
      return () => unsubscribe();
    });
  }

  // ─── READ ONE ──────────────────────────────────────────
  getRecipeById(id: string): Observable<Recipe | null> {
    return from(get(ref(this.db, `recipes/${id}`))).pipe(
      map(snapshot => {
        const data = snapshot.val() as Recipe | null;
        return data ? this.normaliseRecipe(data) : null;
      })
    );
  }

  // ─── NORMALISE ────────────────────────────────────────
  // Firebase stores arrays as objects when items are deleted.
  // This ensures comments, reviews, likes, tags are always arrays.
  private normaliseRecipe(recipe: Recipe): Recipe {
    return {
      ...recipe,
      likes: this.toArray<string>(recipe.likes),
      tags: this.toArray<string>(recipe.tags),
      savedBy: this.toArray<string>(recipe.savedBy),
      comments: this.toArray<RecipeComment>(recipe.comments),
      reviews: this.toArray<Review>(recipe.reviews),
    };
  }

  private toArray<T>(value: any): T[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'object') return Object.values(value).filter(Boolean) as T[];
    return [];
  }

  // ─── UPDATE ───────────────────────────────────────────
  updateRecipe(id: string, data: Partial<Recipe>): Observable<void> {
    const updates = { ...data, updatedAt: new Date().toISOString() };
    return from(update(ref(this.db, `recipes/${id}`), updates));
  }

  // ─── DELETE ───────────────────────────────────────────
  deleteRecipe(id: string): Observable<void> {
    return from(remove(ref(this.db, `recipes/${id}`)));
  }

  // ─── LIKE ─────────────────────────────────────────────
  toggleLike(recipeId: string, userId: string): Observable<void> {
    return from(get(ref(this.db, `recipes/${recipeId}/likes`))).pipe(
      switchMap(snapshot => {
        const likes: string[] = this.toArray<string>(snapshot.val());
        const index = likes.indexOf(userId);
        if (index > -1) likes.splice(index, 1);
        else likes.push(userId);
        return from(set(ref(this.db, `recipes/${recipeId}/likes`), likes));
      })
    );
  }

  // ─── COMMENT ──────────────────────────────────────────
  addComment(recipeId: string, comment: RecipeComment): Observable<void> {
    const commentRef = push(ref(this.db, `recipes/${recipeId}/comments`));
    return from(set(commentRef, { ...comment, id: commentRef.key }));
  }

  // ─── REVIEW ───────────────────────────────────────────
  addReview(recipeId: string, review: Review): Observable<void> {
    const reviewRef = push(ref(this.db, `recipes/${recipeId}/reviews`));
    return from(set(reviewRef, { ...review, id: reviewRef.key }));
  }

  // ─── SAVE RECIPE ──────────────────────────────────────
  toggleSaveRecipe(userId: string, recipeId: string): Observable<void> {
    return from(get(ref(this.db, `users/${userId}/savedRecipes`))).pipe(
      switchMap(snapshot => {
        const saved: string[] = this.toArray<string>(snapshot.val());
        const index = saved.indexOf(recipeId);
        if (index > -1) saved.splice(index, 1);
        else saved.push(recipeId);
        return from(set(ref(this.db, `users/${userId}/savedRecipes`), saved));
      })
    );
  }

  // ─── SEARCH & FILTER ──────────────────────────────────
  searchRecipes(
    recipes: Recipe[],
    searchTerm: string,
    cuisine: string,
    difficulty: string,
    maxTime: number
  ): Recipe[] {
    return recipes.filter(recipe => {
      const matchesSearch = !searchTerm ||
        recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.ingredients.some(i =>
          i.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      const matchesCuisine = !cuisine || recipe.cuisine === cuisine;
      const matchesDifficulty = !difficulty || recipe.difficulty === difficulty;
      const matchesTime = !maxTime || recipe.cookingTime <= maxTime;
      return matchesSearch && matchesCuisine && matchesDifficulty && matchesTime;
    });
  }
}