// src/app/features/meal-plan/meal-planner/meal-planner.component.ts
import { Component, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MealPlanService } from '../../../core/services/meal-plan.service';
import { RecipeService } from '../../../core/services/recipe.service';
import { AuthService } from '../../../core/services/auth.service';
import { ShoppingListService } from '../../../core/services/shopping-list.service';
import { MealPlan, MealDay, MealSlot } from '../../../core/models/meal-plan.model';
import { Recipe } from '../../../core/models/recipe.model';
import { ShoppingList, ShoppingCategory } from '../../../core/models/shopping-list.model';

@Component({
  selector: 'app-meal-planner',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './meal-planner.html',
  styleUrls: ['./meal-planner.scss']
})
export class MealPlannerComponent implements OnInit {
  // Reference to the planner grid for PDF generation
  @ViewChild('plannerGrid') plannerGrid!: ElementRef;

  private mealPlanService    = inject(MealPlanService);
  private recipeService      = inject(RecipeService);
  private authService        = inject(AuthService);
  private shoppingListService = inject(ShoppingListService);

  allRecipes: Recipe[]     = [];
  currentPlan: MealPlan | null = null;
  isLoading      = true;
  isSaving       = false;
  isExportingPDF = false;   // ← new flag
  showRecipeModal = false;
  selectedDay     = '';
  selectedMealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks' = 'breakfast';
  recipeSearch    = '';
  generatingList  = false;
  successMessage  = '';
  errorMessage    = '';

  days = [
    'Monday','Tuesday','Wednesday',
    'Thursday','Friday','Saturday','Sunday'
  ];

  mealTypes: Array<{
    key: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
    label: string;
    icon: string;
  }> = [
    { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { key: 'lunch',     label: 'Lunch',     icon: '☀️'  },
    { key: 'dinner',    label: 'Dinner',    icon: '🌙'  },
    { key: 'snacks',    label: 'Snacks',    icon: '🍎'  }
  ];

  ngOnInit() {
    this.loadRecipes();
    this.initializePlan();
  }

  // ─── INITIALIZE PLAN ───────────────────────────────────
  initializePlan() {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      this.createNewPlan();
      this.isLoading = false;
      return;
    }

    this.mealPlanService.getMealPlans(userId).subscribe({
      next: (plans) => {
        if (plans && plans.length > 0) {
          const sorted = plans.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          this.currentPlan = this.normalizePlan(sorted[0]);
        } else {
          this.createNewPlan();
        }
        this.isLoading = false;
      },
      error: () => {
        this.createNewPlan();
        this.isLoading = false;
      }
    });
  }

  // ─── NORMALIZE PLAN ────────────────────────────────────
  normalizePlan(plan: MealPlan): MealPlan {
    const normalizedDays = this.days.map(dayName => {
      const existing = plan.days?.find(d => d.dayName === dayName);
      if (existing) {
        return {
          ...existing,
          dayName,
          breakfast: Array.isArray(existing.breakfast) ? existing.breakfast : [],
          lunch:     Array.isArray(existing.lunch)     ? existing.lunch     : [],
          dinner:    Array.isArray(existing.dinner)    ? existing.dinner    : [],
          snacks:    Array.isArray(existing.snacks)    ? existing.snacks    : []
        };
      }
      return {
        date: new Date().toISOString(),
        dayName,
        breakfast: [],
        lunch: [],
        dinner: [],
        snacks: []
      };
    });
    return { ...plan, days: normalizedDays };
  }

  // ─── CREATE NEW PLAN ───────────────────────────────────
  createNewPlan() {
    const userId = this.authService.getCurrentUserId() || '';
    this.currentPlan = {
      userId,
      weekStart: new Date().toISOString(),
      days: this.days.map(day => ({
        date:      new Date().toISOString(),
        dayName:   day,
        breakfast: [],
        lunch:     [],
        dinner:    [],
        snacks:    []
      })),
      createdAt: new Date().toISOString()
    };
  }

  // ─── LOAD RECIPES ──────────────────────────────────────
  loadRecipes() {
    this.recipeService.getAllRecipes().subscribe(recipes => {
      this.allRecipes = recipes;
    });
  }

  // ─── MODAL ─────────────────────────────────────────────
  openRecipeModal(
    dayName: string,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  ) {
    this.selectedDay      = dayName;
    this.selectedMealType = mealType;
    this.showRecipeModal  = true;
    this.recipeSearch     = '';
  }

  closeModal() {
    this.showRecipeModal = false;
    this.recipeSearch    = '';
  }

  // ─── ADD RECIPE TO MEAL ────────────────────────────────
  addRecipeToMeal(recipe: Recipe) {
    if (!this.currentPlan) return;
    const dayIndex = this.currentPlan.days.findIndex(
      d => d.dayName === this.selectedDay
    );
    if (dayIndex === -1) return;

    const slot: MealSlot = {
      recipeId:    recipe.id || '',
      recipeName:  recipe.title,
      recipeImage: recipe.images?.[0] || '',
      servings:    recipe.servings || 1,
      nutrition:   recipe.nutrition
    };

    this.currentPlan.days[dayIndex][this.selectedMealType] = [
      ...this.currentPlan.days[dayIndex][this.selectedMealType],
      slot
    ];

    this.closeModal();
    this.savePlan();
  }

  // ─── REMOVE FROM MEAL ──────────────────────────────────
  removeFromMeal(
    dayName: string,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks',
    index: number
  ) {
    if (!this.currentPlan) return;
    const dayIndex = this.currentPlan.days.findIndex(
      d => d.dayName === dayName
    );
    if (dayIndex === -1) return;
    this.currentPlan.days[dayIndex][mealType] = [
      ...this.currentPlan.days[dayIndex][mealType]
    ].filter((_, i) => i !== index);
    this.savePlan();
  }

  // ─── GET MEAL SLOTS ────────────────────────────────────
  getMealSlots(
    day: MealDay,
    type: 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  ): MealSlot[] {
    const slots = day[type];
    if (!slots) return [];
    if (Array.isArray(slots)) return slots;
    return Object.values(slots);
  }

  // ─── SAVE PLAN ─────────────────────────────────────────
  savePlan() {
    if (!this.currentPlan) return;
    const userId = this.authService.getCurrentUserId() || '';
    if (!userId) return;

    this.isSaving     = true;
    this.errorMessage = '';

    const planToSave = {
      ...this.currentPlan,
      days: this.currentPlan.days.map(day => ({
        ...day,
        breakfast: day.breakfast || [],
        lunch:     day.lunch     || [],
        dinner:    day.dinner    || [],
        snacks:    day.snacks    || []
      }))
    };

    if (this.currentPlan.id) {
      this.mealPlanService.updateMealPlan(userId, this.currentPlan.id, planToSave)
        .subscribe({
          next:  () => { this.isSaving = false; this.showSuccess('✅ Plan saved!'); },
          error: () => { this.isSaving = false; this.errorMessage = 'Failed to save.'; }
        });
    } else {
      this.mealPlanService.createMealPlan(planToSave).subscribe({
        next: (id) => {
          if (this.currentPlan) this.currentPlan.id = id;
          this.isSaving = false;
          this.showSuccess('✅ Plan saved!');
        },
        error: () => { this.isSaving = false; this.errorMessage = 'Failed to save.'; }
      });
    }
  }

  // ─── EXPORT PDF ────────────────────────────────────────
  async downloadPDF() {
    if (!this.currentPlan) return;

    this.isExportingPDF = true;

    try {
      // Dynamically import to keep bundle size small
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      const user = this.authService.currentUserData();
      const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const pageW  = doc.internal.pageSize.getWidth();   // 297mm
      const pageH  = doc.internal.pageSize.getHeight();  // 210mm
      const margin = 12;
      const colW   = (pageW - margin * 2) / 7;           // 7 days
      let   y      = margin;

      // ── Header bar ──────────────────────────────────────
      doc.setFillColor(99, 102, 241);                     // indigo
      doc.rect(0, 0, pageW, 18, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Weekly Meal Plan', margin, 12);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const dateStr = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      doc.text(`Generated: ${dateStr}`, pageW - margin, 12, { align: 'right' });

      if (user?.displayName) {
        doc.text(`Planner: ${user.displayName}`, pageW / 2, 12, { align: 'center' });
      }

      y = 24;

      // ── Day header row ──────────────────────────────────
      this.days.forEach((day, i) => {
        const x = margin + i * colW;

        // Box
        doc.setFillColor(238, 242, 255);
        doc.roundedRect(x, y, colW - 1, 9, 1, 1, 'F');

        // Day name
        doc.setTextColor(55, 65, 81);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(day, x + (colW - 1) / 2, y + 6, { align: 'center' });

        // Nutrition under day
        const nut = this.getDayNutrition(
          this.currentPlan!.days.find(d => d.dayName === day)!
        );
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
      });

      y += 11;

      // ── Meal rows ───────────────────────────────────────
      const mealColors: Record<string, [number, number, number]> = {
        breakfast: [254, 243, 199],   // amber-100
        lunch:     [220, 252, 231],   // green-100
        dinner:    [219, 234, 254],   // blue-100
        snacks:    [243, 232, 255]    // purple-100
      };

      const mealTextColors: Record<string, [number, number, number]> = {
        breakfast: [146, 64,  14],
        lunch:     [22,  101, 52],
        dinner:    [29,  78,  216],
        snacks:    [109, 40,  217]
      };

      for (const mt of this.mealTypes) {
        const rowH = this.getMealRowHeight(mt.key);

        // Meal-type label on left edge
        doc.setFillColor(...mealColors[mt.key]);
        doc.rect(0, y, margin - 1, rowH, 'F');
        doc.setTextColor(...mealTextColors[mt.key]);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');

        // Rotate text for meal label
        doc.saveGraphicsState();
        doc.text(
          `${mt.icon} ${mt.label}`,
          margin - 2,
          y + rowH / 2,
          { angle: 90, align: 'center' }
        );
        doc.restoreGraphicsState();

        this.days.forEach((day, i) => {
          const x    = margin + i * colW;
          const dayObj = this.currentPlan!.days.find(d => d.dayName === day)!;
          const slots  = this.getMealSlots(dayObj, mt.key);

          // Cell background
          doc.setFillColor(...mealColors[mt.key]);
          doc.roundedRect(x, y, colW - 1, rowH, 1, 1, 'F');

          // Cell border
          doc.setDrawColor(209, 213, 219);
          doc.setLineWidth(0.2);
          doc.roundedRect(x, y, colW - 1, rowH, 1, 1, 'S');

          if (slots.length === 0) {
            // Empty cell
            doc.setTextColor(209, 213, 219);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.text('—', x + (colW - 1) / 2, y + rowH / 2, { align: 'center' });
          } else {
            let slotY = y + 4;
            slots.forEach(slot => {
              // Recipe name (wrap at colW - 4mm)
              doc.setTextColor(31, 41, 55);
              doc.setFontSize(6.5);
              doc.setFont('helvetica', 'bold');

              const lines = doc.splitTextToSize(slot.recipeName, colW - 4);
              doc.text(lines[0], x + 2, slotY);
              slotY += 4;

              // Calories
              if (slot.nutrition?.calories) {
                doc.setTextColor(107, 114, 128);
                doc.setFontSize(5.5);
                doc.setFont('helvetica', 'normal');
                doc.text(`🔥 ${slot.nutrition.calories} cal`, x + 2, slotY);
                slotY += 3.5;
              }

              // Divider between slots
              if (slots.indexOf(slot) < slots.length - 1) {
                doc.setDrawColor(209, 213, 219);
                doc.line(x + 2, slotY, x + colW - 3, slotY);
                slotY += 2;
              }
            });
          }
        });

        y += rowH;

        // Page break if needed
        if (y > pageH - 30 && mt.key !== 'snacks') {
          doc.addPage();
          y = margin;
        }
      }

      // ── Nutrition summary row ────────────────────────────
      y += 3;
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, y, pageW - margin * 2, 10, 'F');

      this.days.forEach((day, i) => {
        const x   = margin + i * colW;
        const nut = this.getDayNutrition(
          this.currentPlan!.days.find(d => d.dayName === day)!
        );

        doc.setTextColor(55, 65, 81);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text(`${nut.calories} kcal`, x + (colW - 1) / 2, y + 4, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(
          `P:${nut.proteins}g  C:${nut.carbs}g  F:${nut.fat}g`,
          x + (colW - 1) / 2, y + 8,
          { align: 'center' }
        );
      });

      // ── Footer ──────────────────────────────────────────
      doc.setFillColor(243, 244, 246);
      doc.rect(0, pageH - 8, pageW, 8, 'F');
      doc.setTextColor(156, 163, 175);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'italic');
      doc.text(
        'Generated by Meal Planner App',
        pageW / 2, pageH - 3,
        { align: 'center' }
      );

      // ── Save ────────────────────────────────────────────
      const fileName = `meal-plan-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      this.showSuccess('📄 PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF generation failed:', err);
      this.errorMessage = 'Failed to generate PDF. Please try again.';
    } finally {
      this.isExportingPDF = false;
    }
  }

  // Helper: calculate row height based on max slots in any day for that meal type
  private getMealRowHeight(
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  ): number {
    if (!this.currentPlan) return 16;
    const maxSlots = Math.max(
      1,
      ...this.currentPlan.days.map(
        d => this.getMealSlots(d, mealType).length
      )
    );
    return Math.max(16, maxSlots * 10 + 4);
  }

  // ─── GENERATE SHOPPING LIST ────────────────────────────
  generateShoppingList() {
    if (!this.currentPlan) return;
    this.generatingList = true;

    const ingredientMap = new Map<string, {
      amount: number; unit: string; category: string;
    }>();

    this.currentPlan.days.forEach(day => {
      const allSlots = [
        ...this.getMealSlots(day, 'breakfast'),
        ...this.getMealSlots(day, 'lunch'),
        ...this.getMealSlots(day, 'dinner'),
        ...this.getMealSlots(day, 'snacks')
      ];

      allSlots.forEach(slot => {
        const recipe = this.allRecipes.find(r => r.id === slot.recipeId);
        if (recipe?.ingredients) {
          recipe.ingredients.forEach(ing => {
            const key = `${ing.name.toLowerCase()}-${ing.unit}`;
            if (ingredientMap.has(key)) {
              ingredientMap.get(key)!.amount +=
                Number(ing.amount) * Number(slot.servings);
            } else {
              ingredientMap.set(key, {
                amount:   Number(ing.amount) * Number(slot.servings),
                unit:     ing.unit,
                category: ing.category || 'Other'
              });
            }
          });
        }
      });
    });

    const categoryMap = new Map<string, any[]>();
    ingredientMap.forEach((value, key) => {
      const name = key.split('-')[0];
      const cat  = value.category || 'Other';
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push({
        name,
        amount:  Math.round(value.amount * 10) / 10,
        unit:    value.unit,
        checked: false
      });
    });

    const categories: ShoppingCategory[] = [];
    categoryMap.forEach((items, name) => categories.push({ name, items }));

    if (categories.length === 0) {
      this.generatingList = false;
      this.showSuccess('⚠️ Add recipes to your meal plan first!');
      return;
    }

    const userId = this.authService.getCurrentUserId() || '';
    const shoppingList: ShoppingList = {
      userId,
      mealPlanId: this.currentPlan.id || '',
      categories,
      createdAt:  new Date().toISOString()
    };

    this.shoppingListService.createShoppingList(shoppingList).subscribe({
      next:  () => { this.generatingList = false; this.showSuccess('🛒 Shopping list generated!'); },
      error: () => { this.generatingList = false; this.errorMessage = 'Failed to generate list.'; }
    });
  }

  // ─── NUTRITION SUMMARY ─────────────────────────────────
  getDayNutrition(day: MealDay): {
    calories: number; proteins: number; carbs: number; fat: number;
  } {
    const allSlots = [
      ...this.getMealSlots(day, 'breakfast'),
      ...this.getMealSlots(day, 'lunch'),
      ...this.getMealSlots(day, 'dinner'),
      ...this.getMealSlots(day, 'snacks')
    ];

    return allSlots.reduce(
      (acc, slot) => {
        const recipe = this.allRecipes.find(r => r.id === slot.recipeId);
        if (recipe?.nutrition) {
          acc.calories += Number(recipe.nutrition.calories)      || 0;
          acc.proteins += Number(recipe.nutrition.proteins)      || 0;
          acc.carbs    += Number(recipe.nutrition.carbohydrates) || 0;
          acc.fat      += Number(recipe.nutrition.fat)           || 0;
        }
        return acc;
      },
      { calories: 0, proteins: 0, carbs: 0, fat: 0 }
    );
  }

  // ─── FILTERED RECIPES ──────────────────────────────────
  get filteredRecipes(): Recipe[] {
    if (!this.recipeSearch) return this.allRecipes;
    const term = this.recipeSearch.toLowerCase();
    return this.allRecipes.filter(r =>
      r.title?.toLowerCase().includes(term) ||
      r.cuisine?.toLowerCase().includes(term) ||
      r.ingredients?.some(i => i.name.toLowerCase().includes(term))
    );
  }

  // ─── HELPERS ───────────────────────────────────────────
  showSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => (this.successMessage = ''), 4000);
  }

  clearPlan() {
    if (!confirm('Clear entire meal plan? This cannot be undone.')) return;
    this.createNewPlan();
    this.savePlan();
  }

  getTotalMeals(): number {
    if (!this.currentPlan) return 0;
    return this.currentPlan.days.reduce((total, day) =>
      total +
      this.getMealSlots(day, 'breakfast').length +
      this.getMealSlots(day, 'lunch').length +
      this.getMealSlots(day, 'dinner').length +
      this.getMealSlots(day, 'snacks').length,
      0
    );
  }
}