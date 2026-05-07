// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component')
        .then(m => m.LandingComponent)
  },
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component')
            .then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component')
            .then(m => m.RegisterComponent)
      }
    ]
  },
  {
    path: 'recipes',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/recipes/recipe-feed/recipe-feed.component')
            .then(m => m.RecipeFeedComponent)
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./features/recipes/recipe-create/recipe-create.component')
            .then(m => m.RecipeCreateComponent)
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/recipes/recipe-detail/recipe-detail.component')
            .then(m => m.RecipeDetailComponent)
      }
    ]
  },
  {
    path: 'profile/:username',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/user-profile/user-profile.component')
        .then(m => m.UserProfileComponent)
  },
  {
    path: 'meal-plan',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/meal-plan/meal-planner/meal-planner.component')
        .then(m => m.MealPlannerComponent)
  },
  {
    path: 'shopping-list',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/shopping-list/shopping-list.component')
        .then(m => m.ShoppingListComponent)
  },
  {
    path: 'saved-recipes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/saved-recipes/saved-recipes.component')
        .then(m => m.SavedRecipesComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];