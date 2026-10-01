import { useAuth } from '../auth/AuthContext';
import { isStaffEmail } from '../auth/accounts';
import { InviteeForm } from './InviteeForm';
import { ServicesPage } from './ServicesPage';
import { StaffOnboarding } from './staff/StaffOnboarding';
import './onboarding.css';

/**
 * Onboarding. People with an XDS, MIE or Mettus email address get the staff screen to send and manage
 * invitations and onboardings. A new client sees only the onboarding form until it is submitted; after that
 * they see their onboarding summary and can request to terminate services.
 */
export function OnboardingPage() {
  const { user, onboarded } = useAuth();
  if (!user) return null;

  if (isStaffEmail(user.email)) {
    return <StaffOnboarding />;
  }

  return onboarded ? <ServicesPage /> : <InviteeForm />;
}
