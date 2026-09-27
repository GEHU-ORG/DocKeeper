import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://gehu-dockeeper.vercel.app',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    // High Priority: Essential Resources
    ...[
      'NOTES-GEHU',
      'PYQ-GEHU',
      'Syllabus-GEHU',
    ].map((repo) => ({
      url: `https://gehu-dockeeper.vercel.app/${repo}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    // Medium Priority: Subjects and Labs
    ...[
      'CN',
      'CN-LAB',
      'Compiler-Design-Lab',
      'Cpp-Oops-Question',
      'DAA-4th-Sem-Practical',
      'DBMS-And-OS',
      'DBMS-LAB',
      'DBMS-MID',
      'Dsa',
      'DSA-Question',
      'gehu-robotics-club',
      'Java',
      'Java-Practical',
      'OS-LAB',
      'OS-MId',
      'web-d-mid-term',
    ].map((repo) => ({
      url: `https://gehu-dockeeper.vercel.app/${repo}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  ];
}
