// src/app/features/shopping-list/shopping-list.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ShoppingListService } from '../../core/services/shopping-list.service';
import { AuthService } from '../../core/services/auth.service';
import { ShoppingList, ShoppingItem } from '../../core/models/shopping-list.model';

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './shopping-list.html',
  styleUrls: ['./shopping-list.scss']
})
export class ShoppingListComponent implements OnInit {
  private shoppingListService = inject(ShoppingListService);
  private authService = inject(AuthService);

  shoppingLists: ShoppingList[] = [];
  activeList: ShoppingList | null = null;
  isLoading = true;
  searchTerm = '';

  ngOnInit() {
    this.loadShoppingLists();
  }

  loadShoppingLists() {
    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    this.shoppingListService.getShoppingLists(userId).subscribe({
      next: (lists) => {
        this.shoppingLists = lists.reverse();
        if (lists.length > 0 && !this.activeList) {
          this.activeList = lists[0];
        }
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  selectList(list: ShoppingList) {
    this.activeList = list;
  }

  toggleItem(
    categoryIndex: number,
    itemIndex: number,
    checked: boolean
  ) {
    if (!this.activeList?.id) return;
    const userId = this.authService.getCurrentUserId() || '';

    // Update locally first
    this.activeList.categories[categoryIndex].items[itemIndex].checked = checked;

    this.shoppingListService.toggleItem(
      userId,
      this.activeList.id,
      categoryIndex,
      itemIndex,
      checked
    ).subscribe();
  }

  deleteList(listId: string | undefined) {
    if (!listId) return;
    if (!confirm('Delete this shopping list?')) return;

    const userId = this.authService.getCurrentUserId() || '';
    this.shoppingListService.deleteShoppingList(userId, listId).subscribe({
      next: () => {
        if (this.activeList?.id === listId) {
          this.activeList = null;
        }
      }
    });
  }

  get filteredCategories() {
    if (!this.activeList) return [];
    if (!this.searchTerm) return this.activeList.categories;

    return this.activeList.categories.map(cat => ({
      ...cat,
      items: cat.items.filter(item =>
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      )
    })).filter(cat => cat.items.length > 0);
  }

  get totalItems(): number {
    if (!this.activeList) return 0;
    return this.activeList.categories.reduce(
      (acc, cat) => acc + cat.items.length, 0
    );
  }

  get checkedItems(): number {
    if (!this.activeList) return 0;
    return this.activeList.categories.reduce(
      (acc, cat) => acc + cat.items.filter(i => i.checked).length, 0
    );
  }

  get progressPercent(): number {
    if (this.totalItems === 0) return 0;
    return Math.round((this.checkedItems / this.totalItems) * 100);
  }

  checkAllInCategory(categoryIndex: number, checked: boolean) {
    if (!this.activeList) return;
    const userId = this.authService.getCurrentUserId() || '';

    this.activeList.categories[categoryIndex].items.forEach(
      (item, itemIndex) => {
        item.checked = checked;
        if (this.activeList?.id) {
          this.shoppingListService.toggleItem(
            userId,
            this.activeList.id,
            categoryIndex,
            itemIndex,
            checked
          ).subscribe();
        }
      }
    );
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Vegetables': '🥦',
      'Fruits': '🍎',
      'Meat': '🥩',
      'Seafood': '🐟',
      'Dairy': '🥛',
      'Grains': '🌾',
      'Spices': '🌶️',
      'Other': '🛒'
    };
    return icons[category] || '🛒';
  }
}