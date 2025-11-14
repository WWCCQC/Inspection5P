import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import fs from 'fs';
import path from 'path';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = formData.get('id') as string;
    const password = formData.get('password') as string;

    // อ่านข้อมูล users จากไฟล์
    const usersFilePath = path.join(process.cwd(), 'data', 'users.json');
    const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'));

    // ค้นหา user ที่ตรงกับ id และ password
    const user = usersData.users.find(
      (u: any) => u.id === id && u.password === password
    );

    if (!user) {
      // Redirect back to login with error
      const url = new URL('/login', request.url);
      url.searchParams.set('error', 'invalid');
      return NextResponse.redirect(url);
    }

    // สร้าง JWT token
    const token = await new SignJWT({ 
      id: user.id, 
      name: user.name, 
      role: user.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(SECRET_KEY);

    // Determine redirect URL
    const redirectUrl = (user.role === 'admin' || user.role === 'user1') 
      ? '/track-c' 
      : '/track-rollout';

    // Create redirect response
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));

    // Set cookie
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    const url = new URL('/login', request.url);
    url.searchParams.set('error', 'server');
    return NextResponse.redirect(url);
  }
}
