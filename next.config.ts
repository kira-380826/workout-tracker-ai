import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 開発中のローカルネットワーク(スマホ等)からのアクセスを許可
  // @ts-ignore
  allowedDevOrigins: ['192.168.1.7', '192.168.1.8', '192.168.1.9', '192.168.1.10', 'localhost', '127.0.0.1'],
};

export default nextConfig;
