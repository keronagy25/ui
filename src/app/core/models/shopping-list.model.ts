export interface ShoppingList {
  id?: string;
  userId: string;
  mealPlanId: string;
  categories: ShoppingCategory[];
  createdAt: string;
}

export interface ShoppingCategory {
  name: string;
  items: ShoppingItem[];
}

export interface ShoppingItem {
  name: string;
  amount: number;
  unit: string;
  checked: boolean;
}