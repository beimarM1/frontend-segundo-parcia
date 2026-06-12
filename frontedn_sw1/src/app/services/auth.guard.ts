import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('jwt_token');

  if (token) {
    return true;
  }

  // Si no está autenticado, redirige al login
  router.navigate(['/login']);
  return false;
};
