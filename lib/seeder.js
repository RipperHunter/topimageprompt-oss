import bcrypt from 'bcryptjs';

export async function ensureSeeded(prisma) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  try {
    const promptCount = await prisma.prompt.count();
    if (promptCount > 0) {
      console.log('[seeder] Database already has prompts. Skipping seeding.');
      return;
    }

    console.log('[seeder] Database is empty. Seeding default data...');

    // Admin creation is opt-in. Never ship a shared fallback password or a
    // hard-coded privileged identity.
    if (adminEmail && adminPassword) {
      const hashed = await bcrypt.hash(adminPassword, 12);
      await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: { email: adminEmail, hashedPassword: hashed, name: 'Admin', role: 'ADMIN' },
      });
      console.log('[seeder] Admin user seeded from explicit environment.');
    } else {
      console.log('[seeder] Admin seed skipped; explicit seed credentials are required.');
    }

    // 2. Seed default prompts
    const prompts = [
      { title: "Cyberpunk Rain Street — Night", promptText: "A hyper-realistic cinematic shot of a neon-lit cyberpunk city street at night, heavy rain reflecting vibrant pink and cyan lights, volumetric fog, highly detailed, 8k resolution, Unreal Engine 5 render style --ar 16:9 --v 6.0", engine: "Midjourney v6", category: "Cyberpunk", aspectRatio: "16:9", imageUrl: "/demo/cyber.svg" },
      { title: "Cozy Library Rain — Anime", promptText: "masterpiece, best quality, ultra-detailed, anime style, cozy library interior, large windows showing heavy rain outside, soft warm interior lighting, dust motes, studio ghibli style, cinematic lighting", engine: "NovelAI", category: "Anime", aspectRatio: "16:9", imageUrl: "/demo/illustration.svg" },
      { title: "Glass Sphere Desert Reflection", promptText: "A perfectly transparent glass sphere sitting on cracked desert ground, reflecting an entire alien landscape inside, golden hour lighting, macro photography, depth of field, 8k, photorealistic --ar 1:1 --v 6.0", engine: "Stable Diffusion XL", category: "Abstract", aspectRatio: "1:1", imageUrl: "/demo/abstract.svg" },
      { title: "Neon Samurai Portrait", promptText: "Close-up portrait of a samurai warrior in neon-lit rain, cyberpunk armor with glowing accents, dramatic rim lighting, water droplets on visor, cinematic color grading, 8k ultra detailed --ar 2:3 --v 6.0", engine: "Midjourney v6", category: "Cyberpunk", aspectRatio: "9:16", imageUrl: "/demo/portrait.svg" },
      { title: "Gothic Dragon Cathedral", promptText: "A massive dragon perched atop a gothic cathedral during a lightning storm, dark fantasy, dramatic low angle, volumetric lighting through stained glass, rain, epic scale, cinematic --ar 16:9 --v 6.0", engine: "Midjourney v6", category: "Dark Fantasy", aspectRatio: "16:9", imageUrl: "/demo/fantasy.svg" },
      { title: "Abstract Sphere Explosion", promptText: "Abstract 3D render of a chrome sphere shattering into thousands of reflective fragments, dark background, studio lighting, particle effects, dramatic shadows, octane render, 8k --ar 1:1", engine: "Stable Diffusion XL", category: "Abstract", aspectRatio: "1:1", imageUrl: "/demo/abstract.svg" },
      { title: "Floating Villa — Cloud Level", promptText: "Architectural visualization of a modern floating villa above clouds, glass walls reflecting sunset colors, infinity pool merging with sky, dramatic cloud formations, photorealistic, 8k --ar 16:9 --v 6.0", engine: "Midjourney v6", category: "Architecture", aspectRatio: "16:9", imageUrl: "/demo/landscape.svg" },
      { title: "Anime Warrior Duel", promptText: "Two anime warriors locked in a sword duel on a bridge above waterfalls, cherry blossom petals flying, dynamic action pose, dramatic lighting, studio trigger style, vibrant colors, 4k", engine: "NovelAI", category: "Anime", aspectRatio: "16:9", imageUrl: "/demo/illustration.svg" },
      { title: "Steampunk Clocktower Interior", promptText: "Interior of a massive steampunk clocktower, intricate brass gears and mechanisms, warm amber lighting, dust particles, Victorian industrial aesthetic, fisheye lens, highly detailed --ar 9:16 --v 6.0", engine: "Midjourney v6", category: "Cyberpunk", aspectRatio: "9:16", imageUrl: "/demo/cyber.svg" },
      { title: "Enchanted Forest Portal", promptText: "A glowing magical portal between ancient trees in an enchanted forest, bioluminescent mushrooms, fireflies, mystical fog, fantasy art, cinematic lighting, 8k ultra detailed --ar 16:9 --v 6.0", engine: "Midjourney v6", category: "Dark Fantasy", aspectRatio: "16:9", imageUrl: "/demo/fantasy.svg" }
    ];

    for (const p of prompts) {
      const id = p.title.replace(/\s/g, "-").toLowerCase().substring(0, 36);
      await prisma.prompt.upsert({
        where: { id },
        update: p,
        create: { ...p, id, copies: Math.floor(Math.random() * 15000) + 500 }
      });
    }
    console.log(`[seeder] Seeded ${prompts.length} prompts`);

    // 3. Seed default blogs
    const blogs = [
      {
        title: "Mastering Midjourney v6 Lighting & Caustics",
        slug: "mastering-midjourney-v6-lighting",
        category: "Masterclass",
        author: "topimageprompt Team",
        heroImage: "/demo/cyber.svg",
        heroCaption: "Dramatic rim lighting and volumetric fog in Midjourney v6",
        intro: "Stop getting flat, lifeless renders. This masterclass breaks down the exact prompt structures professional AI artists use to force directional studio lighting, volumetric fog, and cinematic anamorphic lens flares in Midjourney v6.",
        readTime: "12 min read",
        published: true,
        content: JSON.stringify([
          { heading: "Understanding Light Direction", content: "The single most impactful parameter in your prompts is light direction. By specifying exactly where light enters your scene — rim lighting, backlighting, Rembrandt lighting — you force the AI to create depth and dimension that flat prompts simply cannot achieve." },
          { heading: "Volumetric Fog & Atmosphere", content: "Adding volumetric fog, god rays, or atmospheric haze creates layers in your image. These elements catch light and create the depth separation that makes professional renders feel cinematic. Try adding 'volumetric lighting, atmospheric haze, god rays through window' to any indoor scene." },
          { heading: "The Caustics Trick", content: "Caustics — the light patterns created by refraction through glass or water — are one of the most underused techniques. Adding 'caustic light patterns on walls' or 'water caustics' instantly elevates a scene from amateur to professional.", codeSnippet: "cinematic portrait, dramatic Rembrandt lighting,\nvolumetric fog, caustic light patterns,\nanamorphic lens flare, shallow depth of field,\n8k ultra detailed --ar 2:3 --v 6.0 --style raw" }
        ]),
        quote: JSON.stringify({ text: "Light is the single most important element in any image. Master light, and you master AI art.", author: "topimageprompt Team" })
      },
      {
        title: "How to Achieve Consistent Character Faces",
        slug: "consistent-character-faces",
        category: "Tutorial",
        author: "topimageprompt Team",
        heroImage: "/demo/portrait.svg",
        heroCaption: "Maintaining character identity across multiple generations",
        intro: "One of the biggest challenges in AI art is generating the same character across multiple images. This guide covers seed locking, face description anchoring, and reference image techniques.",
        readTime: "8 min read",
        published: true,
        content: JSON.stringify([
          { heading: "The Seed Lock Method", content: "By using the same seed value (--seed 12345) combined with identical face description text, you can achieve roughly 70-80% consistency across generations. The key is to be extremely specific about facial features." },
          { heading: "Face Description Anchoring", content: "Instead of vague descriptions, use precise anatomical terms: 'narrow jaw, high cheekbones, deep-set hazel eyes, thin eyebrows, aquiline nose, full lips.' The more specific, the more consistent your results." }
        ]),
        quote: JSON.stringify({ text: "Consistency is the hallmark of professional AI art. Random seeds produce random results.", author: "topimageprompt Team" })
      }
    ];

    for (const b of blogs) {
      await prisma.blog.upsert({
        where: { slug: b.slug },
        update: b,
        create: b
      });
    }
    console.log(`[seeder] Seeded ${blogs.length} blog posts`);

    // 4. Seed default collections
    const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (adminUser) {
      const collections = [
        {
          title: "Neon Nights",
          slug: "neon-nights",
          description: "Rain-slicked streets, neon signs, and cyberpunk atmospheres. Everything you need to build dystopian cityscapes.",
          curator: "topimageprompt Team",
          heroImages: JSON.stringify(["/demo/cyber.svg", "/demo/portrait.svg", "/demo/landscape.svg"]),
          promptCount: 31,
          userId: adminUser.id
        },
        {
          title: "Studio Whites",
          slug: "studio-whites",
          description: "Clean, minimal product photography setups for physical goods. Perfect for e-commerce and branding.",
          curator: "topimageprompt Team",
          heroImages: JSON.stringify(["/demo/abstract.svg", "/demo/monochrome.svg"]),
          promptCount: 18,
          userId: adminUser.id
        }
      ];

      for (const c of collections) {
        await prisma.collection.upsert({
          where: { slug: c.slug },
          update: c,
          create: c
        });
      }
      console.log(`[seeder] Seeded ${collections.length} collections`);
    }

    console.log('[seeder] Database seeding completed successfully.');
  } catch (err) {
    console.error('[seeder] Seeding error:', err.message);
  }
}
