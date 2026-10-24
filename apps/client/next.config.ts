import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(dirname, "..", "..");

const prismaTracingGlobs = [
	"../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**",
	"../../node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**",
];

/** Facebook / Meta avatar CDNs used by Supabase OAuth (avatar_url, picture). */
const facebookImageRemotePatterns: NonNullable<
	NextConfig["images"]
>["remotePatterns"] = [
	{
		protocol: "https",
		hostname: "platform-lookaside.fbsbx.com",
		pathname: "/**",
	},
	{
		protocol: "https",
		hostname: "lookaside.fbsbx.com",
		pathname: "/**",
	},
	{
		protocol: "https",
		hostname: "**.fbsbx.com",
		pathname: "/**",
	},
	{
		protocol: "https",
		hostname: "*.fbsbx.com",
		pathname: "/**",
	},
	{
		protocol: "https",
		hostname: "**.fbcdn.net",
		pathname: "/**",
	},
	{
		protocol: "https",
		hostname: "*.fbcdn.net",
		pathname: "/**",
	},
	{
		protocol: "https",
		hostname: "graph.facebook.com",
		pathname: "/**",
	},
];

const nextConfig: NextConfig = {
	outputFileTracingRoot: monorepoRoot,
	outputFileTracingIncludes: {
		"/*": prismaTracingGlobs,
	},
	serverExternalPackages: ["@prisma/client"],
	transpilePackages: ["@rotra/ui", "@rotra/db", "@rotra/legal-content"],
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "i.pravatar.cc",
				pathname: "/**",
			},
			...facebookImageRemotePatterns,
		],
	},
};

export default nextConfig;
