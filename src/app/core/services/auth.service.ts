// src/app/core/services/auth.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  authState
} from '@angular/fire/auth';
import {
  Database,
  ref,
  set,
  get
} from '@angular/fire/database';
import { Observable, from } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private db = inject(Database);
  private router = inject(Router);

  isLoggedIn = signal<boolean>(false);
  currentUserData = signal<User | null>(null);

  constructor() {
  authState(this.auth).subscribe(async (firebaseUser) => {
    if (firebaseUser) {
      this.isLoggedIn.set(true);
      try {
        // Always get fresh data from DB
        const snapshot = await get(
          ref(this.db, `users/${firebaseUser.uid}`)
        );
        if (snapshot.exists()) {
          this.currentUserData.set(snapshot.val());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    } else {
      this.isLoggedIn.set(false);
      this.currentUserData.set(null);
    }
  });
}
    async refreshUserData(): Promise<void> {
  const userId = this.getCurrentUserId();
  if (!userId) return;

  const snapshot = await get(ref(this.db, `users/${userId}`));
  if (snapshot.exists()) {
    this.currentUserData.set(snapshot.val());
  }
}
  // ─── REGISTER ──────────────────────────────────────────
  register(
    email: string,
    password: string,
    username: string,
    displayName: string
  ): Observable<User> {
    return from(
      createUserWithEmailAndPassword(this.auth, email, password)
    ).pipe(
      switchMap(async (credential) => {
        // Update Firebase Auth profile
        await updateProfile(credential.user, {
          displayName: displayName
        });

        // Create user object
        const userData: User = {
          uid: credential.user.uid,
          email: email,
          username: username,
          displayName: displayName,
          photoURL: '',
          bio: '',
          followers: [],
          following: [],
          savedRecipes: [],
          createdAt: new Date()
        };

        // Save to Realtime Database
        await set(
          ref(this.db, `users/${credential.user.uid}`),
          {
            ...userData,
            createdAt: new Date().toISOString()
          }
        );

        // Update signals
        this.currentUserData.set(userData);
        this.isLoggedIn.set(true);

        return userData;
      })
    );
  }

  // ─── LOGIN ─────────────────────────────────────────────
  login(email: string, password: string): Observable<User> {
    return from(
      signInWithEmailAndPassword(this.auth, email, password)
    ).pipe(
      switchMap(async (credential) => {
        const snapshot = await get(
          ref(this.db, `users/${credential.user.uid}`)
        );

        let userData: User;

        if (snapshot.exists()) {
          userData = snapshot.val() as User;
        } else {
          // Create user data if not exists
          userData = {
            uid: credential.user.uid,
            email: credential.user.email || email,
            username: credential.user.email?.split('@')[0] || 'user',
            displayName: credential.user.displayName || 'User',
            photoURL: credential.user.photoURL || '',
            bio: '',
            followers: [],
            following: [],
            savedRecipes: [],
            createdAt: new Date()
          };
          await set(
            ref(this.db, `users/${credential.user.uid}`),
            userData
          );
        }

        this.currentUserData.set(userData);
        this.isLoggedIn.set(true);

        return userData;
      })
    );
  }

  // ─── LOGOUT ────────────────────────────────────────────
  logout(): Observable<void> {
    return from(signOut(this.auth)).pipe(
      map(() => {
        this.isLoggedIn.set(false);
        this.currentUserData.set(null);
        this.router.navigate(['/auth/login']);
      })
    );
  }

  // ─── GET CURRENT USER ID ───────────────────────────────
  getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  // ─── GET CURRENT USER ──────────────────────────────────
  getCurrentUser() {
    return this.auth.currentUser;
  }
}