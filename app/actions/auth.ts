"use server";

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { signSession, SESSION_COOKIE } from "@/lib/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Udfyld brugernavn og adgangskode." };

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return { error: "Forkert brugernavn eller adgangskode." };
  }

  const token = await signSession(user.id);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/calendar");
}
