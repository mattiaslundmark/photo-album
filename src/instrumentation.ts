// Runs once when the server starts

export async function register() {
  // Fail startup instead of silently rejecting every login later
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
}
