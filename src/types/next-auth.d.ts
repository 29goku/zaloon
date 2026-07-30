import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      salonId?: string;
      role?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    salonId?: string;
    role?: string;
  }
}
