'use server'

import { cookies } from 'next/headers'
import { SignJWT } from 'jose'
import fs from 'fs'
import path from 'path'

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production')

interface LoginResult {
  success: boolean
  user?: {
    id: string
    name: string
    role: string
  }
  message?: string
  redirectUrl?: string
}

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const id = formData.get('id') as string
  const password = formData.get('password') as string

  if (!id || !password) {
    return { success: false, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' }
  }

  try {
    // Read users from JSON file
    const usersFilePath = path.join(process.cwd(), 'data', 'users.json')
    const usersData = JSON.parse(fs.readFileSync(usersFilePath, 'utf-8'))
    
    // Find user
    const user = usersData.users.find(
      (u: any) => u.id === id && u.password === password
    )

    if (!user) {
      return { success: false, message: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' }
    }

    // Create JWT
    const token = await new SignJWT({ 
      id: user.id, 
      name: user.name, 
      role: user.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(SECRET_KEY)

    // Set cookie
    cookies().set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })

    // Determine redirect URL
    const redirectUrl = (user.role === 'admin' || user.role === 'user1') 
      ? '/track-c' 
      : '/track-rollout'

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      },
      redirectUrl
    }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' }
  }
}

export async function logoutAction() {
  cookies().delete('auth_token')
}
