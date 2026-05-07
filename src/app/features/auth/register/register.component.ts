// src/app/features/auth/register/register.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

// Custom Password Match Validator
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (password && confirmPassword && password.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    username: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.pattern('^[a-zA-Z0-9_]+$')
    ]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordMatchValidator });

  isLoading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  currentStep = 1;

  get displayName() { return this.registerForm.get('displayName'); }
  get username() { return this.registerForm.get('username'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }

  getPasswordStrength(): { strength: number; label: string; color: string } {
    const pwd = this.password?.value || '';
    let strength = 0;

    if (pwd.length >= 6) strength++;
    if (pwd.match(/[A-Z]/)) strength++;
    if (pwd.match(/[0-9]/)) strength++;
    if (pwd.match(/[^A-Za-z0-9]/)) strength++;

    const levels = [
      { strength: 0, label: '', color: '' },
      { strength: 1, label: 'Weak', color: '#ef4444' },
      { strength: 2, label: 'Fair', color: '#f97316' },
      { strength: 3, label: 'Good', color: '#eab308' },
      { strength: 4, label: 'Strong', color: '#22c55e' }
    ];

    return levels[strength];
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password, username, displayName } = this.registerForm.value;

    this.authService.register(email, password, username, displayName).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/recipes']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = this.getErrorMessage(err.code);
      }
    });
  }

  getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/email-already-in-use': return 'This email is already registered.';
      case 'auth/invalid-email': return 'Invalid email address.';
      case 'auth/weak-password': return 'Password is too weak.';
      default: return 'Registration failed. Please try again.';
    }
  }
}