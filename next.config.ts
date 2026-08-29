import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 상위 디렉터리의 lock 파일을 잘못 집지 않도록 루트를 못 박는다.
  turbopack: { root: __dirname },
};

export default nextConfig;
