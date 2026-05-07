// src/app/core/services/user.service.ts
import { Injectable, inject } from '@angular/core';
import { Database, ref, get, set, update, onValue } from '@angular/fire/database';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private db = inject(Database);

  getUserById(uid: string): Observable<User | null> {
    return from(get(ref(this.db, `users/${uid}`))).pipe(
      map(snapshot => snapshot.val() as User | null)
    );
  }

  getUserByUsername(username: string): Observable<User | null> {
    return new Observable(observer => {
      const usersRef = ref(this.db, 'users');
      onValue(usersRef, snapshot => {
        const users = snapshot.val();
        if (users) {
          const found = Object.values(users).find(
            (u: any) => u.username === username
          ) as User | null;
          observer.next(found);
        } else {
          observer.next(null);
        }
      });
    });
  }

  updateUser(uid: string, data: Partial<User>): Observable<void> {
    return from(update(ref(this.db, `users/${uid}`), data));
  }

  toggleFollow(currentUserId: string, targetUserId: string): Observable<void> {
    return from(
      Promise.all([
        get(ref(this.db, `users/${currentUserId}/following`)),
        get(ref(this.db, `users/${targetUserId}/followers`))
      ])
    ).pipe(
      switchMap(async ([followingSnap, followersSnap]) => {
        const following: string[] = followingSnap.val() || [];
        const followers: string[] = followersSnap.val() || [];

        const idx = following.indexOf(targetUserId);
        if (idx > -1) {
          following.splice(idx, 1);
          followers.splice(followers.indexOf(currentUserId), 1);
        } else {
          following.push(targetUserId);
          followers.push(currentUserId);
        }

        await set(ref(this.db, `users/${currentUserId}/following`), following);
        await set(ref(this.db, `users/${targetUserId}/followers`), followers);
      })
    );
  }

  getAllUsers(): Observable<User[]> {
    return new Observable(observer => {
      onValue(ref(this.db, 'users'), snapshot => {
        const data = snapshot.val();
        observer.next(data ? Object.values(data) as User[] : []);
      });
    });
  }
}