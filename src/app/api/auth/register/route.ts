import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public self-registration is disabled for security.
 * New accounts are created only by the platform administrator from /admin.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "registration-disabled",
      message: "التسجيل مغلق. لا يمكن إنشاء حساب إلا من طرف مسؤول المنصة عبر لوحة الإدارة.",
    },
    { status: 403 },
  );
}
