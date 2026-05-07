export interface User {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL: string;
  bio: string;
  followers: string[];
  following: string[];
  savedRecipes: string[];
  createdAt: Date;
}