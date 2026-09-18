/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // The respondent route moved from /survey to /study. Live studies have
    // responses already, so the old links are in the wild (ads, cold email,
    // Slack) and must keep working indefinitely. Permanent (308) so browsers
    // and crawlers cache the move. Query strings (?test=1, ?src=) carry over.
    return [
      { source: "/survey/:slug", destination: "/study/:slug", permanent: true },
      { source: "/survey/:slug/:token", destination: "/study/:slug/:token", permanent: true },
    ];
  },
};

export default nextConfig;
