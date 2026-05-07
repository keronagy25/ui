// src/app/core/services/meal-plan.service.ts
import { Injectable, inject } from '@angular/core';
import { Database, ref, push, set, get, update, remove, onValue } from '@angular/fire/database';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { MealPlan, MealDay, MealSlot } from '../models/meal-plan.model';

@Injectable({
  providedIn: 'root'
})
export class MealPlanService {
  private db = inject(Database);

  createMealPlan(mealPlan: MealPlan): Observable<string> {
    const plansRef = ref(this.db, `mealPlans/${mealPlan.userId}`);
    const newRef = push(plansRef);
    return from(set(newRef, { ...mealPlan, id: newRef.key })).pipe(
      map(() => newRef.key as string)
    );
  }

  getMealPlans(userId: string): Observable<MealPlan[]> {
    return new Observable(observer => {
      onValue(ref(this.db, `mealPlans/${userId}`), snapshot => {
        const data = snapshot.val();
        observer.next(data ? Object.values(data) as MealPlan[] : []);
      });
    });
  }

  updateMealPlan(userId: string, planId: string, data: Partial<MealPlan>): Observable<void> {
    return from(update(ref(this.db, `mealPlans/${userId}/${planId}`), data));
  }

  deleteMealPlan(userId: string, planId: string): Observable<void> {
    return from(remove(ref(this.db, `mealPlans/${userId}/${planId}`)));
  }

  generateShoppingList(mealPlan: MealPlan) {
    const ingredientsMap = new Map<string, { amount: number; unit: string; category: string }>();

    mealPlan.days.forEach(day => {
      const allMeals = [...day.breakfast, ...day.lunch, ...day.dinner, ...day.snacks];
      // Aggregate ingredients
    });

    return ingredientsMap;
  }
}