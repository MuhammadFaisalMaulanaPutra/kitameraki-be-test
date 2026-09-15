import { AppError } from './errors';

export interface OrganizationAuthorizer {
  authorize(organizationId: string | null): string;
}

export const createOrganizationAuthorizer = (
  configuredOrganizationId: string,
): OrganizationAuthorizer => ({
  authorize: (organizationId) => {
    if (!organizationId) {
      throw new AppError(400, 'organization_required', 'X-Organization-Id is required.');
    }
    if (organizationId !== configuredOrganizationId) {
      throw new AppError(403, 'organization_forbidden', 'This organization is not available.');
    }
    return organizationId;
  },
});
