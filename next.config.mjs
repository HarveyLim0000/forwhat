/** @type {import('next').NextConfig} */
const nextConfig = {
  // 기존 스크립트(assets/js/app.js)는 마운트 시 한 번만 초기화되도록 작성되어 있다.
  // StrictMode의 이중 실행은 이벤트 리스너를 두 번 붙이므로 끈다.
  reactStrictMode: false
};

export default nextConfig;
