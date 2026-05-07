import { Injectable, inject } from '@angular/core';
import {
  Database,
  ref,
  push,
  set,
  update,
  remove,
  onValue
} from '@angular/fire/database';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { ShoppingList } from '../models/shopping-list.model';

@Injectable({
  providedIn: 'root'
})
export class ShoppingListService {
  private db = inject(Database);

  createShoppingList(list: ShoppingList): Observable<string> {
    const listRef = push(ref(this.db, `shoppingLists/${list.userId}`));
    return from(set(listRef, { ...list, id: listRef.key })).pipe(
      map(() => listRef.key as string)
    );
  }

  getShoppingLists(userId: string): Observable<ShoppingList[]> {
    return new Observable(observer => {
      onValue(ref(this.db, `shoppingLists/${userId}`), snapshot => {
        const data = snapshot.val();
        observer.next(
          data ? Object.values(data) as ShoppingList[] : []
        );
      });
    });
  }

  toggleItem(
    userId: string,
    listId: string,
    categoryIndex: number,
    itemIndex: number,
    checked: boolean
  ): Observable<void> {
    return from(
      update(
        ref(
          this.db,
          `shoppingLists/${userId}/${listId}/categories/${categoryIndex}/items/${itemIndex}`
        ),
        { checked }
      )
    );
  }

  deleteShoppingList(userId: string, listId: string): Observable<void> {
    return from(remove(ref(this.db, `shoppingLists/${userId}/${listId}`)));
  }
}