import { jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token.value, secret);

    // Return the user data needed for the Navbar
    const user = {
      id: payload.userId,
      name: payload.name || "User", // Ensure these were saved in your JWT payload during login
      email: payload.email,
      role: payload.role
    };

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    // If token is invalid/expired
    return NextResponse.json({ user: null }, { status: 401 });
  }
}