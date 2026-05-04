import { SetMetadata } from '@nestjs/common';

export const SUPER_ADMIN_ROLE = 'superadmin';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);