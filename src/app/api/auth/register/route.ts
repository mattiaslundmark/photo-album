import { NextRequest, NextResponse } from 'next/server';
import { registerUser, createAuthCookie, getCurrentUser } from '@/lib/auth';
import { getUsers } from '@/lib/data';

export async function POST(request: NextRequest) {
  try {
    const { username, password, role = 'viewer' } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if any users exist - if not, first user becomes admin
    const users = await getUsers();
    const isFirstUser = users.length === 0;

    // If not first user, only admins can create new users
    if (!isFirstUser) {
      const currentUser = await getCurrentUser();
      if (!currentUser || currentUser.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Only admins can register new users' },
          { status: 403 }
        );
      }
    }

    const userRole = isFirstUser ? 'admin' : role;

    const { user, token } = await registerUser(username, password, userRole);
    const cookie = createAuthCookie(token);

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        token,
        isFirstUser,
      },
    });

    response.cookies.set(cookie.name, cookie.value, cookie.options);

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Username already exists' ? 409 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
