// src/app/features/landing/landing.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {
  authService = inject(AuthService);

  features = [
    {
      icon: '🔍',
      title: 'Recipe Search by Ingredient',
      description: 'Find recipes based on ingredients you already have at home.',
      image: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400'
    },
    {
      icon: '📅',
      title: 'Automatic Meal Plan',
      description: 'Let AI plan your weekly meals automatically for a balanced diet.',
      image: 'https://images.unsplash.com/photo-1495546968767-f0573cca821e?w=400'
    },
    {
      icon: '📊',
      title: 'Nutrition Analysis',
      description: 'Track your daily calories, proteins, carbs and more.',
      image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400'
    },
    {
      icon: '🛒',
      title: 'Shopping List',
      description: 'Auto-generate shopping lists from your weekly meal plan.',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'
    }
  ];

  stats = [
    { number: '10K+', label: 'Recipes' },
    { number: '50K+', label: 'Users' },
    { number: '4.9★', label: 'Rating' },
    { number: '100%', label: 'Free' }
  ];

  nutritionData = {
    calories: { current: 1100, max: 2000 },
    carbohydrates: { current: 300, max: 325 },
    proteins: { current: 10, max: 75 }
  };

  timeSlots = ['07:00', '10:00', '13:00', '18:00'];
  activeSlot = '07:00';

  ngOnInit() {}

  get isLoggedIn() {
    return this.authService.isLoggedIn();
  }

  getProgressWidth(current: number, max: number): string {
    return `${(current / max) * 100}%`;
  }

  getProgressColor(current: number, max: number): string {
    const pct = (current / max) * 100;
    if (pct >= 90) return '#ff4444';
    if (pct >= 70) return '#c6f135';
    return '#c6f135';
  }
}