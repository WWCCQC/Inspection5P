import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

// Create Supabase client directly (not from lib file)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  console.log('=== LOGIN API CALLED - VERSION: SUPABASE ===');
  try {
    let id: string;
    let password: string;

    // Check content type - support both JSON and form data
    const contentType = request.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    if (contentType.includes('application/json')) {
      const body = await request.json();
      id = body.id;
      password = body.password;
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      id = formData.get('id') as string;
      password = formData.get('password') as string;
    } else {
      // Try formData as fallback
      const formData = await request.formData();
      id = formData.get('id') as string;
      password = formData.get('password') as string;
    }

    console.log('Login attempt:', { id, passwordLength: password?.length, contentType });

    // Query user from Supabase (table: public.login5p)
    console.log('Querying Supabase for user:', id);
    const { data: user, error } = await supabase
      .from('login5p')
      .select('*')
      .eq('id', id)
      .eq('password', password)
      .single();

    console.log('Supabase query result:', { user: !!user, error: error?.message, errorDetails: error });

    if (error || !user) {
      console.log('Login failed for ID:', id, 'Error:', error?.message);
      
      // Check if request is form submission (redirect) or JSON (return error)
      if (contentType.includes('application/json')) {
        return NextResponse.json(
          { error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' },
          { status: 401 }
        );
      } else {
        // Form submission - redirect back with error
        const url = new URL('/login', request.url);
        url.searchParams.set('error', 'invalid');
        return NextResponse.redirect(url);
      }
    }

    console.log('Login successful for:', user.name);

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

    // Check if request is form submission or JSON
    if (contentType.includes('application/json')) {
      // JSON request - return JSON response
      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        redirectUrl
      });

      response.cookies.set({
        name: 'auth_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 8,
        path: '/',
      });

      return response;
    } else {
      // Form submission - redirect
      const response = NextResponse.redirect(new URL(redirectUrl, request.url));

      response.cookies.set({
        name: 'auth_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 8,
        path: '/',
      });

      return response;
    }
  } catch (error) {
    console.error('Login error:', error);
    
    // Try to determine if JSON or form request
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
        { status: 500 }
      );
    } else {
      const url = new URL('/login', request.url);
      url.searchParams.set('error', 'server');
      return NextResponse.redirect(url);
    }
  }
}
