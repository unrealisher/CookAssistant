export function shouldShowLoginAfterSetupConflict(setupRequired: boolean, status: number): boolean {
  return setupRequired && status === 409;
}
